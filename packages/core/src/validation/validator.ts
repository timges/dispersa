/**
 * @fileoverview JSON Schema validator for design tokens and resolver documents
 *
 * Validates token data and resolver configurations against JSON schemas
 * to ensure DTCG compliance and catch errors early in the build process.
 */

import { ConfigurationError } from '@shared/errors/index'
import { isTokenLike } from '@shared/utils/token-utils'
import Ajv, { type ErrorObject, type ValidateFunction } from 'ajv'
import addFormats from 'ajv-formats'

import { buildConfigSchema, outputConfigSchema, dispersaOptionsSchema } from './config-schemas'
import {
  dtcgSchemaRegistry,
  formatSchema,
  groupSchema,
  resolverSchema,
  tokenSchema,
} from './schemas'

/**
 * Validation error with message and optional context
 */
export type ValidationError = {
  /** Human-readable error message */
  message: string

  /** JSON path to the error location (e.g., '/tokens/color/primary') */
  path?: string

  /** Additional error parameters from JSON Schema validation */
  params?: Record<string, unknown>
}

/**
 * Validates design tokens and resolver documents against JSON schemas
 *
 * Uses AJV (Another JSON Validator) to validate data structures and ensure
 * compliance with DTCG specification and Dispersa extensions.
 *
 * @example
 * ```typescript
 * const validator = new SchemaValidator()
 *
 * // Validate resolver document
 * const resolverErrors = validator.validateResolver(resolverData)
 * if (resolverErrors.length > 0) {
 *   console.error('Resolver validation failed:', resolverErrors)
 * }
 *
 * // Validate token
 * const tokenErrors = validator.validateToken(tokenData)
 * ```
 */
export class SchemaValidator {
  private ajv: Ajv
  private validators: Map<string, ValidateFunction>

  constructor() {
    this.ajv = new Ajv({
      allErrors: true,
      strict: false,
      validateFormats: true,
    })
    addFormats(this.ajv)
    this.validators = new Map()
    this.registerDefaultSchemas()
  }

  private registerDefaultSchemas(): void {
    for (const schema of dtcgSchemaRegistry) {
      this.ajv.addSchema(schema as Record<string, unknown>, (schema as { $id?: string }).$id)
    }

    // Register DTCG schemas
    this.registerSchema('format', formatSchema)
    this.registerSchema('resolver', resolverSchema)
    this.registerSchema('token', tokenSchema)
    this.registerSchema('group', groupSchema)

    // Register config schemas
    this.registerSchema('outputConfig', outputConfigSchema)
    this.registerSchema('dispersaOptions', dispersaOptionsSchema)
    this.registerSchema('buildConfig', buildConfigSchema)
  }

  /**
   * Registers a custom JSON schema for validation
   *
   * Compiles and registers a JSON schema that can be used with `validate()`.
   *
   * @param name - Unique identifier for the schema
   * @param schema - JSON Schema object (draft-07 compatible)
   *
   * @example
   * ```typescript
   * validator.registerSchema('customToken', {
   *   type: 'object',
   *   required: ['$value', '$type'],
   *   properties: {
   *     $value: { type: 'string' },
   *     $type: { const: 'custom' }
   *   }
   * })
   * ```
   */
  registerSchema(name: string, schema: Record<PropertyKey, unknown>): void {
    const validate = this.ajv.compile(schema)
    this.validators.set(name, validate)
  }

  /**
   * Validates data against a registered schema
   *
   * @param schemaName - Name of the registered schema to validate against
   * @param data - Data to validate
   * @returns Array of validation errors (empty if valid)
   * @throws {Error} If schema name is not registered
   *
   * @example
   * ```typescript
   * const errors = validator.validate('color', colorTokenData)
   * if (errors.length > 0) {
   *   console.error('Validation failed:', errors)
   * }
   * ```
   */
  validate(schemaName: string, data: unknown): ValidationError[] {
    const validator = this.validators.get(schemaName)
    if (validator == null) {
      throw new ConfigurationError(`Schema not found: ${schemaName}`)
    }

    const valid = validator(data)
    return valid ? [] : this.formatErrors(validator.errors ?? [])
  }

  /**
   * Validates a resolver document structure
   *
   * Checks that the resolver document conforms to the expected schema with
   * valid references, sets, and modifier definitions.
   *
   * @param data - Resolver document data
   * @returns Array of validation errors (empty if valid)
   *
   * @example
   * ```typescript
   * const resolverErrors = validator.validateResolver(resolverData)
   * ```
   */
  validateResolver(data: unknown): ValidationError[] {
    return this.validate('resolver', data)
  }

