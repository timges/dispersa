/**
 * @fileoverview Tests for color transforms with all DTCG color spaces
 */

import { describe, it, expect } from 'vitest'
import {
  colorToHex,
  colorToRgb,
  colorToHsl,
} from '../../../../../src/processing/processors/transforms/built-in/color-transforms'
import {
  colorToOklch,
  colorToOklab,
  colorToLch,
  colorToLab,
  colorToHwb,
  colorToColorFunction,
} from '../../../../../src/processing/processors/transforms/built-in/color-transforms'
import type { ResolvedToken } from '../../../../../src/tokens/types'

describe('Color Transforms with All Color Spaces', () => {
  describe('Legacy Color Transforms', () => {
    describe('colorToHex', () => {
      it('should transform srgb to hex', () => {
        const token: ResolvedToken = {
          $type: 'color',
          $value: {
            colorSpace: 'srgb',
            components: [1, 0, 0],
          },
          path: ['color', 'red'],
          name: 'color.red',
          originalValue: { colorSpace: 'srgb', components: [1, 0, 0] },
        }

        const result = colorToHex().transform(token)
        expect(result.$value).toMatch(/^#[0-9a-f]{6}$/i)
      })

      it('should transform hsl to hex', () => {
        const token: ResolvedToken = {
          $type: 'color',
          $value: {
            colorSpace: 'hsl',
            components: [0, 100, 50],
          },
          path: ['color', 'red'],
          name: 'color.red',
          originalValue: { colorSpace: 'hsl', components: [0, 100, 50] },
        }

        const result = colorToHex().transform(token)
        expect(result.$value).toMatch(/^#[0-9a-f]{6}$/i)
      })

      it('should transform oklch to hex', () => {
        const token: ResolvedToken = {
          $type: 'color',
          $value: {
            colorSpace: 'oklch',
            components: [0.6, 0.2, 0],
          },
          path: ['color', 'red'],
          name: 'color.red',
          originalValue: { colorSpace: 'oklch', components: [0.6, 0.2, 0] },
        }

        const result = colorToHex().transform(token)
        expect(result.$value).toMatch(/^#[0-9a-f]{6}$/i)
      })

      it('should preserve alpha in hex8 format', () => {
        const token: ResolvedToken = {
          $type: 'color',
          $value: {
            colorSpace: 'srgb',
            components: [1, 0, 0],
            alpha: 0.5,
          },
          path: ['color', 'red'],
          name: 'color.red',
          originalValue: { colorSpace: 'srgb', components: [1, 0, 0], alpha: 0.5 },
        }

        const result = colorToHex().transform(token)
        expect(result.$value).toMatch(/^#[0-9a-f]{8}$/i)
      })
    })

    describe('colorToRgb', () => {
      it('should transform srgb to rgb', () => {
        const token: ResolvedToken = {
          $type: 'color',
          $value: {
            colorSpace: 'srgb',
            components: [1, 0, 0],
          },
          path: ['color', 'red'],
          name: 'color.red',
          originalValue: { colorSpace: 'srgb', components: [1, 0, 0] },
        }

        const result = colorToRgb().transform(token)
        expect(result.$value).toMatch(/^rgb\(/)
      })

      it('should transform display-p3 to rgb', () => {
        const token: ResolvedToken = {
          $type: 'color',
          $value: {
            colorSpace: 'display-p3',
            components: [1, 0, 0],
          },
          path: ['color', 'red'],
          name: 'color.red',
          originalValue: { colorSpace: 'display-p3', components: [1, 0, 0] },
        }

        const result = colorToRgb().transform(token)
        expect(result.$value).toMatch(/^rgb\(/)
      })
    })

    describe('colorToHsl', () => {
      it('should transform srgb to hsl', () => {
        const token: ResolvedToken = {
          $type: 'color',
          $value: {
            colorSpace: 'srgb',
            components: [1, 0, 0],
          },
          path: ['color', 'red'],
          name: 'color.red',
          originalValue: { colorSpace: 'srgb', components: [1, 0, 0] },
        }

        const result = colorToHsl().transform(token)
        expect(result.$value).toMatch(/^hsl\(/)
      })

      it('should transform oklab to hsl', () => {
        const token: ResolvedToken = {
          $type: 'color',
          $value: {
            colorSpace: 'oklab',
            components: [0.6, 0.2, 0.1],
          },
          path: ['color', 'red'],
          name: 'color.red',
          originalValue: { colorSpace: 'oklab', components: [0.6, 0.2, 0.1] },
        }

        const result = colorToHsl().transform(token)
        expect(result.$value).toMatch(/^hsl\(/)
      })
    })
  })

  describe('Modern Color Transforms', () => {
    describe('colorToOklch', () => {
      it('should transform srgb to oklch', () => {
        const token: ResolvedToken = {
          $type: 'color',
          $value: {
            colorSpace: 'srgb',
            components: [1, 0, 0],
          },
          path: ['color', 'red'],
          name: 'color.red',
          originalValue: { colorSpace: 'srgb', components: [1, 0, 0] },
        }

        const result = colorToOklch().transform(token)
        expect(result.$value).toMatch(/oklch\(/)
      })

      it('should transform hsl to oklch', () => {
        const token: ResolvedToken = {
          $type: 'color',
          $value: {
            colorSpace: 'hsl',
            components: [180, 50, 50],
          },
          path: ['color', 'cyan'],
          name: 'color.cyan',
          originalValue: { colorSpace: 'hsl', components: [180, 50, 50] },
        }

        const result = colorToOklch().transform(token)
        expect(result.$value).toMatch(/oklch\(/)
      })

      it('should transform display-p3 to oklch', () => {
        const token: ResolvedToken = {
          $type: 'color',
          $value: {
            colorSpace: 'display-p3',
            components: [1, 0, 0],
          },
          path: ['color', 'red'],
          name: 'color.red',
          originalValue: { colorSpace: 'display-p3', components: [1, 0, 0] },
        }

        const result = colorToOklch().transform(token)
        expect(result.$value).toMatch(/oklch\(/)
      })
    })

    describe('colorToOklab', () => {
      it('should transform srgb to oklab', () => {
        const token: ResolvedToken = {
          $type: 'color',
          $value: {
            colorSpace: 'srgb',
            components: [1, 0, 0],
          },
          path: ['color', 'red'],
          name: 'color.red',
          originalValue: { colorSpace: 'srgb', components: [1, 0, 0] },
        }

        const result = colorToOklab().transform(token)
        expect(result.$value).toMatch(/oklab\(/)
      })
    })

    describe('colorToLch', () => {
      it('should transform srgb to lch', () => {
        const token: ResolvedToken = {
          $type: 'color',
          $value: {
            colorSpace: 'srgb',
            components: [1, 0, 0],
          },
          path: ['color', 'red'],
          name: 'color.red',
          originalValue: { colorSpace: 'srgb', components: [1, 0, 0] },
        }

        const result = colorToLch().transform(token)
        expect(result.$value).toMatch(/lch\(/)
      })
    })

    describe('colorToLab', () => {
      it('should transform srgb to lab', () => {
        const token: ResolvedToken = {
          $type: 'color',
          $value: {
            colorSpace: 'srgb',
            components: [1, 0, 0],
          },
          path: ['color', 'red'],
          name: 'color.red',
          originalValue: { colorSpace: 'srgb', components: [1, 0, 0] },
        }

        const result = colorToLab().transform(token)
        expect(result.$value).toMatch(/lab\(/)
      })
    })

    describe('colorToHwb', () => {
      it('should transform srgb to hwb', () => {
        const token: ResolvedToken = {
          $type: 'color',
          $value: {
            colorSpace: 'srgb',
            components: [1, 0, 0],
          },
          path: ['color', 'red'],
          name: 'color.red',
          originalValue: { colorSpace: 'srgb', components: [1, 0, 0] },
        }

        const result = colorToHwb().transform(token)
        expect(result.$value).toMatch(/hwb\(/)
      })
    })

    describe('colorToColorFunction', () => {
      it('should transform srgb to color() function', () => {
        const token: ResolvedToken = {
          $type: 'color',
          $value: {
            colorSpace: 'srgb',
            components: [1, 0, 0],
          },
          path: ['color', 'red'],
          name: 'color.red',
          originalValue: { colorSpace: 'srgb', components: [1, 0, 0] },
        }

        const result = colorToColorFunction().transform(token)
        expect(result.$value).toMatch(/color\(/)
      })

      it('should transform display-p3 to color() function', () => {
        const token: ResolvedToken = {
          $type: 'color',
          $value: {
            colorSpace: 'display-p3',
            components: [1, 0, 0],
          },
          path: ['color', 'red'],
          name: 'color.red',
          originalValue: { colorSpace: 'display-p3', components: [1, 0, 0] },
        }

        const result = colorToColorFunction().transform(token)
        expect(result.$value).toMatch(/color\(/)
      })
    })
  })

  describe('"none" Keyword in Transforms', () => {
    it('should handle "none" in hex transform', () => {
      const token: ResolvedToken = {
        $type: 'color',
        $value: {
          colorSpace: 'srgb',
          components: ['none', 0, 0],
        },
        path: ['color', 'test'],
        name: 'color.test',
        originalValue: { colorSpace: 'srgb', components: ['none', 0, 0] },
      }

      const result = colorToHex().transform(token)
      expect(result.$value).toMatch(/^#[0-9a-f]{6}$/i)
    })

    it('should handle "none" in oklch transform', () => {
      const token: ResolvedToken = {
        $type: 'color',
        $value: {
          colorSpace: 'oklch',
          components: [0.5, 'none', 180],
        },
        path: ['color', 'test'],
        name: 'color.test',
        originalValue: { colorSpace: 'oklch', components: [0.5, 'none', 180] },
      }

      const result = colorToOklch().transform(token)
      // Should not throw and produce valid output
      expect(typeof result.$value).toBe('string')
    })

    it('should handle "none" alpha in transforms', () => {
      const token: ResolvedToken = {
        $type: 'color',
        $value: {
          colorSpace: 'srgb',
          components: [1, 0, 0],
          alpha: 'none',
        },
        path: ['color', 'test'],
        name: 'color.test',
        originalValue: { colorSpace: 'srgb', components: [1, 0, 0], alpha: 'none' },
      }

      const result = colorToHex().transform(token)
      expect(result.$value).toMatch(/^#[0-9a-f]{6}$/i)
    })
  })

  describe('Transform Error Handling', () => {
    it('should return original token on transform error', () => {
      const token: ResolvedToken = {
        $type: 'color',
        $value: null as any,
        path: ['color', 'invalid'],
        name: 'color.invalid',
        originalValue: null as any,
      }

      const result = colorToHex().transform(token)
      expect(result).toBe(token)
    })

    it('should handle non-color tokens gracefully', () => {
      const token: ResolvedToken = {
        $type: 'dimension',
        $value: { value: 16, unit: 'px' },
        path: ['spacing', 'base'],
        name: 'spacing.base',
        originalValue: { value: 16, unit: 'px' },
      }

      // Matcher should return false
      expect(colorToHex().matcher(token)).toBe(false)
    })
  })

  describe('All Color Spaces Through Transforms', () => {
    const colorSpaceTests = [
      { colorSpace: 'srgb', components: [1, 0, 0] },
      { colorSpace: 'srgb-linear', components: [1, 0, 0] },
      { colorSpace: 'hsl', components: [0, 100, 50] },
      { colorSpace: 'hwb', components: [0, 0, 0] },
      { colorSpace: 'lab', components: [50, 50, 50] },
      { colorSpace: 'lch', components: [50, 60, 0] },
      { colorSpace: 'oklab', components: [0.6, 0.2, 0.1] },
      { colorSpace: 'oklch', components: [0.6, 0.2, 0] },
      { colorSpace: 'display-p3', components: [1, 0, 0] },
      { colorSpace: 'a98-rgb', components: [1, 0, 0] },
      { colorSpace: 'prophoto-rgb', components: [1, 0, 0] },
      { colorSpace: 'rec2020', components: [1, 0, 0] },
      { colorSpace: 'xyz-d65', components: [0.5, 0.25, 0.1] },
      { colorSpace: 'xyz-d50', components: [0.5, 0.25, 0.1] },
    ] as const

    colorSpaceTests.forEach(({ colorSpace, components }) => {
      it(`should transform ${colorSpace} through all transforms`, () => {
        const token: ResolvedToken = {
          $type: 'color',
          $value: {
            colorSpace,
            components,
          },
          path: ['color', 'test'],
          name: 'color.test',
          originalValue: { colorSpace, components },
        }

        // Should not throw for any transform
        expect(() => colorToHex().transform(token)).not.toThrow()
        expect(() => colorToRgb().transform(token)).not.toThrow()
        expect(() => colorToHsl().transform(token)).not.toThrow()
        expect(() => colorToOklch().transform(token)).not.toThrow()
        expect(() => colorToOklab().transform(token)).not.toThrow()
        expect(() => colorToLch().transform(token)).not.toThrow()
        expect(() => colorToLab().transform(token)).not.toThrow()
        expect(() => colorToHwb().transform(token)).not.toThrow()
        expect(() => colorToColorFunction().transform(token)).not.toThrow()
      })
    })
  })
})
