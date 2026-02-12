import { describe, expect, it } from 'vitest'
import { applyTransforms, applyFilters } from '../../../../src/processing/token-modifier'
import type { Transform } from '../../../../src/processing/processors/transforms/types'
import type { Filter } from '../../../../src/processing/processors/filters/types'
import type { ResolvedTokens, ResolvedToken } from '../../../../src/tokens/types'

describe('Token Modifier', () => {
  const mockTokens: ResolvedTokens = {
    'color.red': {
      $value: '#ff0000',
      $type: 'color',
      path: ['color', 'red'],
      name: 'color.red',
      originalValue: '#ff0000',
    },
    'color.blue': {
      $value: '#0000ff',
      $type: 'color',
      path: ['color', 'blue'],
      name: 'color.blue',
      originalValue: '#0000ff',
    },
    'spacing.small': {
      $value: '8px',
      $type: 'dimension',
      path: ['spacing', 'small'],
      name: 'spacing.small',
      originalValue: '8px',
    },
  }

  describe('applyTransforms', () => {
    it('should apply transform to all tokens', () => {
      const uppercaseTransform: Transform = {
        name: 'uppercase',
        transform: (token) => ({
          ...token,
          $value: String(token.$value).toUpperCase(),
        }),
      }

      const result = applyTransforms(mockTokens, [uppercaseTransform])

      expect(result['color.red'].$value).toBe('#FF0000')
      expect(result['color.blue'].$value).toBe('#0000FF')
      expect(result['spacing.small'].$value).toBe('8PX')
    })

    it('should apply multiple transforms in sequence', () => {
      const addPrefixTransform: Transform = {
        name: 'add-prefix',
        transform: (token) => ({
          ...token,
          $value: `prefix-${token.$value}`,
        }),
      }

      const addSuffixTransform: Transform = {
        name: 'add-suffix',
        transform: (token) => ({
          ...token,
          $value: `${token.$value}-suffix`,
        }),
      }

      const result = applyTransforms(mockTokens, [addPrefixTransform, addSuffixTransform])

      expect(result['color.red'].$value).toBe('prefix-#ff0000-suffix')
    })

    it('should apply transform only to tokens matching matcher', () => {
      const colorTransform: Transform = {
        name: 'color-only',
        matcher: (token) => token.$type === 'color',
        transform: (token) => ({
          ...token,
          $value: 'transformed',
        }),
      }

      const result = applyTransforms(mockTokens, [colorTransform])

      expect(result['color.red'].$value).toBe('transformed')
      expect(result['color.blue'].$value).toBe('transformed')
      expect(result['spacing.small'].$value).toBe('8px') // Not transformed
    })

    it('should not apply transform when matcher returns false', () => {
      const dimensionTransform: Transform = {
        name: 'dimension-only',
        matcher: (token) => token.$type === 'dimension',
        transform: (token) => ({
          ...token,
          $value: '16px',
        }),
      }

      const result = applyTransforms(mockTokens, [dimensionTransform])

      expect(result['color.red'].$value).toBe('#ff0000') // Not transformed
      expect(result['spacing.small'].$value).toBe('16px') // Transformed
    })

    it('should handle empty transform list', () => {
      const result = applyTransforms(mockTokens, [])

      expect(result).toEqual(mockTokens)
    })

    it('should handle empty token object', () => {
      const result = applyTransforms({}, [{ name: 'test', transform: (token) => token }])

      expect(result).toEqual({})
    })

    it('should pass transformed token to next transform', () => {
      let firstTransformCalled = false
      let secondTransformValue: string | undefined

      const firstTransform: Transform = {
        name: 'first',
        transform: (token) => {
          firstTransformCalled = true
          return {
            ...token,
            $value: 'first',
          }
        },
      }

      const secondTransform: Transform = {
        name: 'second',
        transform: (token) => {
          secondTransformValue = token.$value as string
          return token
        },
      }

      applyTransforms(mockTokens, [firstTransform, secondTransform])

      expect(firstTransformCalled).toBe(true)
      expect(secondTransformValue).toBe('first')
    })

    it('should preserve token properties not modified by transform', () => {
      const valueTransform: Transform = {
        name: 'value-only',
        transform: (token) => ({
          ...token,
          $value: 'new-value',
        }),
      }

      const result = applyTransforms(mockTokens, [valueTransform])

      expect(result['color.red'].path).toEqual(['color', 'red'])
      expect(result['color.red'].name).toBe('color.red')
      expect(result['color.red'].$type).toBe('color')
    })
  })

  describe('applyFilters', () => {
    it('should filter tokens based on filter function', () => {
      const colorFilter: Filter = {
        name: 'color-only',
        filter: (token) => token.$type === 'color',
      }

      const result = applyFilters(mockTokens, [colorFilter])

      expect(result).toHaveProperty('color.red')
      expect(result).toHaveProperty('color.blue')
      expect(result).not.toHaveProperty('spacing.small')
    })

    it('should apply multiple filters (AND logic)', () => {
      const colorFilter: Filter = {
        name: 'color-only',
        filter: (token) => token.$type === 'color',
      }

      const redFilter: Filter = {
        name: 'red-only',
        filter: (token) => token.name.includes('red'),
      }

      const result = applyFilters(mockTokens, [colorFilter, redFilter])

      expect(result).toHaveProperty('color.red')
      expect(result).not.toHaveProperty('color.blue')
      expect(result).not.toHaveProperty('spacing.small')
    })

    it('should return empty object when no tokens pass filters', () => {
      const neverPassFilter: Filter = {
        name: 'never-pass',
        filter: () => false,
      }

      const result = applyFilters(mockTokens, [neverPassFilter])

      expect(result).toEqual({})
    })

    it('should return all tokens when filter always passes', () => {
      const alwaysPassFilter: Filter = {
        name: 'always-pass',
        filter: () => true,
      }

      const result = applyFilters(mockTokens, [alwaysPassFilter])

      expect(result).toEqual(mockTokens)
    })

    it('should handle empty filter list', () => {
      const result = applyFilters(mockTokens, [])

      expect(result).toEqual(mockTokens)
    })

    it('should handle empty token object', () => {
      const result = applyFilters({}, [{ name: 'test', filter: () => true }])

      expect(result).toEqual({})
    })

    it('should short-circuit on first failing filter', () => {
      let secondFilterCalled = false

      const firstFilter: Filter = {
        name: 'first',
        filter: () => false,
      }

      const secondFilter: Filter = {
        name: 'second',
        filter: () => {
          secondFilterCalled = true
          return true
        },
      }

      applyFilters(mockTokens, [firstFilter, secondFilter])

      expect(secondFilterCalled).toBe(false)
    })

    it('should filter based on token path', () => {
      const pathFilter: Filter = {
        name: 'color-path',
        filter: (token) => token.path[0] === 'color',
      }

      const result = applyFilters(mockTokens, [pathFilter])

      expect(result).toHaveProperty('color.red')
      expect(result).toHaveProperty('color.blue')
      expect(result).not.toHaveProperty('spacing.small')
    })

    it('should filter based on custom token properties', () => {
      const aliasTokens: ResolvedTokens = {
        'alias.token': {
          ...mockTokens['color.red'],
          name: 'alias.token',
          _isAlias: true,
        },
        'base.token': {
          ...mockTokens['color.blue'],
          name: 'base.token',
          _isAlias: false,
        },
      }

      const aliasFilter: Filter = {
        name: 'alias-only',
        filter: (token) => (token as any)._isAlias === true,
      }

      const result = applyFilters(aliasTokens, [aliasFilter])

      expect(result).toHaveProperty('alias.token')
      expect(result).not.toHaveProperty('base.token')
    })
  })

  describe('Combined transforms and filters', () => {
    it('should work correctly when used together', () => {
      // First filter to only colors
      const colorFilter: Filter = {
        name: 'color-only',
        filter: (token) => token.$type === 'color',
      }

      const filtered = applyFilters(mockTokens, [colorFilter])

      // Then transform the filtered tokens
      const uppercaseTransform: Transform = {
        name: 'uppercase',
        transform: (token) => ({
          ...token,
          $value: String(token.$value).toUpperCase(),
        }),
      }

      const result = applyTransforms(filtered, [uppercaseTransform])

      expect(result).toHaveProperty('color.red')
      expect(result).toHaveProperty('color.blue')
      expect(result).not.toHaveProperty('spacing.small')
      expect(result['color.red'].$value).toBe('#FF0000')
    })
  })
})
