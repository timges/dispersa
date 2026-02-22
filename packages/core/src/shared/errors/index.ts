/**
 * @fileoverview Custom error classes for Dispersa
 *
 * Error classes are intentionally kept as simple value objects with no
 * imports from utility modules. Suggestion formatting is done at call
 * sites to keep the error hierarchy dependency-free.
 */

/**
 * Base error class for all Dispersa errors
 */
export class DispersaError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'DispersaError'
    // Maintains proper stack trace for where our error was thrown (only available on V8)
    if (typeof Error.captureStackTrace === 'function') {
      Error.captureStackTrace(this, this.constructor)
    }
  }
}

/**
 * Thrown when a token reference cannot be resolved
 *
 * @param referenceName - The token name that could not be found
 * @param suggestions - Similar token names for "did you mean?" hints
 * @param message - Optional custom message (overrides auto-generated message)
 */
export class TokenReferenceError extends DispersaError {
  constructor(
    public referenceName: string,
    public suggestions: string[] = [],
    message?: string,
  ) {
    const hint = TokenReferenceError.formatHint(suggestions)
    super(
      message ??
        `Token reference resolution failed: '${referenceName}'. Token does not exist.${hint}`,
    )
    this.name = 'TokenReferenceError'
  }

  private static formatHint(suggestions: string[]): string {
    if (suggestions.length === 0) {
      return ''
    }
    if (suggestions.length === 1) {
      return ` Did you mean "${suggestions[0]}"?`
    }
    const quoted = suggestions.map((s) => `"${s}"`)
    const last = quoted.pop()!
    return ` Did you mean ${quoted.join(', ')} or ${last}?`
  }
}

/**
 * Thrown when a circular reference is detected
 */
export class CircularReferenceError extends DispersaError {
  constructor(
    public tokenName: string,
    public referencePath: string[],
  ) {
    super(
      `Token resolution failed: '${tokenName}'. Circular reference detected in path: ${referencePath.join(' -> ')}`,
    )
    this.name = 'CircularReferenceError'
  }
}

/**
 * Thrown when validation fails
 */
export class ValidationError extends DispersaError {
  constructor(
    message: string,
    public errors: { message: string; path?: string }[],
  ) {
    super(message)
    this.name = 'ValidationError'
  }
}

/**
 * Thrown when file operations fail
 */
export class FileOperationError extends DispersaError {
  constructor(
    public operation: 'read' | 'write',
    public filePath: string,
    public originalError: Error,
  ) {
    super(`Failed to ${operation} file: ${filePath}. ${originalError.message}`)
    this.name = 'FileOperationError'
  }
}

/**
 * Thrown when a build configuration is invalid
 */
export class ConfigurationError extends DispersaError {
  constructor(message: string) {
    super(message)
    this.name = 'ConfigurationError'
  }
}

/**
 * Thrown when base permutation cannot be determined
 */
export class BasePermutationError extends DispersaError {
  constructor(
    message = 'Base permutation determination failed. Define a default modifier in resolver.',
  ) {
    super(message)
    this.name = 'BasePermutationError'
  }
}

/**
 * Thrown when an unknown modifier or context is used
 *
 * @param modifierName - Name of the modifier that failed validation
 * @param contextValue - The invalid context value (if applicable)
 * @param availableValues - Valid options (context names or modifier names) for the error message
 */
export class ModifierError extends DispersaError {
  constructor(
    public modifierName: string,
    public contextValue?: string,
    public availableValues: string[] = [],
  ) {
    const available = availableValues.length > 0 ? ` Available: ${availableValues.join(', ')}.` : ''

    const message =
      contextValue != null && contextValue !== ''
        ? `Modifier validation failed: '${modifierName}'. Invalid context '${contextValue}'.${available}`
        : `Modifier validation failed: '${modifierName}'. Modifier not defined in resolver.${available}`
    super(message)
    this.name = 'ModifierError'
  }
}

/**
 * Thrown when lint errors are found and failOnError is true
 *
 * @param issues - Array of lint issues that caused the error
 */
export class LintError extends DispersaError {
  constructor(
    public issues: Array<{
      ruleId: string
      severity: 'error' | 'warn'
      message: string
      tokenName: string
      tokenPath: string[]
    }>,
  ) {
    const errorCount = issues.filter((i) => i.severity === 'error').length
    const warningCount = issues.filter((i) => i.severity === 'warn').length
    super(`Lint failed with ${errorCount} error(s) and ${warningCount} warning(s).`)
    this.name = 'LintError'
  }
}
