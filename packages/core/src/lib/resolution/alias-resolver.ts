/**
 * @fileoverview Token alias resolver with circular reference detection
 * Resolves {tokenName} references in token values
 */

import type { InternalResolvedToken, InternalResolvedTokens, TokenValue } from '@lib/tokens/types'
import { DEFAULT_MAX_ALIAS_DEPTH } from '@shared/constants'
import { CircularReferenceError, TokenReferenceError, ValidationError } from '@shared/errors/index'
import type { ValidationOptions } from '@shared/types/validation'
import { findSimilar } from '@shared/utils/string-similarity'
import { getPureAliasReferenceName } from '@shared/utils/token-utils'
import { ValidationHandler } from '@shared/utils/validation-handler'

export type AliasResolutionOptions = {
  maxDepth?: number
  /**
   * Enable validation mode (throws errors on missing references)
   * When false, unresolved references are left as-is
   * Default: true
   */
  validation?: ValidationOptions
}

export class AliasResolver {
  private options: AliasResolutionOptions
  private resolving: Set<string>
  private validationHandler: ValidationHandler

  constructor(options: AliasResolutionOptions = {}) {
    this.options = {
      maxDepth: DEFAULT_MAX_ALIAS_DEPTH,
      ...options,
    }
    this.resolving = new Set()
    this.validationHandler = new ValidationHandler(options.validation)
  }

  /**
   * Resolve all aliases in a token collection
   *
   * Processes each token and resolves any alias references (e.g., `{token.name}`)
   * to their actual values. Detects circular references and enforces maximum depth.
   *
   * @param tokens - Collection of tokens to resolve aliases in
   * @returns New collection with all aliases resolved to their values
   * @throws {CircularReferenceError} If circular reference detected
   * @throws {TokenReferenceError} If referenced token not found (when validate enabled)
   */
  resolve(tokens: InternalResolvedTokens): InternalResolvedTokens {
    const result: InternalResolvedTokens = {}

    for (const [name, token] of Object.entries(tokens)) {
      this.resolving.clear() // Clear for each top-level token
      result[name] = this.resolveToken(name, token, tokens, 0)
    }

    return result
  }

  /**
   * Resolve aliases in a single token
   */
  private resolveToken(
    name: string,
    token: InternalResolvedToken,
    allTokens: InternalResolvedTokens,
    depth: number,
  ): InternalResolvedToken {
    this.assertMaxDepth(name, depth)
    this.assertNotCircular(name)

    this.resolving.add(name)
    try {
      const hadAlias = AliasResolver.hasAliases((token.$value ?? '') as TokenValue)
      const pureAliasReferenceName = getPureAliasReferenceName((token.$value ?? '') as TokenValue)

      if (pureAliasReferenceName !== undefined) {
        return this.resolvePureAliasToken(
          name,
          token,
          allTokens,
          depth,
          hadAlias,
          pureAliasReferenceName,
        )
      }

      return this.resolveInlineAliasToken(name, token, allTokens, depth, hadAlias)
    } finally {
      this.resolving.delete(name)
    }
  }

  private assertMaxDepth(name: string, depth: number): void {
    const maxDepth = this.options.maxDepth ?? DEFAULT_MAX_ALIAS_DEPTH
    if (depth <= maxDepth) {
      return
    }

    throw new ValidationError(`Maximum alias resolution depth exceeded for token: ${name}`, [
      { message: `Maximum alias resolution depth exceeded for token: ${name}` },
    ])
  }

  private assertNotCircular(name: string): void {
    if (!this.resolving.has(name)) {
      return
    }
    throw new CircularReferenceError(name, Array.from(this.resolving))
  }

