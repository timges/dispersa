/**
 * @fileoverview DTCG token parser with validation
 */

import * as path from 'node:path'

import { readJSONFile } from '@adapters/filesystem/file-utils'
import { SchemaValidator } from '@lib/validation/validator'
import { ValidationError } from '@shared/errors/index'
import type { ValidationOptions } from '@shared/types/validation'
import { getErrorMessage } from '@shared/utils/error-utils'
import { formatTokenPath } from '@shared/utils/path-utils'
import { ValidationHandler } from '@shared/utils/validation-handler'

import { GroupExtensionResolver } from './group-extension-resolver'
import type {
  InternalResolvedToken,
  InternalResolvedTokens,
  InternalTokenDocument,
  InternalToken,
  Token,
  TokenCollection,
  TokenGroup,
  TokenType,
  TokenValue,
} from './types'

export type TokenParserOptions = {
  preserveExtensions?: boolean
  warnOnCaseSensitiveNames?: boolean
  validation?: ValidationOptions
}

export class TokenParser {
  private validator: SchemaValidator
  private options: TokenParserOptions
  private validationHandler: ValidationHandler

  constructor(options: TokenParserOptions = {}) {
    this.validator = new SchemaValidator()
    this.options = {
      preserveExtensions: true,
      warnOnCaseSensitiveNames: true,
      ...options,
    }
    this.validationHandler = new ValidationHandler(options.validation)
  }

  /**
   * Parse tokens from file
   */
  async parseFile(filePath: string): Promise<TokenCollection> {
    const absolutePath = path.isAbsolute(filePath)
      ? filePath
      : path.resolve(process.cwd(), filePath)

    const data = await readJSONFile(absolutePath)
    return this.parseObject(data)
  }

  /**
   * Parse tokens from string
   */
  parse(content: string, sourcePath?: string): TokenCollection {
    const contextMsg = sourcePath !== undefined && sourcePath !== '' ? ` in ${sourcePath}` : ''
    try {
      const data = JSON.parse(content) as unknown
      return this.parseObject(data)
    } catch (error) {
      const errorMsg = getErrorMessage(error)
      throw new ValidationError(`Failed to parse token JSON${contextMsg}: ${errorMsg}`, [
        { message: errorMsg },
      ])
    }
  }

  /**
   * Parse tokens from object
   * Resolves $extends group inheritance before returning
   */
  parseObject(data: unknown): TokenCollection {
    if (typeof data !== 'object' || data === null) {
      throw new ValidationError('Token data must be an object', [
        { message: 'Token data must be an object' },
      ])
    }

    const formatErrors = this.validator.validate('format', data)
    if (formatErrors.length > 0) {
      const errorMsg = this.validator.getErrorMessage(formatErrors)
      this.handleValidationIssue(`Invalid token document: ${errorMsg}`)
    }

    // Resolve group extensions ($extends) per DTCG spec Section 6.4
    const extensionResolver = new GroupExtensionResolver()
    const resolved = extensionResolver.resolveExtensions(data as TokenCollection)

    return resolved
  }

  /**
   * Flatten token collection into resolved tokens with paths
   *
   * Recursively processes a nested token structure and converts it into a flat
   * collection of resolved tokens with fully qualified paths and names.
   *
   * @param tokens - Token collection or record to flatten
   * @param parentPath - Parent path segments for nested tokens (default: [])
   * @param inheritedType - Type inherited from parent group (optional)
   * @returns Flat collection of resolved tokens indexed by dotted path
   */
  flatten(
    tokens: TokenCollection | InternalTokenDocument | TokenGroup,
    parentPath: string[] = [],
    inheritedType?: TokenType,
  ): InternalResolvedTokens {
    const result: InternalResolvedTokens = {}

    for (const [key, value] of Object.entries(tokens)) {
      this.processEntry({
        key,
        value,
        parentPath,
        inheritedType,
        result,
      })
    }

    // Check for case-sensitive name conflicts (DTCG SHOULD requirement)
    // Only check at the root level to avoid checking on every recursive call
    if (this.options.warnOnCaseSensitiveNames === true && parentPath.length === 0) {
      this.checkCaseSensitiveNames(result)
    }

    return result
  }

