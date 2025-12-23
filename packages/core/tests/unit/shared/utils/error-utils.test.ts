import { describe, expect, it } from 'vitest'
import {
  getErrorMessage,
  createErrorWithCause,
  isError,
} from '../../../../src/shared/utils/error-utils'

describe('Error Utils', () => {
  describe('getErrorMessage', () => {
    it('should extract message from Error instance', () => {
      const error = new Error('Test error message')
      const result = getErrorMessage(error)
      expect(result).toBe('Test error message')
    })

    it('should convert string to string', () => {
      const result = getErrorMessage('String error')
      expect(result).toBe('String error')
    })

    it('should convert number to string', () => {
      const result = getErrorMessage(42)
      expect(result).toBe('42')
    })

    it('should convert boolean to string', () => {
      const result = getErrorMessage(true)
      expect(result).toBe('true')
    })

    it('should convert null to string', () => {
      const result = getErrorMessage(null)
      expect(result).toBe('null')
    })

    it('should convert undefined to string', () => {
      const result = getErrorMessage(undefined)
      expect(result).toBe('undefined')
    })

    it('should convert object to string', () => {
      const result = getErrorMessage({ key: 'value' })
      expect(result).toBe('[object Object]')
    })

    it('should handle custom Error types', () => {
      class CustomError extends Error {
        constructor(message: string) {
          super(message)
          this.name = 'CustomError'
        }
      }
      const error = new CustomError('Custom error message')
      const result = getErrorMessage(error)
      expect(result).toBe('Custom error message')
    })
  })

  describe('createErrorWithCause', () => {
    it('should create Error with cause', () => {
      const originalError = new Error('Original error')
      const error = createErrorWithCause('Wrapped error', originalError)

      expect(error).toBeInstanceOf(Error)
      expect(error.message).toBe('Wrapped error')
      expect(error.cause).toBe(originalError)
    })

    it('should create Error with string cause', () => {
      const error = createErrorWithCause('Wrapped error', 'Original error string')

      expect(error.message).toBe('Wrapped error')
      expect(error.cause).toBe('Original error string')
    })

    it('should create Error with object cause', () => {
      const cause = { code: 'ERR_CODE', details: 'Details' }
      const error = createErrorWithCause('Wrapped error', cause)

      expect(error.cause).toBe(cause)
    })

    it('should create Error with undefined cause', () => {
      const error = createErrorWithCause('Wrapped error', undefined)

      expect(error.message).toBe('Wrapped error')
      expect(error.cause).toBeUndefined()
    })

    it('should preserve cause chain', () => {
      const rootError = new Error('Root error')
      const middleError = createErrorWithCause('Middle error', rootError)
      const topError = createErrorWithCause('Top error', middleError)

      expect(topError.cause).toBe(middleError)
      expect((topError.cause as Error).cause).toBe(rootError)
    })
  })

  describe('isError', () => {
    it('should return true for Error instance', () => {
      const error = new Error('Test error')
      expect(isError(error)).toBe(true)
    })

    it('should return true for custom Error types', () => {
      class CustomError extends Error {}
      const error = new CustomError('Custom error')
      expect(isError(error)).toBe(true)
    })

    it('should return false for string', () => {
      expect(isError('error string')).toBe(false)
    })

    it('should return false for number', () => {
      expect(isError(42)).toBe(false)
    })

    it('should return false for object', () => {
      expect(isError({ message: 'error' })).toBe(false)
    })

    it('should return false for null', () => {
      expect(isError(null)).toBe(false)
    })

    it('should return false for undefined', () => {
      expect(isError(undefined)).toBe(false)
    })

    it('should return false for object with Error-like properties', () => {
      const errorLike = { name: 'Error', message: 'Error message', stack: 'Stack trace' }
      expect(isError(errorLike)).toBe(false)
    })
  })
})
