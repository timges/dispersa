/**
 * Tests to verify composite token types validate and parse
 */
import { beforeEach, describe, expect, it } from 'vitest'

import { TokenParser } from '../../../src/lib/tokens/token-parser'
import { SchemaValidator } from '../../../src/lib/validation/validator'

describe('Composite Token Types', () => {
  let validator: SchemaValidator
  let parser: TokenParser

  beforeEach(() => {
    validator = new SchemaValidator()
    parser = new TokenParser()
  })

  describe('Validator Accepts Composite Types', () => {
    it('should accept typography tokens', () => {
      const typographyToken = {
        $type: 'typography',
        $value: {
          fontFamily: 'Arial',
          fontSize: { value: 16, unit: 'px' },
          fontWeight: 400,
          letterSpacing: { value: 0, unit: 'px' },
          lineHeight: 1.2,
        },
      }

      const errors = validator.validateToken(typographyToken)
      expect(errors.length).toBe(0)
    })

    it('should accept border tokens', () => {
      const borderToken = {
        $type: 'border',
        $value: {
          color: { colorSpace: 'srgb', components: [0, 0, 0] },
          width: { value: 1, unit: 'px' },
          style: 'solid',
        },
      }

      const errors = validator.validateToken(borderToken)
      expect(errors.length).toBe(0)
    })

    it('should accept strokeStyle tokens', () => {
      const strokeStyleToken = {
        $type: 'strokeStyle',
        $value: {
          dashArray: [
            { value: 4, unit: 'px' },
            { value: 2, unit: 'px' },
          ],
          lineCap: 'round',
        },
      }

      const errors = validator.validateToken(strokeStyleToken)
      expect(errors.length).toBe(0)
    })

    it('should accept gradient tokens', () => {
      const gradientToken = {
        $type: 'gradient',
        $value: [
          { color: { colorSpace: 'srgb', components: [1, 0, 0] }, position: 0 },
          { color: { colorSpace: 'srgb', components: [0, 0, 1] }, position: 1 },
        ],
      }

      const errors = validator.validateToken(gradientToken)
      expect(errors.length).toBe(0)
    })

    it('should accept transition tokens', () => {
      const transitionToken = {
        $type: 'transition',
        $value: {
          duration: { value: 200, unit: 'ms' },
          delay: { value: 0, unit: 'ms' },
          timingFunction: [0.5, 0, 1, 1],
        },
      }

      const errors = validator.validateToken(transitionToken)
      expect(errors.length).toBe(0)
    })
  })

  describe('Parser Accepts Composite Types', () => {
    it('should parse tokens with composite types', () => {
      const content = JSON.stringify({
        test: {
          typography: {
            $type: 'typography',
            $value: {
              fontFamily: 'Arial',
              fontSize: { value: 16, unit: 'px' },
              fontWeight: 400,
              letterSpacing: { value: 0, unit: 'px' },
              lineHeight: 1.2,
            },
          },
        },
      })

      const collection = parser.parse(content, 'test.json')
      const flattened = parser.flatten(collection)
      expect(flattened['test.typography']).toBeDefined()
    })
  })

  describe('Supported Types Still Work', () => {
    it('should accept shadow tokens (stable composite type)', () => {
      const shadowToken = {
        $type: 'shadow',
        $value: {
          color: {
            colorSpace: 'srgb',
            components: [0, 0, 0],
          },
          offsetX: { value: 0, unit: 'px' },
          offsetY: { value: 4, unit: 'px' },
          blur: { value: 8, unit: 'px' },
          spread: { value: 0, unit: 'px' },
        },
      }

      const errors = validator.validateToken(shadowToken)
      expect(errors.length).toBe(0)
    })

    it('should accept fontFamily tokens', () => {
      const fontFamilyToken = {
        $type: 'fontFamily',
        $value: ['Arial', 'sans-serif'],
      }

      const errors = validator.validateToken(fontFamilyToken)
      expect(errors.length).toBe(0)
    })

    it('should accept fontWeight tokens', () => {
      const fontWeightToken = {
        $type: 'fontWeight',
        $value: 700,
      }

      const errors = validator.validateToken(fontWeightToken)
      expect(errors.length).toBe(0)
    })

    it('should reject string tokens', () => {
      const stringToken = {
        $type: 'string',
        $value: 'Brand name',
      }

      const errors = validator.validateToken(stringToken)
      expect(errors.length).toBeGreaterThan(0)
    })
  })

  describe('Validation Rejects Invalid Values', () => {
    it('should reject dimension tokens with unsupported units', () => {
      const dimensionToken = {
        $type: 'dimension',
        $value: { value: 1, unit: 'em' },
      }

      const errors = validator.validateToken(dimensionToken)
      expect(errors.length).toBeGreaterThan(0)
    })

    it('should reject strokeStyle tokens with invalid string values', () => {
      const strokeStyleToken = {
        $type: 'strokeStyle',
        $value: 'dash',
      }

      const errors = validator.validateToken(strokeStyleToken)
      expect(errors.length).toBeGreaterThan(0)
    })

    it('should require spread on shadow tokens', () => {
      const shadowToken = {
        $type: 'shadow',
        $value: {
          color: { colorSpace: 'srgb', components: [0, 0, 0] },
          offsetX: { value: 0, unit: 'px' },
          offsetY: { value: 4, unit: 'px' },
          blur: { value: 8, unit: 'px' },
        },
      }

      const errors = validator.validateToken(shadowToken)
      expect(errors.length).toBeGreaterThan(0)
    })

    it('should accept gradient arrays with alias references', () => {
      const gradientToken = {
        $type: 'gradient',
        $value: [
          { color: { colorSpace: 'srgb', components: [0, 0, 0] }, position: 0 },
          '{gradient.stop}',
        ],
      }

      const errors = validator.validateToken(gradientToken)
      expect(errors.length).toBe(0)
    })
  })
})