  private resolvePureAliasToken(
    name: string,
    token: InternalResolvedToken,
    allTokens: InternalResolvedTokens,
    depth: number,
    hadAlias: boolean,
    referenceName: string,
  ): InternalResolvedToken {
    try {
      const referencedToken = this.resolveReferenceToken(referenceName, allTokens, depth)
      if (referencedToken === undefined) {
        return this.withAliasMarker(token, token.$value, hadAlias)
      }

      const updatedType = this.getTypeAfterCompatibilityCheck(
        token.$type,
        referencedToken.$type,
        name,
        referenceName,
      )

      return this.withAliasMarker(
        {
          ...token,
          $type: updatedType,
        },
        (referencedToken.$value ?? '') as TokenValue,
        hadAlias,
      )
    } catch (error) {
      return this.handleAliasError(error, name, token, hadAlias)
    }
  }

  private resolveInlineAliasToken(
    name: string,
    token: InternalResolvedToken,
    allTokens: InternalResolvedTokens,
    depth: number,
    hadAlias: boolean,
  ): InternalResolvedToken {
    try {
      const resolvedValue = this.resolveValue((token.$value ?? '') as TokenValue, allTokens, depth)
      return this.withAliasMarker(token, resolvedValue, hadAlias)
    } catch (error) {
      return this.handleAliasError(error, name, token, hadAlias)
    }
  }

  private withAliasMarker(
    token: InternalResolvedToken,
    value: TokenValue | undefined,
    hadAlias: boolean,
  ): InternalResolvedToken {
    return {
      ...token,
      $value: value,
      _isAlias: hadAlias,
    }
  }

  /**
   * Resolve aliases in a value
   */
  private resolveValue(
    value: TokenValue,
    allTokens: InternalResolvedTokens,
    depth: number,
  ): TokenValue {
    if (typeof value === 'string') {
      return this.resolveStringValue(value, allTokens, depth)
    }

    if (Array.isArray(value)) {
      return value.map((item) => this.resolveValue(item as TokenValue, allTokens, depth))
    }

    if (typeof value === 'object' && value != null) {
      const result: Record<string, unknown> = {}
      for (const [key, val] of Object.entries(value)) {
        result[key] = this.resolveValue(val as TokenValue, allTokens, depth)
      }
      return result
    }

    return value
  }

  /**
   * Resolve aliases in a string value
   */
  private resolveStringValue(
    value: string,
    allTokens: InternalResolvedTokens,
    depth: number,
  ): TokenValue {
    // Check if the entire value is an alias reference
    const fullReferenceMatch = /^\{([^}]+)\}$/.exec(value)
    if (fullReferenceMatch != null) {
      const referenceName = fullReferenceMatch[1]
      if (referenceName != null) {
        return this.resolveReference(referenceName, allTokens, depth)
      }
    }

