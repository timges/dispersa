/**
 * @fileoverview Contract tests for Transform interface
 *
 * These tests verify that all transforms implement the required interface correctly.
 */

import { describe, expect, it } from 'vitest'
import {
  colorToHex,
  colorToHsl,
  colorToRgb,
  dimensionToPx,
  dimensionToRem,
  dimensionToUnitless,
  durationToMs,
  durationToSeconds,
  fontWeightToNumber,
  nameCamelCase,
  nameConstantCase,
  nameKebabCase,
  namePascalCase,
  nameSnakeCase,
} from '../../src/transforms'

const srgb = (red: number, green: number, blue: number) => ({
  colorSpace: 'srgb',
  components: [red, green, blue],
})

describe('Transform Interface Contract', () => {
  // Call factory functions to get transform instances
  const transforms = [
    { name: 'colorToHex', transform: colorToHex() },
    { name: 'colorToRgb', transform: colorToRgb() },
    { name: 'colorToHsl', transform: colorToHsl() },
    { name: 'dimensionToPx', transform: dimensionToPx() },
    { name: 'dimensionToRem', transform: dimensionToRem() },
    { name: 'dimensionToUnitless', transform: dimensionToUnitless() },
    { name: 'nameCamelCase', transform: nameCamelCase() },
    { name: 'nameKebabCase', transform: nameKebabCase() },
    { name: 'namePascalCase', transform: namePascalCase() },
    { name: 'nameConstantCase', transform: nameConstantCase() },
    { name: 'nameSnakeCase', transform: nameSnakeCase() },
    { name: 'durationToMs', transform: durationToMs() },
    { name: 'durationToSeconds', transform: durationToSeconds() },
    { name: 'fontWeightToNumber', transform: fontWeightToNumber() },
  ]

  // Transforms that have matchers (type-specific transforms)
  const transformsWithMatchers = [
    { name: 'colorToHex', transform: colorToHex() },
    { name: 'colorToRgb', transform: colorToRgb() },
    { name: 'colorToHsl', transform: colorToHsl() },
    { name: 'dimensionToPx', transform: dimensionToPx() },
    { name: 'dimensionToRem', transform: dimensionToRem() },
    { name: 'dimensionToUnitless', transform: dimensionToUnitless() },
    { name: 'durationToMs', transform: durationToMs() },
    { name: 'durationToSeconds', transform: durationToSeconds() },
    { name: 'fontWeightToNumber', transform: fontWeightToNumber() },
  ]

  describe('Required Properties', () => {
    describe('Optional Matcher Function', () => {
      transformsWithMatchers.forEach(({ name, transform }) => {
        describe(name, () => {
          it('should have a matcher function', () => {
            expect(transform).toHaveProperty('matcher')
            expect(typeof transform.matcher).toBe('function')
          })

          it('matcher should accept a token parameter', () => {
            const testToken = {
              $value: { value: 16, unit: 'px' },
              $type: 'dimension',
              path: ['test'],

              originalValue: { value: 16, unit: 'px' },
            }

            // Should not throw when called
            expect(() => transform.matcher!(testToken)).not.toThrow()
          })

          it('matcher should return a boolean', () => {
            const testToken = {
              $value: { value: 16, unit: 'px' },
              $type: 'dimension',
              path: ['test'],

              originalValue: { value: 16, unit: 'px' },
            }

            const result = transform.matcher!(testToken)
            expect(typeof result).toBe('boolean')
          })
        })
      })
    })

    describe('Transform Function Signature', () => {
      transforms.forEach(({ name, transform }) => {
        describe(name, () => {
          it('should accept a token parameter', () => {
            const testToken = {
              $value: srgb(1, 0, 0),
              $type: 'color',
              path: ['test'],

              originalValue: srgb(1, 0, 0),
            }

            // Should not throw when called
            expect(() => transform.transform(testToken)).not.toThrow()
          })

          it('should return a token object', () => {
            const testToken = {
              $value: srgb(1, 0, 0),
              $type: 'color',
              path: ['test'],

              originalValue: srgb(1, 0, 0),
            }

            const result = transform.transform(testToken)

            expect(result).toBeDefined()
            expect(typeof result).toBe('object')
            expect(result).toHaveProperty('$value')
            expect(result).toHaveProperty('path')
          })

          it('should preserve token structure', () => {
            const testToken = {
              $value: 1,
              $type: 'number',
              path: ['a', 'b', 'c'],
              name: 'a.b.c',
              originalValue: 1,
              $description: 'Test description',
            }

            const result = transform.transform(testToken)

            // Core properties should be preserved
            expect(result.path).toEqual(testToken.path)
            expect(result).toHaveProperty('$value')

            // Metadata should be preserved
            if (testToken.$description) {
              expect(result.$description).toBe(testToken.$description)
            }
          })
        })
      })
    })

    describe('Color Transform Behavior', () => {
      const colorTransforms = [
        { name: 'colorToHex', transform: colorToHex() },
        { name: 'colorToRgb', transform: colorToRgb() },
        { name: 'colorToHsl', transform: colorToHsl() },
      ]

      colorTransforms.forEach(({ name, transform }) => {
        describe(name, () => {
          it('should match color tokens', () => {
            const colorToken = {
              $value: { colorSpace: 'srgb', components: [1, 0, 0] },
              $type: 'color',
              path: ['color'],
              name: 'color',
              originalValue: { colorSpace: 'srgb', components: [1, 0, 0] },
            }

            expect(transform.matcher(colorToken)).toBe(true)
          })

          it('should not match non-color tokens', () => {
            const dimensionToken = {
              $value: { value: 16, unit: 'px' },
              $type: 'dimension',
              path: ['spacing'],
              name: 'spacing',
              originalValue: { value: 16, unit: 'px' },
            }

            expect(transform.matcher(dimensionToken)).toBe(false)
          })

          it('should transform color values to strings', () => {
            const colorToken = {
              $value: { colorSpace: 'srgb', components: [1, 0, 0] },
              $type: 'color',
              path: ['color'],
              name: 'color',
              originalValue: { colorSpace: 'srgb', components: [1, 0, 0] },
            }

            const result = transform.transform(colorToken)
            expect(typeof result.$value).toBe('string')
          })
        })
      })
    })

    describe('Dimension Transform Behavior', () => {
      const dimensionTransforms = [
        { name: 'dimensionToPx', transform: dimensionToPx() },
        { name: 'dimensionToRem', transform: dimensionToRem() },
        { name: 'dimensionToUnitless', transform: dimensionToUnitless() },
      ]

      dimensionTransforms.forEach(({ name, transform }) => {
        describe(name, () => {
          it('should match dimension tokens', () => {
            const dimensionToken = {
              $value: { value: 16, unit: 'px' },
              $type: 'dimension',
              path: ['spacing'],
              name: 'spacing',
              originalValue: { value: 16, unit: 'px' },
            }

            expect(transform.matcher(dimensionToken)).toBe(true)
          })

          it('should not match non-dimension tokens', () => {
            const colorToken = {
              $value: srgb(1, 0, 0),
              $type: 'color',
              path: ['color'],
              name: 'color',
              originalValue: srgb(1, 0, 0),
            }

            expect(transform.matcher(colorToken)).toBe(false)
          })
        })
      })
    })

    describe('Name Transform Behavior', () => {
      const nameTransforms = [
        { name: 'nameCamelCase', transform: nameCamelCase() },
        { name: 'nameKebabCase', transform: nameKebabCase() },
        { name: 'namePascalCase', transform: namePascalCase() },
        { name: 'nameConstantCase', transform: nameConstantCase() },
        { name: 'nameSnakeCase', transform: nameSnakeCase() },
      ]

      nameTransforms.forEach(({ name, transform }) => {
        describe(name, () => {
          it('should not have a matcher (applies to all tokens)', () => {
            // Name transforms don't need matchers since they apply to all tokens
            expect(transform.matcher).toBeUndefined()
          })

          it('should transform the name property', () => {
            const token = {
              $value: 1,
              $type: 'number',
              path: ['test', 'token'],
              name: 'test.token',
              originalValue: 1,
            }

            const result = transform.transform(token)
            expect(result.name).not.toBe(token.name)
            expect(typeof result.name).toBe('string')
          })

          it('should not modify the value', () => {
            const token = {
              $value: 42,
              $type: 'number',
              path: ['test'],

              originalValue: 42,
            }

            const result = transform.transform(token)
            expect(result.$value).toBe(token.$value)
          })
        })
      })
    })

    describe('Immutability', () => {
      transforms.forEach(({ name, transform }) => {
        describe(name, () => {
          it('should not mutate the original token', () => {
            const originalToken = {
              $value: srgb(1, 0, 0),
              $type: 'color',
              path: ['test'],
              name: 'test.token',
              originalValue: srgb(1, 0, 0),
            }

            const tokenCopy = { ...originalToken }
            transform.transform(originalToken)

            // Original should remain unchanged
            expect(originalToken).toEqual(tokenCopy)
          })
        })
      })
    })

    describe('Error Handling', () => {
      transforms.forEach(({ name, transform }) => {
        describe(name, () => {
          it('should handle missing token properties gracefully', () => {
            const incompleteToken = {
              $value: 'test',
              path: [],
              name: '',
            } as any

            // Should either transform or skip gracefully
            expect(() => transform.transform(incompleteToken)).not.toThrow()
          })
        })
      })
    })
  })
})
