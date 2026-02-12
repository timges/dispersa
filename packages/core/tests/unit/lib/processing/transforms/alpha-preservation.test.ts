import { describe, expect, it } from 'vitest'

import {
  colorToHex,
  colorToHsl,
  colorToRgb,
} from '../../../../../src/processing/processors/transforms/built-in/color-transforms'
import type { ColorValueObject, ResolvedToken } from '../../../../../src/tokens/types'

describe('Alpha Channel Preservation Tests (DTCG Format)', () => {
  describe('colorToHex transform', () => {
    it('should preserve alpha from DTCG color object', () => {
      const colorValue: ColorValueObject = {
        colorSpace: 'srgb',
        components: [1, 0, 0],
        alpha: 0.5,
      }

      const token: ResolvedToken = {
        $type: 'color',
        $value: colorValue,
        path: ['test'],
        name: 'test',
        originalValue: colorValue,
      }

      const result = colorToHex().transform(token)
      expect(result.$value).toBe('#ff000080') // 0.5 alpha = 80 in hex
    })

    it('should not add alpha for opaque colors', () => {
      const colorValue: ColorValueObject = {
        colorSpace: 'srgb',
        components: [1, 0, 0],
        alpha: 1,
      }

      const token: ResolvedToken = {
        $type: 'color',
        $value: colorValue,
        path: ['test'],
        name: 'test',
        originalValue: colorValue,
      }

      const result = colorToHex().transform(token)
      expect(result.$value).toBe('#ff0000') // No alpha suffix for fully opaque
    })

    it('should not add alpha when alpha is omitted (defaults to 1)', () => {
      const colorValue: ColorValueObject = {
        colorSpace: 'srgb',
        components: [1, 0, 0],
      }

      const token: ResolvedToken = {
        $type: 'color',
        $value: colorValue,
        path: ['test'],
        name: 'test',
        originalValue: colorValue,
      }

      const result = colorToHex().transform(token)
      expect(result.$value).toBe('#ff0000')
    })

    it('should convert DTCG colors with different alpha values', () => {
      const testCases = [
        { alpha: 0, expected: '#ff000000' },
        { alpha: 0.25, expected: '#ff000040' },
        { alpha: 0.75, expected: '#ff0000bf' },
        { alpha: 0.99, expected: '#ff0000fc' },
      ]

      testCases.forEach(({ alpha, expected }) => {
        const colorValue: ColorValueObject = {
          colorSpace: 'srgb',
          components: [1, 0, 0],
          alpha,
        }

        const token: ResolvedToken = {
          $type: 'color',
          $value: colorValue,
          path: ['test'],
          name: 'test',
          originalValue: colorValue,
        }

        const result = colorToHex().transform(token)
        expect(result.$value).toBe(expected)
      })
    })

    it('should preserve alpha from HSL color space', () => {
      const colorValue: ColorValueObject = {
        colorSpace: 'hsl',
        components: [0, 1, 0.5],
        alpha: 0.5,
      }

      const token: ResolvedToken = {
        $type: 'color',
        $value: colorValue,
        path: ['test'],
        name: 'test',
        originalValue: colorValue,
      }

      const result = colorToHex().transform(token)
      expect(result.$value).toBe('#ff000080')
    })
  })

  describe('colorToRgb transform', () => {
    it('should preserve alpha in rgb output', () => {
      const colorValue: ColorValueObject = {
        colorSpace: 'srgb',
        components: [1, 0, 0],
        alpha: 0.5,
      }

      const token: ResolvedToken = {
        $type: 'color',
        $value: colorValue,
        path: ['test'],
        name: 'test',
        originalValue: colorValue,
      }

      const result = colorToRgb().transform(token)
      expect(result.$value).toMatch(/rgba?\(.*0\.5\)/)
    })

    it('should not add alpha for opaque colors in rgb', () => {
      const colorValue: ColorValueObject = {
        colorSpace: 'srgb',
        components: [1, 0, 0],
      }

      const token: ResolvedToken = {
        $type: 'color',
        $value: colorValue,
        path: ['test'],
        name: 'test',
        originalValue: colorValue,
      }

      const result = colorToRgb().transform(token)
      expect(result.$value).toMatch(/^rgb\(/)
      expect(result.$value).not.toMatch(/rgba/)
    })
  })

  describe('colorToHsl transform', () => {
    it('should preserve alpha in hsl output', () => {
      const colorValue: ColorValueObject = {
        colorSpace: 'srgb',
        components: [1, 0, 0],
        alpha: 0.5,
      }

      const token: ResolvedToken = {
        $type: 'color',
        $value: colorValue,
        path: ['test'],
        name: 'test',
        originalValue: colorValue,
      }

      const result = colorToHsl().transform(token)
      expect(result.$value).toMatch(/hsla?\(.*0\.5\)/)
    })

    it('should not add alpha for opaque colors in hsl', () => {
      const colorValue: ColorValueObject = {
        colorSpace: 'srgb',
        components: [1, 0, 0],
      }

      const token: ResolvedToken = {
        $type: 'color',
        $value: colorValue,
        path: ['test'],
        name: 'test',
        originalValue: colorValue,
      }

      const result = colorToHsl().transform(token)
      expect(result.$value).toMatch(/^hsl\(/)
      expect(result.$value).not.toMatch(/hsla/)
    })
  })

  describe('Edge cases', () => {
    it('should handle alpha = 0 (fully transparent)', () => {
      const colorValue: ColorValueObject = {
        colorSpace: 'srgb',
        components: [1, 0, 0],
        alpha: 0,
      }

      const token: ResolvedToken = {
        $type: 'color',
        $value: colorValue,
        path: ['test'],
        name: 'test',
        originalValue: colorValue,
      }

      const result = colorToHex().transform(token)
      expect(result.$value).toBe('#ff000000')
    })

    it('should handle very small alpha values', () => {
      const colorValue: ColorValueObject = {
        colorSpace: 'srgb',
        components: [1, 0, 0],
        alpha: 0.01,
      }

      const token: ResolvedToken = {
        $type: 'color',
        $value: colorValue,
        path: ['test'],
        name: 'test',
        originalValue: colorValue,
      }

      const result = colorToHex().transform(token)
      expect(result.$value).toMatch(/#ff0000[0-9a-f]{2}$/i)
    })

    it('should handle grayscale colors with alpha', () => {
      const colorValue: ColorValueObject = {
        colorSpace: 'srgb',
        components: [0.502, 0.502, 0.502],
        alpha: 0.5,
      }

      const token: ResolvedToken = {
        $type: 'color',
        $value: colorValue,
        path: ['test'],
        name: 'test',
        originalValue: colorValue,
      }

      const result = colorToHex().transform(token)
      expect(result.$value).toMatch(/#[0-9a-f]{8}$/i)
    })

    it('should handle "none" keyword for alpha (treated as 1)', () => {
      const colorValue: ColorValueObject = {
        colorSpace: 'srgb',
        components: [1, 0, 0],
        alpha: 'none',
      }

      const token: ResolvedToken = {
        $type: 'color',
        $value: colorValue,
        path: ['test'],
        name: 'test',
        originalValue: colorValue,
      }

      const result = colorToHex().transform(token)
      expect(result.$value).toBe('#ff0000') // "none" treated as fully opaque
    })
  })

  describe('String values (unresolved aliases)', () => {
    it('should return original token for unresolved alias references', () => {
      const token: ResolvedToken = {
        $type: 'color',
        $value: '{color.primary}',
        path: ['test'],
        name: 'test',
        originalValue: '{color.primary}',
      }

      const result = colorToHex().transform(token)
      expect(result.$value).toBe('{color.primary}') // Should not attempt to transform
    })
  })
})
