import { describe, expect, it } from 'vitest'
import { formatTokenPath, joinPath } from '../../../../src/shared/utils/path-utils'

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

  describe('joinPath', () => {
    it('should join path segments with dots', () => {
      const result = joinPath(['color', 'brand', 'primary'])
      expect(result).toBe('color.brand.primary')
    })

    it('should handle single segment', () => {
      const result = joinPath(['token'])
      expect(result).toBe('token')
    })

    it('should handle empty array', () => {
      const result = joinPath([])
      expect(result).toBe('')
    })

    it('should join deeply nested segments', () => {
      const result = joinPath(['a', 'b', 'c', 'd', 'e'])
      expect(result).toBe('a.b.c.d.e')
    })

    it('should preserve segment names exactly', () => {
      const result = joinPath(['Segment-1', 'Segment_2', 'segment3'])
      expect(result).toBe('Segment-1.Segment_2.segment3')
    })

    it('should handle segments with special characters', () => {
      const result = joinPath(['segment@1', 'segment#2'])
      expect(result).toBe('segment@1.segment#2')
    })
  })

  describe('formatTokenPath vs joinPath', () => {
    it('formatTokenPath should match joinPath when name is undefined', () => {
      const segments = ['color', 'brand', 'primary']
      const formatted = formatTokenPath(segments, undefined)
      const joined = joinPath(segments)
      expect(formatted).toBe(joined)
    })

    it('formatTokenPath should add name to joined path', () => {
      const parent = ['color', 'brand']
      const name = 'primary'
      const formatted = formatTokenPath(parent, name)
      const expected = joinPath([...parent, name])
      expect(formatted).toBe(expected)
    })
  })
})
