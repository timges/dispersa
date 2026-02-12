/**
 * @fileoverview Tests for color converter utilities with all DTCG color spaces
 */

import { describe, it, expect } from 'vitest'
import {
  isColorObject,
  colorObjectToHex,
} from '../../../../../src/processing/processors/transforms/built-in/color-converter'
import {
  colorObjectToRgb,
  colorObjectToHsl,
} from '../../../../../src/processing/processors/transforms/built-in/color-format'
import type { ColorValueObject } from '../../../../../src/tokens/types'

describe('Color Converter with All Color Spaces', () => {
  describe('isColorObject', () => {
    it('should identify valid color objects', () => {
      const color: ColorValueObject = {
        colorSpace: 'srgb',
        components: [1, 0, 0],
      }

      expect(isColorObject(color)).toBe(true)
    })

    it('should reject strings', () => {
      expect(isColorObject('{color.red}')).toBe(false)
      expect(isColorObject('#ff0000')).toBe(false)
    })

    it('should reject objects without required properties', () => {
      expect(isColorObject({ colorSpace: 'srgb' })).toBe(false)
      expect(isColorObject({ components: [1, 0, 0] })).toBe(false)
    })
  })

  describe('Conversion with RGB-based Color Spaces', () => {
    it('should convert srgb to hex', () => {
      const color: ColorValueObject = {
        colorSpace: 'srgb',
        components: [1, 0, 0],
      }

      const hex = colorObjectToHex(color)
      expect(hex).toBe('#ff0000')
    })

    it('should convert srgb-linear to hex', () => {
      const color: ColorValueObject = {
        colorSpace: 'srgb-linear',
        components: [1, 0, 0],
      }

      const hex = colorObjectToHex(color)
      expect(hex).toMatch(/^#[0-9a-f]{6}$/i)
    })

    it('should convert display-p3 to hex', () => {
      const color: ColorValueObject = {
        colorSpace: 'display-p3',
        components: [1, 0, 0],
      }

      const hex = colorObjectToHex(color)
      expect(hex).toMatch(/^#[0-9a-f]{6}$/i)
    })

    it('should convert rec2020 to hex', () => {
      const color: ColorValueObject = {
        colorSpace: 'rec2020',
        components: [1, 0, 0],
      }

      const hex = colorObjectToHex(color)
      expect(hex).toMatch(/^#[0-9a-f]{6}$/i)
    })
  })

  describe('Conversion with Cylindrical Color Spaces', () => {
    it('should convert hsl to hex', () => {
      const color: ColorValueObject = {
        colorSpace: 'hsl',
        components: [0, 100, 50],
      }

      const hex = colorObjectToHex(color)
      expect(hex).toMatch(/^#[0-9a-f]{6}$/i)
    })

    it('should convert hwb to hex', () => {
      const color: ColorValueObject = {
        colorSpace: 'hwb',
        components: [0, 0, 0],
      }

      const hex = colorObjectToHex(color)
      expect(hex).toMatch(/^#[0-9a-f]{6}$/i)
    })

    it('should convert hsl to rgb', () => {
      const color: ColorValueObject = {
        colorSpace: 'hsl',
        components: [180, 50, 50],
      }

      const rgb = colorObjectToRgb(color)
      expect(rgb).toMatch(/^rgb\(/)
    })
  })

  describe('Conversion with Lab Color Spaces', () => {
    it('should convert lab to hex', () => {
      const color: ColorValueObject = {
        colorSpace: 'lab',
        components: [50, 50, 50],
      }

      const hex = colorObjectToHex(color)
      expect(hex).toMatch(/^#[0-9a-f]{6}$/i)
    })

    it('should convert lch to hex', () => {
      const color: ColorValueObject = {
        colorSpace: 'lch',
        components: [50, 60, 180],
      }

      const hex = colorObjectToHex(color)
      expect(hex).toMatch(/^#[0-9a-f]{6}$/i)
    })

    it('should convert oklab to hex', () => {
      const color: ColorValueObject = {
        colorSpace: 'oklab',
        components: [0.5, 0.1, -0.1],
      }

      const hex = colorObjectToHex(color)
      expect(hex).toMatch(/^#[0-9a-f]{6}$/i)
    })

    it('should convert oklch to hex', () => {
      const color: ColorValueObject = {
        colorSpace: 'oklch',
        components: [0.5, 0.15, 180],
      }

      const hex = colorObjectToHex(color)
      expect(hex).toMatch(/^#[0-9a-f]{6}$/i)
    })
  })

  describe('Conversion with XYZ Color Spaces', () => {
    it('should convert xyz-d65 to hex', () => {
      const color: ColorValueObject = {
        colorSpace: 'xyz-d65',
        components: [0.5, 0.5, 0.5],
      }

      const hex = colorObjectToHex(color)
      expect(hex).toMatch(/^#[0-9a-f]{6}$/i)
    })

    it('should convert xyz-d50 to hex', () => {
      const color: ColorValueObject = {
        colorSpace: 'xyz-d50',
        components: [0.5, 0.5, 0.5],
      }

      const hex = colorObjectToHex(color)
      expect(hex).toMatch(/^#[0-9a-f]{6}$/i)
    })
  })

  describe('Alpha Channel Support', () => {
    it('should convert srgb with alpha to hex8', () => {
      const color: ColorValueObject = {
        colorSpace: 'srgb',
        components: [1, 0, 0],
        alpha: 0.5,
      }

      const hex = colorObjectToHex(color)
      expect(hex).toMatch(/^#[0-9a-f]{8}$/i)
    })
  })

  describe('"none" Keyword Support', () => {
    it('should handle "none" in components for srgb', () => {
      const color: ColorValueObject = {
        colorSpace: 'srgb',
        components: ['none', 0, 0],
      }

      // Should not throw
      expect(() => colorObjectToHex(color)).not.toThrow()
    })

    it('should handle "none" in hsl hue', () => {
      const color: ColorValueObject = {
        colorSpace: 'hsl',
        components: ['none', 50, 50],
      }

      expect(() => colorObjectToHex(color)).not.toThrow()
    })

    it('should handle "none" in oklch', () => {
      const color: ColorValueObject = {
        colorSpace: 'oklch',
        components: [0.5, 'none', 180],
      }

      expect(() => colorObjectToHex(color)).not.toThrow()
    })

    it('should handle multiple "none" values', () => {
      const color: ColorValueObject = {
        colorSpace: 'srgb',
        components: ['none', 'none', 0],
      }

      expect(() => colorObjectToHex(color)).not.toThrow()
    })
  })

  describe('Output Format Conversions', () => {
    it('should convert color to rgb format', () => {
      const color: ColorValueObject = {
        colorSpace: 'srgb',
        components: [1, 0, 0],
      }

      const rgb = colorObjectToRgb(color)
      expect(rgb).toMatch(/^rgb\(/)
    })

    it('should convert color to hsl format', () => {
      const color: ColorValueObject = {
        colorSpace: 'srgb',
        components: [1, 0, 0],
      }

      const hsl = colorObjectToHsl(color)
      expect(hsl).toMatch(/^hsl\(/)
    })

    it('should preserve alpha in rgb output', () => {
      const color: ColorValueObject = {
        colorSpace: 'srgb',
        components: [1, 0, 0],
        alpha: 0.5,
      }

      const rgb = colorObjectToRgb(color)
      expect(rgb).toMatch(/rgba?\(.*0\.5\)/)
    })

    it('should preserve alpha in hsl output', () => {
      const color: ColorValueObject = {
        colorSpace: 'srgb',
        components: [1, 0, 0],
        alpha: 0.5,
      }

      const hsl = colorObjectToHsl(color)
      expect(hsl).toMatch(/hsla?\(.*0\.5\)/)
    })
  })

  describe('Case Insensitivity', () => {
    it('should handle uppercase color space names', () => {
      const color = {
        colorSpace: 'SRGB' as any,
        components: [1, 0, 0] as any,
      }

      // Should not throw even with uppercase (handled at runtime)
      expect(() => colorObjectToHex(color)).not.toThrow()
    })

    it('should handle mixed case color space names', () => {
      const color = {
        colorSpace: 'Display-P3' as any,
        components: [1, 0, 0] as any,
      }

      // Should not throw even with mixed case (handled at runtime)
      expect(() => colorObjectToHex(color)).not.toThrow()
    })
  })
})
