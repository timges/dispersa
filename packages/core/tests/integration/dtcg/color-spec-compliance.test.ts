/**
 * @fileoverview Tests for DTCG Color Module 2025-10 specification compliance
 * Tests all 14 color spaces, "none" keyword support, and validation
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { TokenParser } from '../../../src/tokens/token-parser'
import Ajv from 'ajv'
import { dtcgSchemaRegistry, tokenSchema } from '../../../src/validation/schemas'

describe('DTCG Color Specification Compliance', () => {
  let parser: TokenParser
  let ajv: Ajv

  beforeEach(() => {
    parser = new TokenParser()
    ajv = new Ajv({ strict: false })
    for (const schema of dtcgSchemaRegistry) {
      ajv.addSchema(schema as Record<string, unknown>)
    }
  })

  describe('Color Value Format', () => {
    it('should accept alias references', () => {
      const content = JSON.stringify({
        colors: {
          primary: {
            $type: 'color',
            $value: {
              colorSpace: 'srgb',
              components: [1, 0, 0],
            },
          },
          secondary: {
            $type: 'color',
            $value: '{colors.primary}',
          },
        },
      })

      expect(() => parser.parse(content, 'test.json')).not.toThrow()
    })

    it('should accept object format with colorSpace and components', () => {
      const content = JSON.stringify({
        colors: {
          red: {
            $type: 'color',
            $value: {
              colorSpace: 'srgb',
              components: [1, 0, 0],
            },
          },
        },
      })

      expect(() => parser.parse(content, 'test.json')).not.toThrow()
    })

    it('should reject arbitrary CSS color strings', () => {
      const token = {
        $type: 'color',
        $value: '#ff0000',
      }

      const validate = ajv.compile(tokenSchema)
      const valid = validate(token)
      expect(valid).toBe(false)
    })

    it('should reject named color strings', () => {
      const token = {
        $type: 'color',
        $value: 'red',
      }

      const validate = ajv.compile(tokenSchema)
      const valid = validate(token)
      expect(valid).toBe(false)
    })

    it('should reject rgb() function strings', () => {
      const token = {
        $type: 'color',
        $value: 'rgb(255, 0, 0)',
      }

      const validate = ajv.compile(tokenSchema)
      const valid = validate(token)
      expect(valid).toBe(false)
    })
  })

  describe('All 14 Color Spaces', () => {
    it('should support srgb color space', () => {
      const token = {
        $type: 'color',
        $value: {
          colorSpace: 'srgb',
          components: [1, 0, 0],
        },
      }

      const validate = ajv.compile(tokenSchema)
      const valid = validate(token)
      expect(valid).toBe(true)
    })

    it('should support srgb-linear color space', () => {
      const token = {
        $type: 'color',
        $value: {
          colorSpace: 'srgb-linear',
          components: [1, 0, 0],
        },
      }

      const validate = ajv.compile(tokenSchema)
      const valid = validate(token)
      expect(valid).toBe(true)
    })

    it('should support hsl color space', () => {
      const token = {
        $type: 'color',
        $value: {
          colorSpace: 'hsl',
          components: [180, 50, 50],
        },
      }

      const validate = ajv.compile(tokenSchema)
      const valid = validate(token)
      expect(valid).toBe(true)
    })

    it('should support hwb color space', () => {
      const token = {
        $type: 'color',
        $value: {
          colorSpace: 'hwb',
          components: [180, 20, 30],
        },
      }

      const validate = ajv.compile(tokenSchema)
      const valid = validate(token)
      expect(valid).toBe(true)
    })

    it('should support lab color space', () => {
      const token = {
        $type: 'color',
        $value: {
          colorSpace: 'lab',
          components: [50, 25, -50],
        },
      }

      const validate = ajv.compile(tokenSchema)
      const valid = validate(token)
      expect(valid).toBe(true)
    })

    it('should reject unsupported cielab color space', () => {
      const token = {
        $type: 'color',
        $value: {
          colorSpace: 'cielab',
          components: [50, 25, -50],
        },
      }

      const validate = ajv.compile(tokenSchema)
      const valid = validate(token)
      expect(valid).toBe(false)
    })

    it('should support lch color space', () => {
      const token = {
        $type: 'color',
        $value: {
          colorSpace: 'lch',
          components: [50, 60, 180],
        },
      }

      const validate = ajv.compile(tokenSchema)
      const valid = validate(token)
      expect(valid).toBe(true)
    })

    it('should support oklab color space', () => {
      const token = {
        $type: 'color',
        $value: {
          colorSpace: 'oklab',
          components: [0.5, 0.1, -0.2],
        },
      }

      const validate = ajv.compile(tokenSchema)
      const valid = validate(token)
      expect(valid).toBe(true)
    })

    it('should support oklch color space', () => {
      const token = {
        $type: 'color',
        $value: {
          colorSpace: 'oklch',
          components: [0.5, 0.15, 180],
        },
      }

      const validate = ajv.compile(tokenSchema)
      const valid = validate(token)
      expect(valid).toBe(true)
    })

    it('should support display-p3 color space', () => {
      const token = {
        $type: 'color',
        $value: {
          colorSpace: 'display-p3',
          components: [1, 0, 0],
        },
      }

      const validate = ajv.compile(tokenSchema)
      const valid = validate(token)
      expect(valid).toBe(true)
    })

    it('should support a98-rgb color space', () => {
      const token = {
        $type: 'color',
        $value: {
          colorSpace: 'a98-rgb',
          components: [1, 0, 0],
        },
      }

      const validate = ajv.compile(tokenSchema)
      const valid = validate(token)
      expect(valid).toBe(true)
    })

    it('should support prophoto-rgb color space', () => {
      const token = {
        $type: 'color',
        $value: {
          colorSpace: 'prophoto-rgb',
          components: [1, 0, 0],
        },
      }

      const validate = ajv.compile(tokenSchema)
      const valid = validate(token)
      expect(valid).toBe(true)
    })

    it('should support rec2020 color space', () => {
      const token = {
        $type: 'color',
        $value: {
          colorSpace: 'rec2020',
          components: [1, 0, 0],
        },
      }

      const validate = ajv.compile(tokenSchema)
      const valid = validate(token)
      expect(valid).toBe(true)
    })

    it('should support xyz-d65 color space', () => {
      const token = {
        $type: 'color',
        $value: {
          colorSpace: 'xyz-d65',
          components: [0.5, 0.5, 0.5],
        },
      }

      const validate = ajv.compile(tokenSchema)
      const valid = validate(token)
      expect(valid).toBe(true)
    })

    it('should support xyz-d50 color space', () => {
      const token = {
        $type: 'color',
        $value: {
          colorSpace: 'xyz-d50',
          components: [0.5, 0.5, 0.5],
        },
      }

      const validate = ajv.compile(tokenSchema)
      const valid = validate(token)
      expect(valid).toBe(true)
    })

    it('should reject invalid color space', () => {
      const token = {
        $type: 'color',
        $value: {
          colorSpace: 'invalid-space',
          components: [1, 0, 0],
        },
      }

      const validate = ajv.compile(tokenSchema)
      const valid = validate(token)
      expect(valid).toBe(false)
    })
  })

  describe('"none" Keyword Support', () => {
    it('should support "none" for first component', () => {
      const token = {
        $type: 'color',
        $value: {
          colorSpace: 'srgb',
          components: ['none', 0.5, 0.5],
        },
      }

      const validate = ajv.compile(tokenSchema)
      const valid = validate(token)
      expect(valid).toBe(true)
    })

    it('should support "none" for second component', () => {
      const token = {
        $type: 'color',
        $value: {
          colorSpace: 'srgb',
          components: [0.5, 'none', 0.5],
        },
      }

      const validate = ajv.compile(tokenSchema)
      const valid = validate(token)
      expect(valid).toBe(true)
    })

    it('should support "none" for third component', () => {
      const token = {
        $type: 'color',
        $value: {
          colorSpace: 'srgb',
          components: [0.5, 0.5, 'none'],
        },
      }

      const validate = ajv.compile(tokenSchema)
      const valid = validate(token)
      expect(valid).toBe(true)
    })

    it('should support "none" for multiple components', () => {
      const token = {
        $type: 'color',
        $value: {
          colorSpace: 'srgb',
          components: ['none', 'none', 0.5],
        },
      }

      const validate = ajv.compile(tokenSchema)
      const valid = validate(token)
      expect(valid).toBe(true)
    })

    it('should reject "none" for alpha channel', () => {
      const token = {
        $type: 'color',
        $value: {
          colorSpace: 'srgb',
          components: [1, 0, 0],
          alpha: 'none',
        },
      }

      const validate = ajv.compile(tokenSchema)
      const valid = validate(token)
      expect(valid).toBe(false)
    })

    it('should support "none" in cylindrical color spaces (hsl)', () => {
      const token = {
        $type: 'color',
        $value: {
          colorSpace: 'hsl',
          components: ['none', 50, 50],
        },
      }

      const validate = ajv.compile(tokenSchema)
      const valid = validate(token)
      expect(valid).toBe(true)
    })

    it('should support "none" in lab color space', () => {
      const token = {
        $type: 'color',
        $value: {
          colorSpace: 'oklab',
          components: [0.5, 'none', -0.2],
        },
      }

      const validate = ajv.compile(tokenSchema)
      const valid = validate(token)
      expect(valid).toBe(true)
    })
  })

  describe('Component References', () => {
    it('should support JSON Pointer references in components', () => {
      const token = {
        $type: 'color',
        $value: {
          colorSpace: 'srgb',
          components: [{ $ref: '#/base/red/$value/components/0' }, 0, 0],
        },
      }

      const validate = ajv.compile(tokenSchema)
      const valid = validate(token)
      expect(valid).toBe(true)
    })

    it('should support JSON Pointer reference for alpha', () => {
      const token = {
        $type: 'color',
        $value: {
          colorSpace: 'srgb',
          components: [1, 0, 0],
          alpha: { $ref: '#/opacity/value' },
        },
      }

      const validate = ajv.compile(tokenSchema)
      const valid = validate(token)
      expect(valid).toBe(true)
    })
  })

  describe('Alpha Channel', () => {
    it('should support alpha as number', () => {
      const token = {
        $type: 'color',
        $value: {
          colorSpace: 'srgb',
          components: [1, 0, 0],
          alpha: 0.5,
        },
      }

      const validate = ajv.compile(tokenSchema)
      const valid = validate(token)
      expect(valid).toBe(true)
    })

    it('should support alpha omitted (defaults to 1)', () => {
      const token = {
        $type: 'color',
        $value: {
          colorSpace: 'srgb',
          components: [1, 0, 0],
        },
      }

      const validate = ajv.compile(tokenSchema)
      const valid = validate(token)
      expect(valid).toBe(true)
    })

    it('should validate alpha range (0-1)', () => {
      const token1 = {
        $type: 'color',
        $value: {
          colorSpace: 'srgb',
          components: [1, 0, 0],
          alpha: -0.1,
        },
      }

      const validate1 = ajv.compile(tokenSchema)
      const valid1 = validate1(token1)
      expect(valid1).toBe(false)

      const token2 = {
        $type: 'color',
        $value: {
          colorSpace: 'srgb',
          components: [1, 0, 0],
          alpha: 1.1,
        },
      }

      const validate2 = ajv.compile(tokenSchema)
      const valid2 = validate2(token2)
      expect(valid2).toBe(false)
    })
  })

  describe('Schema Validation Edge Cases', () => {
    it('should require exactly 3 components', () => {
      const token1 = {
        $type: 'color',
        $value: {
          colorSpace: 'srgb',
          components: [1, 0],
        },
      }

      const validate1 = ajv.compile(tokenSchema)
      const valid1 = validate1(token1)
      expect(valid1).toBe(false)

      const token2 = {
        $type: 'color',
        $value: {
          colorSpace: 'srgb',
          components: [1, 0, 0, 1],
        },
      }

      const validate2 = ajv.compile(tokenSchema)
      const valid2 = validate2(token2)
      expect(valid2).toBe(false)
    })

    it('should require colorSpace property', () => {
      const token = {
        $type: 'color',
        $value: {
          components: [1, 0, 0],
        },
      }

      const validate = ajv.compile(tokenSchema)
      const valid = validate(token)
      expect(valid).toBe(false)
    })

    it('should require components property', () => {
      const token = {
        $type: 'color',
        $value: {
          colorSpace: 'srgb',
        },
      }

      const validate = ajv.compile(tokenSchema)
      const valid = validate(token)
      expect(valid).toBe(false)
    })

    it('should not allow additional properties in color object', () => {
      const token = {
        $type: 'color',
        $value: {
          colorSpace: 'srgb',
          components: [1, 0, 0],
          unknownProperty: 'value',
        },
      }

      const validate = ajv.compile(tokenSchema)
      const valid = validate(token)
      expect(valid).toBe(false)
    })
  })

  describe('Integration with Token Parser', () => {
    it('should parse valid color tokens with all color spaces', () => {
      const content = JSON.stringify({
        colors: {
          srgb: {
            $type: 'color',
            $value: { colorSpace: 'srgb', components: [1, 0, 0] },
          },
          hsl: {
            $type: 'color',
            $value: { colorSpace: 'hsl', components: [180, 50, 50] },
          },
          oklch: {
            $type: 'color',
            $value: { colorSpace: 'oklch', components: [0.5, 0.15, 180] },
          },
          withNone: {
            $type: 'color',
            $value: { colorSpace: 'srgb', components: ['none', 0, 0] },
          },
          alias: {
            $type: 'color',
            $value: '{colors.srgb}',
          },
        },
      })

      const collection = parser.parse(content, 'test.json')
      const tokens = parser.flatten(collection)

      expect(tokens['colors.srgb']).toBeDefined()
      expect(tokens['colors.hsl']).toBeDefined()
      expect(tokens['colors.oklch']).toBeDefined()
      expect(tokens['colors.withNone']).toBeDefined()
      expect(tokens['colors.alias']).toBeDefined()
    })
  })
})
