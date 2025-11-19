/**
 * @fileoverview Error handling utilities
 */

import type { BuildError } from '@renderers/types'
import {
  BasePermutationError,
  CircularReferenceError,
  ColorParseError,
  ConfigurationError,
  DimensionFormatError,
  FileOperationError,
  ModifierError,
  TokenReferenceError,
  ValidationError,
} from '@shared/errors/index'

/**
 * Extract error message from unknown error value
 * Standardizes error message extraction across the codebase
 *
 * @param error - Unknown error value
 * @returns Error message string
 */
export function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

/**
 * Convert an unknown error into a structured BuildError.
 *
 * Extracts typed context (error code, token path, file path) from
 * the dispersa error hierarchy so that BuildResult consumers can
 * programmatically react to specific failure modes.
 *
 * @param error - The caught error value
 * @param outputName - Optional output name to prefix the message
 * @returns A structured BuildError with code, paths, and severity
 */
export function toBuildError(error: unknown, outputName?: string): BuildError {
  const rawMessage = getErrorMessage(error)
  const message = outputName ? `Failed to build output '${outputName}': ${rawMessage}` : rawMessage

  if (error instanceof TokenReferenceError) {
    return {
      message,
      code: 'TOKEN_REFERENCE',
      tokenPath: error.referenceName,
      severity: 'error',
      suggestions: error.suggestions.length > 0 ? error.suggestions : undefined,
    }
  }
  if (error instanceof CircularReferenceError) {
    return { message, code: 'CIRCULAR_REFERENCE', tokenPath: error.tokenName, severity: 'error' }
  }
  if (error instanceof ValidationError) {
    return { message, code: 'VALIDATION', severity: 'error' }
  }
  if (error instanceof ColorParseError) {
    return { message, code: 'COLOR_PARSE', severity: 'error' }
  }
  if (error instanceof DimensionFormatError) {
    return { message, code: 'DIMENSION_FORMAT', severity: 'error' }
  }
  if (error instanceof FileOperationError) {
    return { message, code: 'FILE_OPERATION', path: error.filePath, severity: 'error' }
  }
  if (error instanceof ConfigurationError) {
    return { message, code: 'CONFIGURATION', severity: 'error' }
  }
  if (error instanceof BasePermutationError) {
    return { message, code: 'BASE_PERMUTATION', severity: 'error' }
  }
  if (error instanceof ModifierError) {
    return { message, code: 'MODIFIER', severity: 'error' }
  }

  return { message, code: 'UNKNOWN', severity: 'error' }
}

/**
 * Create an error with proper cause chain (Error.cause)
 * Preserves the original error context for better debugging
 *
 * @param message - Error message
 * @param cause - Original error that caused this error
 * @returns Error with cause chain
 */
export function createErrorWithCause(message: string, cause: unknown): Error {
  return new Error(message, { cause })
}

/**
 * Check if value is an Error instance
 *
 * @param value - Value to check
 * @returns True if value is an Error
 */
export function isError(value: unknown): value is Error {
  return value instanceof Error
}
