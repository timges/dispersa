import { describe, expect, it } from 'vitest'
import { getErrorMessage } from '../../../../src/shared/utils/error-utils'

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
})