  /**
   * Validates a design token structure
   *
   * Validates a token against the DTCG token schema. The schema itself
   * enforces type-specific constraints based on the token's `$type` field.
   *
   * @param data - Token data to validate
   * @returns Array of validation errors (empty if valid)
   *
   * @example
   * ```typescript
   * const errors = validator.validateToken(tokenData)
   * ```
   */
  validateToken(data: unknown): ValidationError[] {
    return this.validate('token', data)
  }

  /**
   * Validates a group structure (DTCG Section 6)
   *
   * Groups organize tokens hierarchically and can have properties like
   * $type, $description, $deprecated, $extensions, and $extends.
   * Groups MUST NOT have $value or $ref properties.
   *
   * @param data - Group data to validate
   * @returns Array of validation errors (empty if valid)
   *
   * @example
   * ```typescript
   * const groupErrors = validator.validateGroup(groupData)
   * ```
   */
  validateGroup(data: unknown): ValidationError[] {
    return this.validate('group', data)
  }

  /**
   * Smart validation: Try both token and group schemas
   *
   * Per DTCG spec, an object is either a token (has $value/$ref) or a group (no $value/$ref).
   * This method tries to validate as both and returns the appropriate result.
   *
   * Strategy:
   * 1. Check for structural hints ($value/$ref present)
   * 2. Try validating as the likely type first
   * 3. If that fails, try the other type
   * 4. Only error if both fail
   *
   * @param obj - Object to validate (token or group)
   * @returns Validation result with type and errors
   *
   * @example
   * ```typescript
   * const result = validator.validateTokenOrGroup(obj)
   * if (result.type === 'invalid') {
   *   console.error(result.message, result.errors)
   * }
   * ```
   */
  validateTokenOrGroup(obj: unknown): {
    type: 'token' | 'group' | 'invalid'
    errors: ValidationError[]
    message?: string
  } {
    // First, check structural hints
    const hasValue = isTokenLike(obj)

    if (hasValue) {
      const tokenErrors = this.validateToken(obj)
      if (tokenErrors.length === 0) {
        return { type: 'token', errors: [] }
      }
      return {
        type: 'invalid',
        errors: tokenErrors,
        message: 'Object has $value/$ref but failed token validation',
      }
    }

    const groupErrors = this.validateGroup(obj)
    if (groupErrors.length === 0) {
      return { type: 'group', errors: [] }
    }

    const tokenErrors = this.validateToken(obj)
    if (tokenErrors.length === 0) {
      return { type: 'token', errors: [] }
    }

    return {
      type: 'invalid',
      errors: groupErrors.length < tokenErrors.length ? groupErrors : tokenErrors,
      message:
        groupErrors.length < tokenErrors.length
          ? 'Object appears to be a group but failed validation'
          : 'Object appears to be a token but failed validation',
    }
  }

  /**
   * Format AJV errors into readable ValidationError objects
   */
  private formatErrors(errors: ErrorObject[]): ValidationError[] {
    return errors.map((error) => ({
      message: error.message ?? 'Validation error',
      path: error.instancePath,
      params: error.params,
    }))
  }

  /**
   * Formats validation errors into a human-readable message
   *
   * Combines multiple validation errors into a single string suitable
   * for logging or error displays.
   *
   * @param errors - Array of validation errors
   * @returns Formatted error message string
   *
   * @example
   * ```typescript
   * const errors = validator.validateToken(tokenData)
   * if (errors.length > 0) {
   *   const message = validator.getErrorMessage(errors)
   *   console.error(message)
   * }
   * ```
   */
  getErrorMessage(errors: ValidationError[]): string {
    if (errors.length === 0) {
      return 'No errors'
    }

    return errors
      .map((error) => {
        const path = error.path != null && error.path !== '' ? `at ${error.path}` : ''
        return `${error.message} ${path}`.trim()
      })
      .join('; ')
  }

  // ============================================================================
  // CONFIGURATION VALIDATION METHODS
  // ============================================================================

  /**
   * Validates an OutputConfig structure
   *
   * @param data - Output configuration data
   * @returns Array of validation errors (empty if valid)
   */
  validateOutputConfig(data: unknown): ValidationError[] {
    return this.validate('outputConfig', data)
  }

  /**
   * Validates DispersaOptions structure
   *
   * @param data - Dispersa options data
   * @returns Array of validation errors (empty if valid)
   */
  validateDispersaOptions(data: unknown): ValidationError[] {
    return this.validate('dispersaOptions', data)
  }

  /**
   * Validates BuildConfig structure
   *
   * @param data - Build configuration data
   * @returns Array of validation errors (empty if valid)
   */
  validateBuildConfig(data: unknown): ValidationError[] {
    return this.validate('buildConfig', data)
  }
}
