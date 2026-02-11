/**
 * @fileoverview Reference resolver for $ref pointers
 * Supports JSON Pointer (RFC6901) and external file references
 */

import { readJSONFile } from '@adapters/filesystem/file-utils'
import { ValidationError } from '@shared/errors/index'
import type { ValidationOptions } from '@shared/types/validation'
import { ValidationHandler } from '@shared/utils/validation-handler'
import { JsonPointer } from 'json-ptr'

import type { ReferenceObject } from './resolution.types'

type ResolverContext = {
  baseDir: string
  cache: Map<string, unknown>
  visited: Set<string>
}

type ReferenceResolverOptions = {
  validation?: ValidationOptions
  /**
   * External file cache shared across resolver instances.
   *
   * When provided, the resolver uses this cache instead of creating its own.
   * This enables safe parallel permutation resolution: each instance keeps
   * an independent `visited` set (for circular-reference detection) while
   * sharing the expensive parsed-file cache.
   */
  cache?: Map<string, unknown>
}

type DeepResolutionContext = {
  inTokenValue: boolean
}

export class ReferenceResolver {
  private context: ResolverContext
  private validationHandler: ValidationHandler

  constructor(baseDir: string, options: ReferenceResolverOptions = {}) {
    this.context = {
      baseDir,
      cache: options.cache ?? new Map(),
      visited: new Set(),
    }
    this.validationHandler = new ValidationHandler(options.validation)
  }

  /**
   * Set the base directory for resolving relative file paths
   */
  setBaseDir(baseDir: string): void {
    this.context.baseDir = baseDir
  }

  /**
   * Resolve a $ref reference
   * Accepts either a string reference or a DTCG ReferenceObject
   *
   * Per DTCG spec section 4.2.2, if additional keys exist alongside $ref,
   * they will be treated as overrides and merged with the resolved value.
   */
  async resolve(
    ref: string | ReferenceObject | Record<string, unknown>,
    currentDocument?: unknown,
  ): Promise<unknown> {
    // Extract string ref from object if needed
    const refString = typeof ref === 'string' ? ref : (ref as ReferenceObject).$ref

    if (!refString) {
      throw new ValidationError('Invalid reference: missing $ref property', [
        { message: 'Invalid reference: missing $ref property' },
      ])
    }

    // Extract local properties for extending (DTCG spec section 4.2.2)
    const localProperties = this.extractLocalProperties(ref)

    // Check for circular references
    if (this.context.visited.has(refString)) {
      throw new ValidationError(`Circular reference detected: ${refString}`, [
        { message: `Circular reference detected: ${refString}` },
      ])
    }

    this.context.visited.add(refString)

    try {
      let resolved = await this.resolveRefTarget(refString, currentDocument)

      // Apply local property overrides if any (DTCG spec section 4.2.2)
      if (localProperties && Object.keys(localProperties).length > 0) {
        resolved = this.applyExtensions(resolved, localProperties)
      }

      return resolved
    } finally {
      this.context.visited.delete(refString)
    }
  }

  /**
   * Resolve the target of a $ref string to its raw value
   *
   * Handles fragment-only references (JSON Pointer within current document)
   * and file references with optional fragment suffixes.
   */
  private async resolveRefTarget(refString: string, currentDocument?: unknown): Promise<unknown> {
    // Fragment-only references (JSON Pointer within current document)
    if (refString.startsWith('#/')) {
      if (!currentDocument) {
        throw new ValidationError(
          `Cannot resolve fragment reference ${refString} without current document`,
          [
            {
              message: `Cannot resolve fragment reference ${refString} without current document`,
            },
          ],
        )
      }
      return this.resolveFragment(refString, currentDocument)
    }

    // File references with optional fragments
    const [filePath, fragment] = refString.split('#')

    if (!filePath) {
      throw new ValidationError(`Invalid reference: ${refString}`, [
        { message: `Invalid reference: ${refString}` },
      ])
    }

    const resolved = await this.resolveFile(filePath)
    return fragment ? this.resolveFragment(`#${fragment}`, resolved) : resolved
  }

