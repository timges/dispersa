/**
 * @fileoverview Resolver document parser with validation
 */

import { constants as fsConstants } from 'node:fs'
import { readFile, access } from 'node:fs/promises'
import * as path from 'node:path'

import type { ResolverDocument } from '@resolution/types'
import { FileOperationError, ValidationError } from '@shared/errors/index'
import type { ValidationOptions } from '@shared/types/validation'
import { ValidationHandler } from '@shared/utils/validation-handler'
import { SchemaValidator } from '@validation/index'

export type ParserOptions = {
  allowUnknownVersion?: boolean
  validation?: ValidationOptions
}

export class ResolverParser {
  private validator: SchemaValidator
  private options: ParserOptions
  private validationHandler: ValidationHandler

  constructor(options: ParserOptions = {}) {
    this.validator = new SchemaValidator()
    this.options = {
      allowUnknownVersion: false,
      ...options,
    }
    this.validationHandler = new ValidationHandler(options.validation)
  }

  /**
   * Parse resolver document from file
   */
  async parseFile(filePath: string): Promise<ResolverDocument> {
    const absolutePath = path.isAbsolute(filePath)
      ? filePath
      : path.resolve(process.cwd(), filePath)

    try {
      await access(absolutePath, fsConstants.R_OK)
    } catch (error) {
      throw new FileOperationError('read', absolutePath, error as Error)
    }

    let content: string
    try {
      content = await readFile(absolutePath, 'utf-8')
    } catch (error) {
      throw new FileOperationError('read', absolutePath, error as Error)
    }
    return this.parse(content, absolutePath)
  }

  /**
   * Parse resolver document from string
   */
  parse(content: string, sourcePath?: string): ResolverDocument {
    let data: unknown

    try {
      data = JSON.parse(content) as unknown
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error)
      throw new ValidationError(`Failed to parse resolver JSON: ${errorMsg}`, [
        { message: errorMsg },
      ])
    }

    return this.parseObject(data, sourcePath)
  }

  /**
   * Parse and validate an inline resolver document object
   * Use this when you have a ResolverDocument object in memory
   * rather than loading from a file
   *
   * @param resolver - ResolverDocument object to validate
   * @returns Validated ResolverDocument
   * @throws {Error} If validation fails
   *
   * @example
   * ```typescript
   * const parser = new ResolverParser()
   * const resolver = parser.parseInline({
   *   version: '2025.10',
   *   sets: {
   *     base: { sources: [{ ... }] }
   *   },
   *   resolutionOrder: [{ $ref: '#/sets/base' }]
   * })
   * ```
   */
  parseInline(resolver: ResolverDocument): ResolverDocument {
    return this.parseObject(resolver, '<inline>')
  }

  /**
   * Parse and validate resolver document object
   */
  parseObject(data: unknown, sourcePath?: string): ResolverDocument {
    const contextMsg = sourcePath != null && sourcePath !== '' ? ` in ${sourcePath}` : ''

    // Type guard
    if (typeof data !== 'object' || data == null) {
      throw new ValidationError(`Resolver document must be an object${contextMsg}`, [
        { message: `Resolver document must be an object${contextMsg}` },
      ])
    }

    // Validate if enabled
    const resolverErrors = this.validator.validateResolver(data)
    if (resolverErrors.length > 0) {
      const errorMessage = this.validator.getErrorMessage(resolverErrors)
      this.handleValidationIssue(`Invalid resolver document${contextMsg}: ${errorMessage}`)
    }

    const resolver = data as ResolverDocument

    // Check version
    if (resolver.version !== '2025.10' && this.options.allowUnknownVersion !== true) {
      this.handleValidationIssue(
        `Unsupported resolver version: ${String(resolver.version)}. Expected 2025.10${contextMsg}`,
      )
    }

    // Validate resolution order
    if (resolver.resolutionOrder == null || resolver.resolutionOrder.length === 0) {
      this.handleValidationIssue(
        `Resolver document must have a non-empty resolutionOrder${contextMsg}`,
      )
    }

    // Validate reference pointers (DTCG spec section 4.2.1)
    this.validateReferencePointers(resolver, contextMsg)

    // Validate modifier constraints
    this.validateModifiers(resolver, contextMsg)

    return resolver
  }

  /**
   * Validate reference pointers according to DTCG spec section 4.2.1
   * - Sets/modifiers MUST NOT reference other modifiers
   * - References MUST NOT point to resolutionOrder array items
   */
  private validateReferencePointers(resolver: ResolverDocument, contextMsg: string): void {
    if (resolver.sets) {
      for (const [setName, set] of Object.entries(resolver.sets)) {
        this.validateSourceReferences(set.sources, `set "${setName}"`, contextMsg)
      }
    }

    if (!resolver.modifiers) {
      return
    }

    for (const [modifierName, modifier] of Object.entries(resolver.modifiers)) {
      for (const [contextName, sources] of Object.entries(modifier.contexts)) {
        this.validateSourceReferences(
          sources,
          `modifier "${modifierName}" context "${contextName}"`,
          contextMsg,
        )
      }
    }
  }

  private validateSourceReferences(sources: unknown[], location: string, contextMsg: string): void {
    for (const source of sources) {
      if (typeof source !== 'object' || source === null || !('$ref' in source)) {
        continue
      }

      const ref = (source as { $ref: string }).$ref

      if (ref.startsWith('#/modifiers/')) {
        this.handleValidationIssue(
          `Invalid reference in ${location}: "${ref}". Sets and modifier contexts MUST NOT reference modifiers${contextMsg}`,
        )
      }

      if (ref.startsWith('#/resolutionOrder/')) {
        this.handleValidationIssue(
          `Invalid reference in ${location}: "${ref}". References MUST NOT point to resolutionOrder array items${contextMsg}`,
        )
      }
    }
  }

  /**
   * Validate modifiers according to DTCG spec
   */
  private validateModifiers(resolver: ResolverDocument, contextMsg: string): void {
    if (!resolver.modifiers) {
      return
    }

    for (const [modifierName, modifier] of Object.entries(resolver.modifiers)) {
      const contextCount = Object.keys(modifier.contexts).length

      // MUST throw error for 0 contexts
      if (contextCount === 0) {
        this.handleValidationIssue(
          `Modifier "${modifierName}" has 0 contexts. Modifiers MUST have at least 1 context${contextMsg}`,
        )
      }

      // SHOULD throw error for 1 context (use a set instead)
      if (contextCount === 1) {
        this.handleValidationIssue(
          `Modifier "${modifierName}" has only 1 context. A modifier with 1 context should be a set instead${contextMsg}`,
        )
      }

      // Validate default value if provided
      if (modifier.default && !(modifier.default in modifier.contexts)) {
        const validContexts = Object.keys(modifier.contexts).join(', ')
        this.handleValidationIssue(
          `Modifier "${modifierName}" has invalid default value "${modifier.default}". Must be one of: ${validContexts}${contextMsg}`,
        )
      }
    }
  }

  private handleValidationIssue(message: string): void {
    this.validationHandler.handleIssue(new ValidationError(message, [{ message }]))
  }

  /**
   * Validate resolver document without parsing
   */
  validate(data: unknown): { valid: boolean; errors: string[] } {
    const errors = this.validator.validateResolver(data)
    return {
      valid: errors.length === 0,
      errors: errors.map((e) => e.message),
    }
  }
}