  private processEntry(params: {
    key: string
    value: unknown
    parentPath: string[]
    inheritedType?: TokenType
    result: InternalResolvedTokens
  }): void {
    const { key, value, parentPath, inheritedType, result } = params

    if (this.looksLikeToken(value) && key.startsWith('$')) {
      // Only $root is allowed as a $ prefixed token name
      this.validateTokenName(key, parentPath)
    }

    if (this.shouldSkipKey(key)) {
      return
    }

    this.validateTokenName(key, parentPath)
    const currentPath = [...parentPath, key]

    if (this.isObject(value)) {
      this.validateGroupStructure(value as Record<string, unknown>, currentPath)
    }

    if (this.isToken(value)) {
      const resolvedToken = this.buildResolvedToken(value, currentPath, inheritedType)
      this.ensureTokenType(resolvedToken, currentPath)
      result[resolvedToken.name] = resolvedToken
      return
    }

    if (this.isTokenGroup(value)) {
      this.flattenGroup(value, currentPath, inheritedType, result)
    }
  }

  private looksLikeToken(value: unknown): boolean {
    return typeof value === 'object' && value !== null && ('$value' in value || '$ref' in value)
  }

  private shouldSkipKey(key: string): boolean {
    return key.startsWith('$') && key !== '$root'
  }

  private isObject(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null
  }

  private buildResolvedToken(
    token: InternalToken,
    currentPath: string[],
    inheritedType?: TokenType,
  ): InternalResolvedToken {
    this.validateResolvedToken(token, currentPath)

    const tokenName = currentPath.join('.')
    const resolvedToken: InternalResolvedToken = {
      ...token,
      path: currentPath,
      name: tokenName,
      originalValue: (token.$value ?? token.$ref ?? '') as TokenValue,
    }

    if (resolvedToken.$type == null && inheritedType != null) {
      resolvedToken.$type = inheritedType
    }

    return resolvedToken
  }

  private validateResolvedToken(token: InternalToken, currentPath: string[]): void {
    const tokenType = token.$type
    if (typeof tokenType !== 'string') {
      return
    }

    const tokenForValidation = this.stripInternalMetadata(token)
    const errors = this.validator.validateToken(tokenForValidation, tokenType)
    if (errors.length === 0) {
      return
    }

    const errorMsg = this.validator.getErrorMessage(errors)
    this.handleValidationIssue(`Invalid token at ${currentPath.join('.')}: ${errorMsg}`)
  }

  private ensureTokenType(token: InternalResolvedToken, currentPath: string[]): void {
    if (token.$type != null) {
      return
    }

    const isAliasReference = this.isReference(token.$value)
    const hasTokenLevelRef = typeof (token as Record<string, unknown>).$ref === 'string'
    if (isAliasReference || hasTokenLevelRef) {
      return
    }

    this.handleValidationIssue(
      `Token at ${currentPath.join('.')} has no $type property. ` +
        `Tokens must have an explicit $type, inherit it from a parent group, or be a reference to another token.`,
    )
  }

  private flattenGroup(
    value: TokenGroup,
    currentPath: string[],
    inheritedType: TokenType | undefined,
    result: InternalResolvedTokens,
  ): void {
    const groupType = (value as Record<string, unknown>).$type as TokenType | undefined
    const typeToInherit = groupType ?? inheritedType
    const flattened = this.flatten(value, currentPath, typeToInherit)
    Object.assign(result, flattened)
  }

  /**
   * Type guard: check if value is a token
   */
  private isToken(value: unknown): value is InternalToken {
    return typeof value === 'object' && value != null && ('$value' in value || '$ref' in value)
  }

  /**
   * Type guard: check if value is a token group
   */
  private isTokenGroup(value: unknown): value is TokenGroup {
    return typeof value === 'object' && value != null && !('$value' in value)
  }

  /**
   * Check if a value is a reference (alias reference)
   * References will have their type determined during alias resolution
   */
  private isReference(value: unknown): boolean {
    if (typeof value !== 'string') {
      return false
    }
    // Alias reference (e.g., "{token.name}")
    if (value.startsWith('{') && value.endsWith('}')) {
      return true
    }
    return false
  }