    // Check for inline aliases (e.g., "2px solid {color.primary}")
    if (value.includes('{')) {
      return value.replace(/\{([^}]+)\}/g, (_match, referenceName: string) => {
        const resolved = this.resolveReference(referenceName, allTokens, depth)
        if (
          typeof resolved === 'string' ||
          typeof resolved === 'number' ||
          typeof resolved === 'boolean'
        ) {
          return String(resolved)
        }
        return JSON.stringify(resolved)
      })
    }

    return value
  }

  /**
   * Resolve a single reference (whole token only)
   *
   * Per DTCG spec, curly brace syntax only supports whole token references.
   * Property-level references must use JSON Pointer syntax ($ref).
   *
   * Examples:
   * - `{color.primary}` - whole token reference ✅
   * - `{color.primary.components.0}` - NOT supported (use $ref with JSON Pointer) ❌
   */
  private resolveReference(
    referenceName: string,
    allTokens: InternalResolvedTokens,
    depth: number,
  ): TokenValue {
    const cleanName = referenceName.trim()

    // Look up the token by its full name (no property-level access)
    const referencedToken = allTokens[cleanName]

    if (referencedToken == null) {
      const suggestions = findSimilar(cleanName, Object.keys(allTokens))
      this.validationHandler.handleIssue(new TokenReferenceError(cleanName, suggestions))
      this.validationHandler.warn(`Unresolved token reference: "${cleanName}"`)
      return `{${cleanName}}`
    }

    // Recursively resolve the referenced token
    const resolved = this.resolveToken(cleanName, referencedToken, allTokens, depth + 1)

    return (resolved.$value ?? '') as TokenValue
  }

  private resolveReferenceToken(
    referenceName: string,
    allTokens: InternalResolvedTokens,
    depth: number,
  ): InternalResolvedToken | undefined {
    const cleanName = referenceName.trim()
    const referencedToken = allTokens[cleanName]

    if (referencedToken == null) {
      const suggestions = findSimilar(cleanName, Object.keys(allTokens))
      this.validationHandler.handleIssue(new TokenReferenceError(cleanName, suggestions))
      this.validationHandler.warn(`Unresolved token reference: "${cleanName}"`)
      return undefined
    }

    return this.resolveToken(cleanName, referencedToken, allTokens, depth + 1)
  }

  private getTypeAfterCompatibilityCheck(
    declaredType: unknown,
    referencedType: unknown,
    tokenName: string,
    referenceName: string,
  ): InternalResolvedToken['$type'] {
    const declared = typeof declaredType === 'string' ? declaredType : undefined
    const referenced = typeof referencedType === 'string' ? referencedType : undefined

    if (declared !== undefined && referenced !== undefined && declared !== referenced) {
      this.handleTypeMismatch(tokenName, referenceName, declared, referenced)
      return declaredType as InternalResolvedToken['$type']
    }

    if (declared === undefined && referenced !== undefined) {
      return referenced as InternalResolvedToken['$type']
    }

    return declaredType as InternalResolvedToken['$type']
  }

  private handleTypeMismatch(
    tokenName: string,
    referenceName: string,
    declaredType: string,
    referencedType: string,
  ): void {
    const message =
      `Alias type mismatch for "${tokenName}": declared "$type" is "${declaredType}" ` +
      `but referenced token "${referenceName}" has "$type" "${referencedType}".`

    this.validationHandler.handleIssue(new ValidationError(message, [{ message }]))
  }

  /**
   * Check if a value contains aliases
   */
  static hasAliases(value: TokenValue): boolean {
    if (typeof value === 'string') {
      return value.includes('{') && value.includes('}')
    }

    if (Array.isArray(value)) {
      return value.some((item) => AliasResolver.hasAliases(item as TokenValue))
    }

    if (typeof value === 'object' && value != null) {
      return Object.values(value).some((val) => AliasResolver.hasAliases(val as TokenValue))
    }

    return false
  }

  /**
   * Extract all alias references from a value
   */
  static extractReferences(value: TokenValue): string[] {
    const references: string[] = []

    if (typeof value === 'string') {
      const matches = value.matchAll(/\{([^}]+)\}/g)
      for (const match of matches) {
        const ref = match[1]
        if (ref != null) {
          references.push(ref.trim())
        }
      }
    } else if (Array.isArray(value)) {
      for (const item of value) {
        references.push(...AliasResolver.extractReferences(item as TokenValue))
      }
    } else if (typeof value === 'object' && value != null) {
      for (const val of Object.values(value)) {
        references.push(...AliasResolver.extractReferences(val as TokenValue))
      }
    }

    return references
  }

  private handleAliasError(
    error: unknown,
    name: string,
    token: InternalResolvedToken,
    hadAlias: boolean,
  ): InternalResolvedToken {
    if (error instanceof Error) {
      this.validationHandler.handleIssue(error)
    } else {
      this.validationHandler.handleIssue(new Error(String(error)))
    }

    const message = error instanceof Error ? error.message : String(error)
    this.validationHandler.warn(`Alias resolution skipped for "${name}": ${message}`)

    return {
      ...token,
      $value: token.$value,
      _isAlias: hadAlias,
    }
  }
}