  /**
   * Resolve a JSON Pointer fragment
   */
  private resolveFragment(ref: string, document: unknown): unknown {
    try {
      // Remove leading # and decode the pointer
      const pointerPath = ref.substring(1)

      if (!pointerPath) {
        return document
      }

      if (!JsonPointer.has(document, pointerPath)) {
        throw new ValidationError(`Invalid reference: ${ref}`, [
          { message: `Invalid reference: ${ref}` },
        ])
      }

      return JsonPointer.get(document, pointerPath)
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error)
      throw new ValidationError(`Failed to resolve fragment ${ref}: ${errorMsg}`, [
        { message: errorMsg },
      ])
    }
  }

  /**
   * Resolve a file reference
   */
  private async resolveFile(filePath: string): Promise<unknown> {
    // Check cache first
    if (this.context.cache.has(filePath)) {
      return this.context.cache.get(filePath)
    }

    // Read and parse file using shared utility
    const parsed = await readJSONFile(filePath, this.context.baseDir)

    // Cache the result
    this.context.cache.set(filePath, parsed)

    return parsed
  }

  /**
   * Extract local properties from a reference object (excluding $ref)
   * These will be used to override the resolved value per DTCG spec section 4.2.2
   */
  private extractLocalProperties(
    ref: string | ReferenceObject | Record<string, unknown>,
  ): Record<string, unknown> | null {
    if (typeof ref === 'string') {
      return null
    }

    const { $ref: _$ref, ...localProps } = ref as Record<string, unknown>
    return Object.keys(localProps).length > 0 ? localProps : null
  }

  /**
   * Apply local property extensions to resolved value (DTCG spec section 4.2.2)
   *
   * Per spec: "If a key alongside $ref declares an object or array,
   * tools MUST flatten these shallowly, meaning objects and arrays are not merged."
   *
   * This means local properties replace resolved properties (shallow merge only).
   */
  private applyExtensions(resolved: unknown, localProperties: Record<string, unknown>): unknown {
    // Only merge if resolved is an object
    if (typeof resolved !== 'object' || resolved === null) {
      return resolved
    }

    // Shallow merge: local properties override resolved properties
    return {
      ...resolved,
      ...localProperties,
    }
  }

  /**
   * Check if an object is a reference object
   */
  static isReference(obj: unknown): obj is { $ref: string } {
    return typeof obj === 'object' && obj !== null && '$ref' in obj && typeof obj.$ref === 'string'
  }

  /**
   * Resolve all references in an object recursively
   */
  async resolveDeep(obj: unknown, currentDocument?: unknown): Promise<unknown> {
    if (ReferenceResolver.isReference(obj)) {
      return this.resolve(obj, currentDocument)
    }

    if (Array.isArray(obj)) {
      return Promise.all(obj.map((item) => this.resolveDeep(item, currentDocument)))
    }

    if (typeof obj === 'object' && obj !== null) {
      const result: Record<string, unknown> = {}
      for (const [key, value] of Object.entries(obj)) {
        result[key] = await this.resolveDeep(value, currentDocument)
      }
      return result
    }

    return obj
  }

  /**
   * Resolve all references in a token document, preserving token-level `$ref` shape.
   *
   * - **Property-level** `$ref` objects (inside `$value`) resolve to the referenced content.
   * - **Token-level** `$ref` objects (the token itself) become a token with `$value` set to the resolved value.
   */
  async resolveDeepTokenDocument(obj: unknown, currentDocument?: unknown): Promise<unknown> {
    return this.resolveDeepTokenInternal(obj, currentDocument, { inTokenValue: false })
  }

  private async resolveDeepTokenInternal(
    obj: unknown,
    currentDocument: unknown,
    ctx: DeepResolutionContext,
  ): Promise<unknown> {
    if (ReferenceResolver.isReference(obj)) {
      if (ctx.inTokenValue) {
        const resolved = await this.resolve(obj, currentDocument)
        return this.resolveDeepTokenInternal(resolved, currentDocument, ctx)
      }

      if (this.isTokenLevelRefObject(obj, ctx)) {
        return this.resolveTokenLevelRef(obj as Record<string, unknown>, currentDocument)
      }

      const resolved = await this.resolve(obj, currentDocument)
      return this.resolveDeepTokenInternal(resolved, currentDocument, ctx)
    }

    if (Array.isArray(obj)) {
      return Promise.all(
        obj.map((item) => this.resolveDeepTokenInternal(item, currentDocument, ctx)),
      )
    }

    if (typeof obj === 'object' && obj !== null) {
      const result: Record<string, unknown> = {}
      for (const [key, value] of Object.entries(obj)) {
        const nextCtx = key === '$value' ? { inTokenValue: true } : ctx
        result[key] = await this.resolveDeepTokenInternal(value, currentDocument, nextCtx)
      }
      return result
    }

    return obj
  }

  private isTokenLevelRefObject(obj: unknown, ctx: DeepResolutionContext): boolean {
    if (ctx.inTokenValue) {
      return false
    }
    if (!ReferenceResolver.isReference(obj)) {
      return false
    }
    return !('$value' in (obj as Record<string, unknown>))
  }

  private async resolveTokenLevelRef(
    tokenLikeRef: Record<string, unknown>,
    currentDocument: unknown,
  ): Promise<Record<string, unknown>> {
    const refString = typeof tokenLikeRef.$ref === 'string' ? tokenLikeRef.$ref : ''

    const declaredType = typeof tokenLikeRef.$type === 'string' ? tokenLikeRef.$type : undefined

    const resolvedRaw = await this.resolve(refString, currentDocument)

    const referencedType = this.getReferencedTokenType(refString, resolvedRaw, currentDocument)

    const resolvedValue = this.extractTokenValue(resolvedRaw)
    const deepResolvedValue = await this.resolveDeepTokenInternal(resolvedValue, currentDocument, {
      inTokenValue: true,
    })

    const resolvedIsToken =
      typeof resolvedRaw === 'object' &&
      resolvedRaw !== null &&
      '$value' in (resolvedRaw as Record<string, unknown>)

    const baseToken = resolvedIsToken
      ? this.buildTokenFromResolvedToken(resolvedRaw as Record<string, unknown>, deepResolvedValue)
      : {}

    const { $ref: _ref, ...localMeta } = tokenLikeRef
    const outToken = { ...baseToken, ...localMeta, $value: deepResolvedValue }

    return this.applyTypeInferenceAndChecks(outToken, declaredType, referencedType, refString)
  }

  private extractTokenValue(resolved: unknown): unknown {
    if (
      typeof resolved === 'object' &&
      resolved !== null &&
      '$value' in (resolved as Record<string, unknown>)
    ) {
      return (resolved as Record<string, unknown>).$value
    }
    return resolved
  }

  private buildTokenFromResolvedToken(
    resolvedToken: Record<string, unknown>,
    value: unknown,
  ): Record<string, unknown> {
    const { $ref: _ref, ...rest } = resolvedToken
    return { ...rest, $value: value }
  }

  private getReferencedTokenType(
    refString: string,
    resolvedRaw: unknown,
    currentDocument: unknown,
  ): string | undefined {
    const direct = this.extractTypeFromTokenObject(resolvedRaw)
    if (direct !== undefined) {
      return direct
    }

    const inferredPointer = this.getTokenPointerFromValuePointer(refString)
    if (inferredPointer === undefined) {
      return undefined
    }

    const referencedToken = this.resolveFragmentSafely(inferredPointer, currentDocument)
    return this.extractTypeFromTokenObject(referencedToken)
  }

  private getTokenPointerFromValuePointer(refString: string): string | undefined {
    const suffix = '/$value'
    if (!refString.includes(suffix)) {
      return undefined
    }
    if (!refString.startsWith('#/')) {
      return undefined
    }
    if (!refString.endsWith(suffix)) {
      return undefined
    }
    return refString.slice(0, -suffix.length)
  }

  private resolveFragmentSafely(ref: string, document: unknown): unknown {
    try {
      return this.resolveFragment(ref, document)
    } catch {
      // Fragment may not exist; return undefined so callers can skip type inference
      return undefined
    }
  }

  private extractTypeFromTokenObject(value: unknown): string | undefined {
    if (typeof value !== 'object' || value === null) {
      return undefined
    }
    const maybe = value as Record<string, unknown>
    return typeof maybe.$type === 'string' ? maybe.$type : undefined
  }

  private applyTypeInferenceAndChecks(
    token: Record<string, unknown>,
    declaredType: string | undefined,
    referencedType: string | undefined,
    refString: string,
  ): Record<string, unknown> {
    if (referencedType === undefined) {
      return token
    }

    if (declaredType !== undefined && declaredType !== referencedType) {
      this.handleValidationIssue(
        `Token-level $ref type mismatch: declared "$type" is "${declaredType}" but referenced token type is "${referencedType}" (${refString})`,
      )
      return token
    }

    const currentType = typeof token.$type === 'string' ? token.$type : undefined
    if (currentType === undefined) {
      return { ...token, $type: referencedType }
    }

    if (currentType !== referencedType) {
      this.handleValidationIssue(
        `Token-level $ref type mismatch: token "$type" is "${currentType}" but referenced token type is "${referencedType}" (${refString})`,
      )
    }

    return token
  }

  private handleValidationIssue(message: string): void {
    this.validationHandler.handleIssue(new ValidationError(message, [{ message }]))
  }

  /**
   * Clear the cache
   */
  clearCache(): void {
    this.context.cache.clear()
  }
}
