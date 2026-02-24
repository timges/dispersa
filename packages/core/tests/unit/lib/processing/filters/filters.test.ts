import { describe, expect, it } from 'vitest'
import { byPath, byType, isAlias, isBase, type Filter } from '../../../../../src/filters'
import type { ResolvedToken } from '../../../../../src/index'

describe('Filter Integration Tests', () => {
  describe('Built-in Filters', () => {
    it('should filter tokens by type using byType factory', async () => {
      const colorFilter = byType('color')
      const dimensionFilter = byType('dimension')

      const testTokens = {
        'color.primary': {
          $type: 'color' as const,
          $value: { colorSpace: 'srgb', components: [0, 0.27, 0.55] },
          path: ['color', 'primary'],
        },
        'spacing.base': {
          $type: 'dimension' as const,
          $value: { value: 16, unit: 'px' },
          path: ['spacing', 'base'],
        },
        'color.secondary': {
          $type: 'color' as const,
          $value: { colorSpace: 'srgb', components: [0, 1, 0] },
          path: ['color', 'secondary'],
        },
      }

      // Test color filter directly
      expect(colorFilter.filter(testTokens['color.primary'])).toBe(true)
      expect(colorFilter.filter(testTokens['spacing.base'])).toBe(false)
      expect(colorFilter.filter(testTokens['color.secondary'])).toBe(true)

      // Test dimension filter directly
      expect(dimensionFilter.filter(testTokens['color.primary'])).toBe(false)
      expect(dimensionFilter.filter(testTokens['spacing.base'])).toBe(true)
    })
  })

  describe('Alias/Base Filters', () => {
    it('should filter only alias tokens with layer:alias', () => {
      const filter = isAlias()

      const aliasToken: ResolvedToken = {
        $type: 'color',
        $value: { colorSpace: 'srgb', components: [0, 0.27, 0.55] },
        originalValue: '{color.red.500}',
        path: ['color', 'semantic', 'primary'],
        name: 'color.semantic.primary',
      }

      const baseToken: ResolvedToken = {
        $type: 'color',
        $value: { colorSpace: 'srgb', components: [0, 0.27, 0.55] },
        originalValue: '#ff0000',
        path: ['color', 'red', '500'],
        name: 'color.red.500',
      }

      const tokenWithoutMetadata: ResolvedToken = {
        $type: 'color',
        $value: { colorSpace: 'srgb', components: [0, 1, 0] },
        originalValue: '#00ff00',
        path: ['color', 'green', '500'],
        name: 'color.green.500',
      }

      expect(filter.filter(aliasToken)).toBe(true)
      expect(filter.filter(baseToken)).toBe(false)
      expect(filter.filter(tokenWithoutMetadata)).toBe(false)
    })

    it('should filter only base tokens with layer:base', () => {
      const filter = isBase()

      const aliasToken: ResolvedToken = {
        $type: 'color',
        $value: { colorSpace: 'srgb', components: [0, 0.27, 0.55] },
        originalValue: '{color.red.500}',
        path: ['color', 'semantic', 'primary'],
        name: 'color.semantic.primary',
      }

      const baseToken: ResolvedToken = {
        $type: 'color',
        $value: { colorSpace: 'srgb', components: [0, 0.27, 0.55] },
        originalValue: '#ff0000',
        path: ['color', 'red', '500'],
        name: 'color.red.500',
      }

      const tokenWithoutMetadata: ResolvedToken = {
        $type: 'color',
        $value: { colorSpace: 'srgb', components: [0, 1, 0] },
        originalValue: '#00ff00',
        path: ['color', 'green', '500'],
        name: 'color.green.500',
      }

      expect(filter.filter(aliasToken)).toBe(false)
      expect(filter.filter(baseToken)).toBe(true)
      // Tokens without _isAlias metadata are treated as base tokens
      expect(filter.filter(tokenWithoutMetadata)).toBe(true)
    })

    it('should correctly separate alias and base tokens', () => {
      const aliasFilter = isAlias()
      const baseFilter = isBase()

      const tokens: ResolvedToken[] = [
        {
          $type: 'color',
          $value: { colorSpace: 'srgb', components: [0, 0.27, 0.55] },
          originalValue: '#ff0000',
          path: ['color', 'red', '500'],
          name: 'color.red.500',
        },
        {
          $type: 'color',
          $value: { colorSpace: 'srgb', components: [0, 0.27, 0.55] },
          originalValue: '{color.red.500}',
          path: ['color', 'semantic', 'error'],
          name: 'color.semantic.error',
        },
        {
          $type: 'color',
          $value: { colorSpace: 'srgb', components: [0, 1, 0] },
          originalValue: '#00ff00',
          path: ['color', 'green', '500'],
          name: 'color.green.500',
        },
        {
          $type: 'color',
          $value: { colorSpace: 'srgb', components: [0, 1, 0] },
          originalValue: '{color.green.500}',
          path: ['color', 'semantic', 'success'],
          name: 'color.semantic.success',
        },
      ]

      const aliasTokens = tokens.filter((token) => aliasFilter.filter(token))
      const baseTokens = tokens.filter((token) => baseFilter.filter(token))

      expect(aliasTokens).toHaveLength(2)
      expect(baseTokens).toHaveLength(2)
      expect(aliasTokens[0].path).toEqual(['color', 'semantic', 'error'])
      expect(aliasTokens[1].path).toEqual(['color', 'semantic', 'success'])
      expect(baseTokens[0].path).toEqual(['color', 'red', '500'])
      expect(baseTokens[1].path).toEqual(['color', 'green', '500'])
    })
  })

  describe('Filter Factory Functions', () => {
    it('should create filter by type using byType factory', async () => {
      const shadowFilter = byType('shadow')

      const shadowToken: ResolvedToken = {
        $type: 'shadow',
        $value: {
          color: '#000000',
          offsetX: '0px',
          offsetY: '4px',
          blur: '8px',
          spread: '0px',
        },
        path: ['shadow', 'card'],
      }

      const colorToken: ResolvedToken = {
        $type: 'color',
        $value: { colorSpace: 'srgb', components: [0, 0.27, 0.55] },
        path: ['color', 'primary'],
      }

      expect(shadowFilter.filter(shadowToken)).toBe(true)
      expect(shadowFilter.filter(colorToken)).toBe(false)
    })

    it('should create filter by path using byPath factory', async () => {
      // String pattern
      const spacingFilter = byPath('spacing')

      const spacingToken: ResolvedToken = {
        $type: 'dimension',
        $value: { value: 16, unit: 'px' },
        path: ['spacing', 'base'],
      }

      const colorToken: ResolvedToken = {
        $type: 'color',
        $value: { colorSpace: 'srgb', components: [0, 0.27, 0.55] },
        path: ['color', 'primary'],
      }

      expect(spacingFilter.filter(spacingToken)).toBe(true)
      expect(spacingFilter.filter(colorToken)).toBe(false)

      // Regex pattern
      const semanticFilter = byPath(/\.semantic/)

      const semanticToken: ResolvedToken = {
        $type: 'color',
        $value: { colorSpace: 'srgb', components: [0, 0.27, 0.55] },
        path: ['color', 'semantic', 'error'],
      }

      expect(semanticFilter.filter(semanticToken)).toBe(true)
      expect(semanticFilter.filter(colorToken)).toBe(false)
    })
  })

  describe('Multiple Filters in Sequence', () => {
    it('should apply multiple filters with AND logic', () => {
      // Create filters
      const colorFilter: Filter = {
        name: 'colors',
        filter: (token) => token.$type === 'color',
      }

      const primaryFilter: Filter = {
        name: 'primary',
        filter: (token) => token.path.includes('primary'),
      }

      const tokens: ResolvedToken[] = [
        {
          $type: 'color',
          $value: { colorSpace: 'srgb', components: [0, 0.27, 0.55] },
          path: ['color', 'primary'],
        },
        {
          $type: 'color',
          $value: { colorSpace: 'srgb', components: [0, 1, 0] },
          path: ['color', 'secondary'],
        },
        {
          $type: 'dimension',
          $value: { value: 16, unit: 'px' },
          path: ['spacing', 'primary'],
        },
      ]

      // Both filters must pass - using the filters directly
      const filtered = tokens.filter((token) => {
        return colorFilter.filter(token) && primaryFilter.filter(token)
      })

      expect(filtered).toHaveLength(1)
      expect(filtered[0].path).toEqual(['color', 'primary'])
    })
  })

  describe('Edge Cases', () => {
    it('should handle tokens with single path segment', async () => {
      const filter = byPath('color')

      const singleSegmentToken: ResolvedToken = {
        $type: 'color',
        $value: { colorSpace: 'srgb', components: [0, 0.27, 0.55] },
        path: ['color'],
      }

      expect(filter.filter(singleSegmentToken)).toBe(true)
    })

    it('should return empty result when all tokens are filtered out', () => {
      const neverMatchFilter: Filter = {
        name: 'never',
        filter: () => false,
      }

      const tokens: ResolvedToken[] = [
        {
          $type: 'color',
          $value: { colorSpace: 'srgb', components: [0, 0.27, 0.55] },
          path: ['color', 'primary'],
        },
        {
          $type: 'dimension',
          $value: { value: 16, unit: 'px' },
          path: ['spacing', 'base'],
        },
      ]

      const filtered = tokens.filter((token) => neverMatchFilter.filter(token))

      expect(filtered).toHaveLength(0)
    })
  })
})
