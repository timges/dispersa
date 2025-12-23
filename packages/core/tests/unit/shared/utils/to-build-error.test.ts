/**
 * @fileoverview Unit tests for toBuildError utility
 *
 * Verifies that each error class produces the correct structured BuildError
 * with the appropriate code, paths, and severity.
 */

import { describe, expect, it } from 'vitest'

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
} from '../../../../src/shared/errors/index'
import { toBuildError } from '../../../../src/shared/utils/error-utils'

describe('toBuildError', () => {
  it('should convert TokenReferenceError with token path', () => {
    const error = new TokenReferenceError('color.primary')
    const result = toBuildError(error)

    expect(result.code).toBe('TOKEN_REFERENCE')
    expect(result.tokenPath).toBe('color.primary')
    expect(result.severity).toBe('error')
    expect(result.message).toContain('color.primary')
  })

  it('should include suggestions in TokenReferenceError build error', () => {
    const error = new TokenReferenceError('color.primery', ['color.primary', 'color.primary.dark'])
    const result = toBuildError(error)

    expect(result.code).toBe('TOKEN_REFERENCE')
    expect(result.suggestions).toEqual(['color.primary', 'color.primary.dark'])
    expect(result.message).toContain('Did you mean')
  })

  it('should not include suggestions when none are provided', () => {
    const error = new TokenReferenceError('totally.unknown')
    const result = toBuildError(error)

    expect(result.suggestions).toBeUndefined()
  })

  it('should convert CircularReferenceError with token path', () => {
    const error = new CircularReferenceError('color.bg', ['color.bg', 'color.surface', 'color.bg'])
    const result = toBuildError(error)

    expect(result.code).toBe('CIRCULAR_REFERENCE')
    expect(result.tokenPath).toBe('color.bg')
    expect(result.severity).toBe('error')
    expect(result.message).toContain('color.bg')
  })

  it('should convert ValidationError', () => {
    const error = new ValidationError('Config invalid', [
      { message: 'missing field', path: '/outputs' },
    ])
    const result = toBuildError(error)

    expect(result.code).toBe('VALIDATION')
    expect(result.severity).toBe('error')
    expect(result.message).toContain('Config invalid')
  })

  it('should convert ColorParseError', () => {
    const error = new ColorParseError('not-a-color')
    const result = toBuildError(error)

    expect(result.code).toBe('COLOR_PARSE')
    expect(result.severity).toBe('error')
    expect(result.message).toContain('not-a-color')
  })

  it('should convert DimensionFormatError', () => {
    const error = new DimensionFormatError('bad-dim')
    const result = toBuildError(error)

    expect(result.code).toBe('DIMENSION_FORMAT')
    expect(result.severity).toBe('error')
    expect(result.message).toContain('bad-dim')
  })

  it('should convert FileOperationError with file path', () => {
    const original = new Error('ENOENT')
    const error = new FileOperationError('read', '/tokens/missing.json', original)
    const result = toBuildError(error)

    expect(result.code).toBe('FILE_OPERATION')
    expect(result.path).toBe('/tokens/missing.json')
    expect(result.severity).toBe('error')
  })

  it('should convert ConfigurationError', () => {
    const error = new ConfigurationError('Missing outputs')
    const result = toBuildError(error)

    expect(result.code).toBe('CONFIGURATION')
    expect(result.severity).toBe('error')
    expect(result.message).toContain('Missing outputs')
  })

  it('should convert BasePermutationError', () => {
    const error = new BasePermutationError()
    const result = toBuildError(error)

    expect(result.code).toBe('BASE_PERMUTATION')
    expect(result.severity).toBe('error')
  })

  it('should convert ModifierError', () => {
    const error = new ModifierError('theme', 'neon')
    const result = toBuildError(error)

    expect(result.code).toBe('MODIFIER')
    expect(result.severity).toBe('error')
    expect(result.message).toContain('theme')
  })

  it('should include available values in ModifierError message', () => {
    const error = new ModifierError('theme', 'neon', ['light', 'dark', 'high-contrast'])
    const result = toBuildError(error)

    expect(result.code).toBe('MODIFIER')
    expect(result.message).toContain('Available: light, dark, high-contrast')
  })

  it('should list available modifiers when modifier is unknown', () => {
    const error = new ModifierError('thme', undefined, ['theme', 'platform'])
    const result = toBuildError(error)

    expect(result.code).toBe('MODIFIER')
    expect(result.message).toContain('Available: theme, platform')
  })

  it('should handle unknown error types with UNKNOWN code', () => {
    const error = new Error('Something unexpected')
    const result = toBuildError(error)

    expect(result.code).toBe('UNKNOWN')
    expect(result.severity).toBe('error')
    expect(result.message).toBe('Something unexpected')
  })

  it('should handle non-Error values', () => {
    const result = toBuildError('string error')

    expect(result.code).toBe('UNKNOWN')
    expect(result.severity).toBe('error')
    expect(result.message).toBe('string error')
  })

  it('should prefix message with output name when provided', () => {
    const error = new ConfigurationError('Bad config')
    const result = toBuildError(error, 'css-output')

    expect(result.message).toBe("Failed to build output 'css-output': Bad config")
    expect(result.code).toBe('CONFIGURATION')
  })

  it('should not prefix message when outputName is undefined', () => {
    const error = new ConfigurationError('Bad config')
    const result = toBuildError(error)

    expect(result.message).toBe('Bad config')
  })
})
