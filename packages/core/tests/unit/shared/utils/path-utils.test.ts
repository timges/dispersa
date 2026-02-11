import { describe, expect, it } from 'vitest'
import { formatTokenPath } from '../../../../src/shared/utils/path-utils'

describe('Path Utils', () => {
  describe('formatTokenPath', () => {
    it('should format path with parent and name', () => {
      const result = formatTokenPath(['color', 'brand'], 'primary')
      expect(result).toBe('color.brand.primary')
    })

    it('should format path with only name when parent is empty', () => {
      const result = formatTokenPath([], 'token')
      expect(result).toBe('token')
    })

    it('should format path with only parent when name is undefined', () => {
      const result = formatTokenPath(['color', 'brand'], undefined)
      expect(result).toBe('color.brand')
    })

    it('should format path with only parent when name is empty string', () => {
      const result = formatTokenPath(['color', 'brand'], '')
      expect(result).toBe('color.brand')
    })

    it('should handle empty parent and undefined name', () => {
      const result = formatTokenPath([], undefined)
      expect(result).toBe('')
    })

    it('should handle empty parent and empty name', () => {
      const result = formatTokenPath([], '')
      expect(result).toBe('')
    })

    it('should handle single segment parent', () => {
      const result = formatTokenPath(['color'], 'red')
      expect(result).toBe('color.red')
    })

    it('should handle deeply nested path', () => {
      const result = formatTokenPath(['design', 'tokens', 'color', 'brand'], 'primary')
      expect(result).toBe('design.tokens.color.brand.primary')
    })

    it('should preserve exact segment names', () => {
      const result = formatTokenPath(['Color-Brand', 'Primary_Variant'], 'dark-mode')
      expect(result).toBe('Color-Brand.Primary_Variant.dark-mode')
    })
  })
})
