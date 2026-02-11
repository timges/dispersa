/**
 * @fileoverview Contract tests for Filter interface
 *
 * These tests verify that the Filter interface maintains a stable contract.
 * Filter structure, behavior, and factory functions must remain consistent.
 */

import { beforeEach, describe, expect, it } from 'vitest'
import { byPath, byType, isAlias, isBase, type Filter } from '../../src/filters'
import type { ResolvedToken } from '../../src/lib/tokens/types'

describe('Filter Interface Contract', () => {
  let mockColorToken: ResolvedToken
  let mockShadowToken: ResolvedToken
  let mockAliasToken: ResolvedToken
  let mockBaseToken: ResolvedToken

  beforeEach(() => {
    // Mock color token
    mockColorToken = {
      $value: { colorSpace: 'srgb', components: [1, 0, 0], alpha: 1 },
      $type: 'color',
      path: ['color', 'primary', 'red'],
      name: 'color.primary.red',
      originalValue: { colorSpace: 'srgb', components: [1, 0, 0], alpha: 1 },
    }

    // Mock shadow token
    mockShadowToken = {
      $value: {
        color: { colorSpace: 'srgb', components: [0, 0, 0], alpha: 0.25 },
        offsetX: { value: 0, unit: 'px' },
        offsetY: { value: 4, unit: 'px' },
        blur: { value: 8, unit: 'px' },
      },
      $type: 'shadow',
      path: ['shadow', 'elevation', 'sm'],
      name: 'shadow.elevation.sm',
      originalValue: {
        color: { colorSpace: 'srgb', components: [0, 0, 0], alpha: 0.25 },
        offsetX: { value: 0, unit: 'px' },
        offsetY: { value: 4, unit: 'px' },
        blur: { value: 8, unit: 'px' },
      },
    }

    // Mock alias token
    mockAliasToken = {
      $value: { colorSpace: 'srgb', components: [1, 0, 0], alpha: 1 },
      $type: 'color',
      path: ['color', 'semantic', 'danger'],
      name: 'color.semantic.danger',
      originalValue: '{color.primary.red}',
      _isAlias: true,
    }

    // Mock base token
    mockBaseToken = {
      $value: { value: 16, unit: 'px' },
      $type: 'dimension',
      path: ['spacing', 'base'],
      name: 'spacing.base',
      originalValue: { value: 16, unit: 'px' },
    }
  })

  describe('Filter Type Export', () => {
    it('should export Filter type from public API', () => {
      // Type-only import test - if this compiles, the type is exported
      const testFilter: Filter = {
        filter: () => true,
      }
      expect(testFilter).toBeDefined()
    })
  })

  describe('Built-in Filters Structure', () => {
    const builtInFilters = [
      { name: 'isAlias', filter: isAlias() },
      { name: 'isBase', filter: isBase() },
    ]

    builtInFilters.forEach(({ name, filter }) => {
      describe(name, () => {
        // Note: 'name' property removed from Filter interface
        // Tests now focus on filter function behavior

        it('should have filter property', () => {
          expect(filter).toHaveProperty('filter')
          expect(typeof filter.filter).toBe('function')
        })

        it('should have correct filter function signature', () => {
          // Function should accept a ResolvedToken and return boolean
          expect(filter.filter.length).toBe(1)
          const result = filter.filter(mockColorToken)
          expect(typeof result).toBe('boolean')
        })

        it('should return boolean for various token types', () => {
          expect(typeof filter.filter(mockColorToken)).toBe('boolean')
          expect(typeof filter.filter(mockShadowToken)).toBe('boolean')
          expect(typeof filter.filter(mockAliasToken)).toBe('boolean')
          expect(typeof filter.filter(mockBaseToken)).toBe('boolean')
        })
      })
    })
  })

  describe('Filter Behavior Validation', () => {
    describe('isAlias', () => {
      const aliasFilter = isAlias()

      it('should detect alias tokens', () => {
        expect(aliasFilter.filter(mockAliasToken)).toBe(true)
        expect(aliasFilter.filter(mockBaseToken)).toBe(false)
      })
    })

    describe('isBase', () => {
      const baseFilter = isBase()

      it('should detect base tokens', () => {
        expect(baseFilter.filter(mockBaseToken)).toBe(true)
        expect(baseFilter.filter(mockAliasToken)).toBe(false)
      })
    })
  })

  describe('byType Factory Function', () => {
    it('should exist and be a function', () => {
      expect(typeof byType).toBe('function')
    })

    it('should return a Filter object', () => {
      const filter = byType('color')
      // Note: 'name' property removed from Filter interface
      expect(filter).toHaveProperty('filter')
      expect(typeof filter.filter).toBe('function')
    })

    it('should filter tokens by $type property', () => {
      const colorFilter = byType('color')
      expect(colorFilter.filter(mockColorToken)).toBe(true)
      expect(colorFilter.filter(mockShadowToken)).toBe(false)
      expect(colorFilter.filter(mockBaseToken)).toBe(false)

      const shadowFilter = byType('shadow')
      expect(shadowFilter.filter(mockColorToken)).toBe(false)
      expect(shadowFilter.filter(mockShadowToken)).toBe(true)
      expect(shadowFilter.filter(mockBaseToken)).toBe(false)

      const dimensionFilter = byType('dimension')
      expect(dimensionFilter.filter(mockColorToken)).toBe(false)
      expect(dimensionFilter.filter(mockShadowToken)).toBe(false)
      expect(dimensionFilter.filter(mockBaseToken)).toBe(true)
    })

    it('should work with alias tokens', () => {
      const colorFilter = byType('color')
      expect(colorFilter.filter(mockAliasToken)).toBe(true)
    })
  })

  describe('byPath Factory Function', () => {
    it('should exist and be a function', () => {
      expect(typeof byPath).toBe('function')
    })

    it('should return a Filter object', () => {
      const filter = byPath('color')
      expect(filter).toHaveProperty('filter')
      expect(typeof filter.filter).toBe('function')
    })

    describe('String Pattern', () => {
      describe('Filter Interface Contract Stability', () => {
        it('should maintain consistent structure across all filters', () => {
          const allFilters = [isAlias(), isBase(), byType('color'), byPath('test')]

          allFilters.forEach((filter) => {
            // Required properties
            expect(filter).toHaveProperty('filter')

            // Correct types
            expect(typeof filter.filter).toBe('function')

            // No extra properties on the filter object itself
            const keys = Object.keys(filter)
            expect(keys.sort()).toEqual(['filter'].sort())
          })
        })

        it('should have filter functions that accept exactly one argument', () => {
          const filters = [isAlias(), isBase(), byType('color'), byPath('test')]

          filters.forEach((filter) => {
            expect(filter.filter.length).toBe(1)
          })
        })

        it('should never throw errors when called with valid tokens', () => {
          const filters = [isAlias(), isBase(), byType('color'), byPath('test')]

          const tokens = [mockColorToken, mockShadowToken, mockAliasToken, mockBaseToken]

          filters.forEach((filter) => {
            tokens.forEach((token) => {
              expect(() => filter.filter(token)).not.toThrow()
            })
          })
        })

        it('should always return boolean values', () => {
          const filters = [isAlias(), isBase(), byType('color'), byPath('test')]

          const tokens = [mockColorToken, mockShadowToken, mockAliasToken, mockBaseToken]

          filters.forEach((filter) => {
            tokens.forEach((token) => {
              const result = filter.filter(token)
              expect(typeof result).toBe('boolean')
              expect(result === true || result === false).toBe(true)
            })
          })
        })
      })

      describe('Factory Function Consistency', () => {
        it('should create new filter instances on each call', () => {
          const filter1 = byType('color')
          const filter2 = byType('color')

          // Should be different objects
          expect(filter1).not.toBe(filter2)

          // But have same behavior
          expect(filter1.filter(mockColorToken)).toBe(filter2.filter(mockColorToken))
        })

        it('should accept various token types', () => {
          const types = ['color', 'dimension', 'shadow', 'fontFamily', 'fontWeight', 'duration']

          types.forEach((type) => {
            expect(() => byType(type as any)).not.toThrow()
            const filter = byType(type as any)
            expect(filter).toHaveProperty('filter')
            expect(typeof filter.filter).toBe('function')
          })
        })

        it('should accept various path patterns', () => {
          const patterns = ['color', 'spacing.base', 'color.semantic', /^test/, /pattern$/]

          patterns.forEach((pattern) => {
            expect(() => byPath(pattern)).not.toThrow()
            const filter = byPath(pattern)
            expect(filter).toHaveProperty('filter')
            expect(typeof filter.filter).toBe('function')
          })
        })
      })
    })
  })
})
