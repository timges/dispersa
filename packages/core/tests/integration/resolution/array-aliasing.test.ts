/**
 * @fileoverview Tests for array aliasing in composite types
 * Per DTCG spec section 9.1, arrays in composite types may mix references and explicit values.
 * References resolve to single values (no flattening).
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { AliasResolver } from '../../../src/resolution/alias-resolver'
import type { ResolvedTokens } from '../../../src/tokens/types'

describe('Array Aliasing in Composite Types', () => {
  let aliasResolver: AliasResolver

  beforeEach(() => {
    aliasResolver = new AliasResolver()
  })

  describe('Shadow Tokens with Mixed Arrays', () => {
    it('should resolve arrays with both references and explicit values', () => {
      const tokens: ResolvedTokens = {
        'base.shadow': {
          $type: 'shadow',
          $value: {
            color: { colorSpace: 'srgb', components: [0, 0, 0], alpha: 0.1 },
            offsetX: { value: 0, unit: 'px' },
            offsetY: { value: 2, unit: 'px' },
            blur: { value: 4, unit: 'px' },
            spread: { value: 0, unit: 'px' },
          },
          path: ['base', 'shadow'],
          name: 'base.shadow',
          originalValue: {
            color: { colorSpace: 'srgb', components: [0, 0, 0], alpha: 0.1 },
            offsetX: { value: 0, unit: 'px' },
            offsetY: { value: 2, unit: 'px' },
            blur: { value: 4, unit: 'px' },
            spread: { value: 0, unit: 'px' },
          },
        },
        'brand.accent': {
          $type: 'color',
          $value: { colorSpace: 'srgb', components: [0.2, 0.4, 0.9] },
          path: ['brand', 'accent'],
          name: 'brand.accent',
          originalValue: { colorSpace: 'srgb', components: [0.2, 0.4, 0.9] },
        },
        // Layered shadow with mixed array: reference + explicit value
        'layered.shadow': {
          $type: 'shadow',
          $value: [
            '{base.shadow}', // Reference to another shadow
            {
              // Explicit shadow object
              color: '{brand.accent}', // Reference within the explicit object
              offsetX: { value: 4, unit: 'px' },
              offsetY: { value: 4, unit: 'px' },
              blur: { value: 8, unit: 'px' },
              spread: { value: 0, unit: 'px' },
            },
          ],
          path: ['layered', 'shadow'],
          name: 'layered.shadow',
          originalValue: [
            '{base.shadow}',
            {
              color: '{brand.accent}',
              offsetX: { value: 4, unit: 'px' },
              offsetY: { value: 4, unit: 'px' },
              blur: { value: 8, unit: 'px' },
              spread: { value: 0, unit: 'px' },
            },
          ],
        },
      }

      const resolved = aliasResolver.resolve(tokens)
      const layeredShadow = resolved['layered.shadow'].$value as Array<Record<string, unknown>>

      expect(Array.isArray(layeredShadow)).toBe(true)
      expect(layeredShadow.length).toBe(2)

      // First element should be the resolved base.shadow
      expect(layeredShadow[0]).toEqual({
        color: { colorSpace: 'srgb', components: [0, 0, 0], alpha: 0.1 },
        offsetX: { value: 0, unit: 'px' },
        offsetY: { value: 2, unit: 'px' },
        blur: { value: 4, unit: 'px' },
        spread: { value: 0, unit: 'px' },
      })

      // Second element should have the brand.accent color resolved
      expect(layeredShadow[1]).toEqual({
        color: { colorSpace: 'srgb', components: [0.2, 0.4, 0.9] },
        offsetX: { value: 4, unit: 'px' },
        offsetY: { value: 4, unit: 'px' },
        blur: { value: 8, unit: 'px' },
        spread: { value: 0, unit: 'px' },
      })
    })

    it('should resolve multiple references in array', () => {
      const tokens: ResolvedTokens = {
        'shadow.sm': {
          $type: 'shadow',
          $value: {
            color: { colorSpace: 'srgb', components: [0, 0, 0], alpha: 0.05 },
            offsetX: { value: 0, unit: 'px' },
            offsetY: { value: 1, unit: 'px' },
            blur: { value: 2, unit: 'px' },
          },
          path: ['shadow', 'sm'],
          name: 'shadow.sm',
          originalValue: {
            color: { colorSpace: 'srgb', components: [0, 0, 0], alpha: 0.05 },
            offsetX: { value: 0, unit: 'px' },
            offsetY: { value: 1, unit: 'px' },
            blur: { value: 2, unit: 'px' },
          },
        },
        'shadow.md': {
          $type: 'shadow',
          $value: {
            color: { colorSpace: 'srgb', components: [0, 0, 0], alpha: 0.1 },
            offsetX: { value: 0, unit: 'px' },
            offsetY: { value: 4, unit: 'px' },
            blur: { value: 6, unit: 'px' },
          },
          path: ['shadow', 'md'],
          name: 'shadow.md',
          originalValue: {
            color: { colorSpace: 'srgb', components: [0, 0, 0], alpha: 0.1 },
            offsetX: { value: 0, unit: 'px' },
            offsetY: { value: 4, unit: 'px' },
            blur: { value: 6, unit: 'px' },
          },
        },
        'shadow.lg': {
          $type: 'shadow',
          $value: {
            color: { colorSpace: 'srgb', components: [0, 0, 0], alpha: 0.15 },
            offsetX: { value: 0, unit: 'px' },
            offsetY: { value: 10, unit: 'px' },
            blur: { value: 15, unit: 'px' },
          },
          path: ['shadow', 'lg'],
          name: 'shadow.lg',
          originalValue: {
            color: { colorSpace: 'srgb', components: [0, 0, 0], alpha: 0.15 },
            offsetX: { value: 0, unit: 'px' },
            offsetY: { value: 10, unit: 'px' },
            blur: { value: 15, unit: 'px' },
          },
        },
        // All references - no explicit values
        'shadow.combined': {
          $type: 'shadow',
          $value: ['{shadow.sm}', '{shadow.md}', '{shadow.lg}'],
          path: ['shadow', 'combined'],
          name: 'shadow.combined',
          originalValue: ['{shadow.sm}', '{shadow.md}', '{shadow.lg}'],
        },
      }

      const resolved = aliasResolver.resolve(tokens)
      const combined = resolved['shadow.combined'].$value as Array<Record<string, unknown>>

      expect(Array.isArray(combined)).toBe(true)
      expect(combined.length).toBe(3)

      // Each element should resolve to a single shadow value
      expect(combined[0]).toEqual({
        color: { colorSpace: 'srgb', components: [0, 0, 0], alpha: 0.05 },
        offsetX: { value: 0, unit: 'px' },
        offsetY: { value: 1, unit: 'px' },
        blur: { value: 2, unit: 'px' },
      })

      expect(combined[1]).toEqual({
        color: { colorSpace: 'srgb', components: [0, 0, 0], alpha: 0.1 },
        offsetX: { value: 0, unit: 'px' },
        offsetY: { value: 4, unit: 'px' },
        blur: { value: 6, unit: 'px' },
      })

      expect(combined[2]).toEqual({
        color: { colorSpace: 'srgb', components: [0, 0, 0], alpha: 0.15 },
        offsetX: { value: 0, unit: 'px' },
        offsetY: { value: 10, unit: 'px' },
        blur: { value: 15, unit: 'px' },
      })
    })
  })

  describe('FontFamily Tokens with Mixed References', () => {
    it('should resolve arrays with mixed references and literal values', () => {
      const tokens: ResolvedTokens = {
        'font.brand': {
          $type: 'fontFamily',
          $value: 'Inter',
          path: ['font', 'brand'],
          name: 'font.brand',
          originalValue: 'Inter',
        },
        'font.fallback': {
          $type: 'fontFamily',
          $value: 'system-ui',
          path: ['font', 'fallback'],
          name: 'font.fallback',
          originalValue: 'system-ui',
        },
        // Mixed array: references and literals
        'font.stack': {
          $type: 'fontFamily',
          $value: ['{font.brand}', '{font.fallback}', 'sans-serif'],
          path: ['font', 'stack'],
          name: 'font.stack',
          originalValue: ['{font.brand}', '{font.fallback}', 'sans-serif'],
        },
      }

      const resolved = aliasResolver.resolve(tokens)
      const stack = resolved['font.stack'].$value

      expect(Array.isArray(stack)).toBe(true)
      expect(stack).toEqual(['Inter', 'system-ui', 'sans-serif'])
    })
  })

  describe('No Array Flattening', () => {
    it('should NOT flatten arrays when referenced', () => {
      const tokens: ResolvedTokens = {
        'base.fonts': {
          $type: 'fontFamily',
          $value: ['Arial', 'Helvetica'],
          path: ['base', 'fonts'],
          name: 'base.fonts',
          originalValue: ['Arial', 'Helvetica'],
        },
        // Reference to an array should treat the entire array as a single element
        'semantic.stack': {
          $type: 'fontFamily',
          $value: ['{base.fonts}', 'sans-serif'],
          path: ['semantic', 'stack'],
          name: 'semantic.stack',
          originalValue: ['{base.fonts}', 'sans-serif'],
        },
      }

      const resolved = aliasResolver.resolve(tokens)
      const stack = resolved['semantic.stack'].$value

      // The array reference should resolve to the array itself, not flatten
      expect(Array.isArray(stack)).toBe(true)
      expect(stack).toEqual([['Arial', 'Helvetica'], 'sans-serif'])
    })
  })

  describe('Nested Object References in Arrays', () => {
    it('should resolve nested references within array elements', () => {
      const tokens: ResolvedTokens = {
        'color.primary': {
          $type: 'color',
          $value: { colorSpace: 'srgb', components: [0, 0.5, 1] },
          path: ['color', 'primary'],
          name: 'color.primary',
          originalValue: { colorSpace: 'srgb', components: [0, 0.5, 1] },
        },
        'dimension.sm': {
          $type: 'dimension',
          $value: { value: 2, unit: 'px' },
          path: ['dimension', 'sm'],
          name: 'dimension.sm',
          originalValue: { value: 2, unit: 'px' },
        },
        'dimension.md': {
          $type: 'dimension',
          $value: { value: 4, unit: 'px' },
          path: ['dimension', 'md'],
          name: 'dimension.md',
          originalValue: { value: 4, unit: 'px' },
        },
        // Array with nested references in object properties
        'shadow.variations': {
          $type: 'shadow',
          $value: [
            {
              color: '{color.primary}',
              offsetX: '{dimension.sm}',
              offsetY: '{dimension.sm}',
              blur: '{dimension.md}',
            },
            {
              color: '{color.primary}',
              offsetX: '{dimension.md}',
              offsetY: '{dimension.md}',
              blur: { value: 8, unit: 'px' },
            },
          ],
          path: ['shadow', 'variations'],
          name: 'shadow.variations',
          originalValue: [
            {
              color: '{color.primary}',
              offsetX: '{dimension.sm}',
              offsetY: '{dimension.sm}',
              blur: '{dimension.md}',
            },
            {
              color: '{color.primary}',
              offsetX: '{dimension.md}',
              offsetY: '{dimension.md}',
              blur: { value: 8, unit: 'px' },
            },
          ],
        },
      }

      const resolved = aliasResolver.resolve(tokens)
      const variations = resolved['shadow.variations'].$value as Array<Record<string, unknown>>

      expect(Array.isArray(variations)).toBe(true)
      expect(variations.length).toBe(2)

      // First variation with all references resolved
      expect(variations[0]).toEqual({
        color: { colorSpace: 'srgb', components: [0, 0.5, 1] },
        offsetX: { value: 2, unit: 'px' },
        offsetY: { value: 2, unit: 'px' },
        blur: { value: 4, unit: 'px' },
      })

      // Second variation with mixed references and literal
      expect(variations[1]).toEqual({
        color: { colorSpace: 'srgb', components: [0, 0.5, 1] },
        offsetX: { value: 4, unit: 'px' },
        offsetY: { value: 4, unit: 'px' },
        blur: { value: 8, unit: 'px' },
      })
    })
  })

  describe('Circular Reference Detection in Arrays', () => {
    it('should detect circular references in array elements', () => {
      const tokens: ResolvedTokens = {
        'shadow.a': {
          $type: 'shadow',
          $value: ['{shadow.b}'],
          path: ['shadow', 'a'],
          name: 'shadow.a',
          originalValue: ['{shadow.b}'],
        },
        'shadow.b': {
          $type: 'shadow',
          $value: ['{shadow.a}'],
          path: ['shadow', 'b'],
          name: 'shadow.b',
          originalValue: ['{shadow.a}'],
        },
      }

      expect(() => aliasResolver.resolve(tokens)).toThrow(/circular/i)
    })
  })

  describe('Complex Composition', () => {
    it('should handle deeply nested array compositions', () => {
      const tokens: ResolvedTokens = {
        'color.black': {
          $type: 'color',
          $value: { colorSpace: 'srgb', components: [0, 0, 0] },
          path: ['color', 'black'],
          name: 'color.black',
          originalValue: { colorSpace: 'srgb', components: [0, 0, 0] },
        },
        'shadow.layer1': {
          $type: 'shadow',
          $value: {
            color: '{color.black}',
            offsetX: { value: 0, unit: 'px' },
            offsetY: { value: 1, unit: 'px' },
            blur: { value: 2, unit: 'px' },
          },
          path: ['shadow', 'layer1'],
          name: 'shadow.layer1',
          originalValue: {
            color: '{color.black}',
            offsetX: { value: 0, unit: 'px' },
            offsetY: { value: 1, unit: 'px' },
            blur: { value: 2, unit: 'px' },
          },
        },
        'shadow.layer2': {
          $type: 'shadow',
          $value: {
            color: '{color.black}',
            offsetX: { value: 0, unit: 'px' },
            offsetY: { value: 4, unit: 'px' },
            blur: { value: 8, unit: 'px' },
          },
          path: ['shadow', 'layer2'],
          name: 'shadow.layer2',
          originalValue: {
            color: '{color.black}',
            offsetX: { value: 0, unit: 'px' },
            offsetY: { value: 4, unit: 'px' },
            blur: { value: 8, unit: 'px' },
          },
        },
        // Reference to array of references
        'shadow.composite': {
          $type: 'shadow',
          $value: ['{shadow.layer1}', '{shadow.layer2}'],
          path: ['shadow', 'composite'],
          name: 'shadow.composite',
          originalValue: ['{shadow.layer1}', '{shadow.layer2}'],
        },
        // Another level of reference
        'shadow.final': {
          $type: 'shadow',
          $value: '{shadow.composite}',
          path: ['shadow', 'final'],
          name: 'shadow.final',
          originalValue: '{shadow.composite}',
        },
      }

      const resolved = aliasResolver.resolve(tokens)
      const final = resolved['shadow.final'].$value as Array<Record<string, unknown>>

      expect(Array.isArray(final)).toBe(true)
      expect(final.length).toBe(2)

      // Both layers should be fully resolved
      expect(final[0]).toEqual({
        color: { colorSpace: 'srgb', components: [0, 0, 0] },
        offsetX: { value: 0, unit: 'px' },
        offsetY: { value: 1, unit: 'px' },
        blur: { value: 2, unit: 'px' },
      })

      expect(final[1]).toEqual({
        color: { colorSpace: 'srgb', components: [0, 0, 0] },
        offsetX: { value: 0, unit: 'px' },
        offsetY: { value: 4, unit: 'px' },
        blur: { value: 8, unit: 'px' },
      })
    })
  })

  describe('Edge Cases', () => {
    it('should handle empty arrays', () => {
      const tokens: ResolvedTokens = {
        'shadow.empty': {
          $type: 'shadow',
          $value: [],
          path: ['shadow', 'empty'],
          name: 'shadow.empty',
          originalValue: [],
        },
      }

      const resolved = aliasResolver.resolve(tokens)
      expect(resolved['shadow.empty'].$value).toEqual([])
    })

    it('should handle arrays with only explicit values (no references)', () => {
      const tokens: ResolvedTokens = {
        'shadow.explicit': {
          $type: 'shadow',
          $value: [
            {
              color: { colorSpace: 'srgb', components: [0, 0, 0], alpha: 0.1 },
              offsetX: { value: 0, unit: 'px' },
              offsetY: { value: 2, unit: 'px' },
              blur: { value: 4, unit: 'px' },
            },
            {
              color: { colorSpace: 'srgb', components: [0, 0, 0], alpha: 0.2 },
              offsetX: { value: 0, unit: 'px' },
              offsetY: { value: 4, unit: 'px' },
              blur: { value: 8, unit: 'px' },
            },
          ],
          path: ['shadow', 'explicit'],
          name: 'shadow.explicit',
          originalValue: [
            {
              color: { colorSpace: 'srgb', components: [0, 0, 0], alpha: 0.1 },
              offsetX: { value: 0, unit: 'px' },
              offsetY: { value: 2, unit: 'px' },
              blur: { value: 4, unit: 'px' },
            },
            {
              color: { colorSpace: 'srgb', components: [0, 0, 0], alpha: 0.2 },
              offsetX: { value: 0, unit: 'px' },
              offsetY: { value: 4, unit: 'px' },
              blur: { value: 8, unit: 'px' },
            },
          ],
        },
      }

      const resolved = aliasResolver.resolve(tokens)
      const explicit = resolved['shadow.explicit'].$value

      // Should remain unchanged
      expect(explicit).toEqual(tokens['shadow.explicit'].$value)
    })
  })
})