  /**
   * Validate token/group name according to DTCG specification
   *
   * Names MUST NOT:
   * - Begin with '$' (reserved for specification properties), except for '$root'
   * - Contain '{', '}', or '.' characters (special syntax roles)
   *
   * Exception: '$root' is allowed as a reserved token name (DTCG Section 6.2)
   */
  private validateTokenName(name: string, parentPath: string[]): void {
    if (name.startsWith('$') && name !== '$root') {
      const path = formatTokenPath(parentPath, name)
      this.handleValidationIssue(
        `Invalid token/group name at "${path}": Names cannot start with '$' as this prefix is reserved for DTCG properties. ` +
          `Only '$root' is allowed as a special token name.`,
      )
    }

    if (/[{}.]/.test(name)) {
      const path = formatTokenPath(parentPath, name)
      const invalidChars = name.match(/[{}.]/g)?.join(', ') ?? ''
      this.handleValidationIssue(
        `Invalid token/group name at "${path}": Names cannot contain '{', '}', or '.' characters. Found: ${invalidChars}`,
      )
    }
  }

  /**
   * Validate group structure according to DTCG specification
   *
   * Groups MUST NOT contain both a $value property and child tokens/groups simultaneously.
   * This ensures clear distinction between tokens (leaf nodes) and groups (containers).
   *
   * Note: $root is treated as a child token, not a property (DTCG Section 6.2).
   */
  private validateGroupStructure(value: Record<string, unknown>, path: string[]): void {
    const hasValue = '$value' in value || '$ref' in value
    const hasChildren = Object.keys(value).some(
      (key) =>
        (!key.startsWith('$') || key === '$root') &&
        typeof value[key] === 'object' &&
        value[key] !== null,
    )

    if (hasValue && hasChildren) {
      this.handleValidationIssue(
        `Invalid structure at "${formatTokenPath(path)}": Object contains both $value/$ref and child tokens/groups. ` +
          `Per DTCG specification, groups cannot have both a value and children.`,
      )
    }
  }

  private stripInternalMetadata(token: Record<string, unknown>): Record<string, unknown> {
    const { path: _path, name: _name, originalValue: _originalValue, ...rest } = token
    const cleaned: Record<string, unknown> = {}

    for (const [key, value] of Object.entries(rest)) {
      if (key.startsWith('_')) {
        continue
      }
      cleaned[key] = value
    }

    return cleaned
  }

  /**
   * Check for token names that differ only by case
   *
   * Per DTCG spec: "Tools MAY display a warning when token names differ only by case."
   * This helps prevent issues in case-insensitive environments.
   *
   * Note: This method performs validation but does not emit warnings.
   * Case-sensitive name conflicts are considered acceptable per DTCG spec.
   */
  private checkCaseSensitiveNames(tokens: InternalResolvedTokens): void {
    // Validation logic retained for potential future warning system
    const lowercaseMap = new Map<string, string>()

    for (const tokenName of Object.keys(tokens)) {
      const lower = tokenName.toLowerCase()
      const existing = lowercaseMap.get(lower)

      if (existing && existing !== tokenName) {
        // Case-sensitive name conflict detected
        // Per DTCG spec, this is allowed but tools MAY warn
        // Future: Could be emitted through a proper warning/event system
        this.reportWarning(
          `Token names differ only by case: "${existing}" and "${tokenName}". This may break in case-insensitive environments.`,
        )
      } else {
        lowercaseMap.set(lower, tokenName)
      }
    }
  }

  private handleValidationIssue(message: string): void {
    this.validationHandler.handleIssue(new ValidationError(message, [{ message }]))
  }

  private reportWarning(message: string): void {
    this.validationHandler.warn(message)
  }

  /**
   * Validate a single token
   */
  validateToken(token: Token): { valid: boolean; errors: string[] } {
    const tokenType = token.$type
    const tokenForValidation = this.stripInternalMetadata(token as Record<string, unknown>)
    const errors = tokenType
      ? this.validator.validateToken(tokenForValidation, tokenType)
      : this.validator.validateToken(tokenForValidation)

    return {
      valid: errors.length === 0,
      errors: errors.map((e) => e.message),
    }
  }
}
