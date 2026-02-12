import { beforeEach, describe, expect, it } from 'vitest'
import type { Preprocessor } from '../../../../../src/processing/processors/preprocessors/types'
import { Dispersa } from '../../../../../src/dispersa'

describe('Preprocessor Integration Tests', () => {
  let dispersa: Dispersa

  beforeEach(() => {
    dispersa = new Dispersa()
  })

  describe('Preprocessor Execution Order', () => {
    it('should apply multiple preprocessors in sequence', async () => {
      const preprocessor1: Preprocessor = {
        name: 'add-field-1',
        preprocess: (rawTokens) => ({
          ...rawTokens,
          _step1: true,
        }),
      }

      const preprocessor2: Preprocessor = {
        name: 'add-field-2',
        preprocess: (rawTokens) => ({
          ...rawTokens,
          _step2: true,
        }),
      }

      const rawTokens = {
        color: {
          primary: {
            $type: 'color',
            $value: '#ff0000',
          },
        },
      }

      // Apply preprocessors in sequence
      const result1 = await preprocessor1.preprocess(rawTokens)
      const result2 = await preprocessor2.preprocess(result1)

      expect(result2).toHaveProperty('_step1', true)
      expect(result2).toHaveProperty('_step2', true)
      expect(result2).toHaveProperty('color')
    })

    it('should apply preprocessors with transformations', async () => {
      const normalizePreprocessor: Preprocessor = {
        name: 'normalize-values',
        preprocess: (rawTokens) => {
          // Normalize all string values to uppercase
          const normalize = (obj: Record<string, unknown>): Record<string, unknown> => {
            const result: Record<string, unknown> = {}
            for (const [key, value] of Object.entries(obj)) {
              if (typeof value === 'string') {
                result[key] = value.toUpperCase()
              } else if (value != null && typeof value === 'object' && !Array.isArray(value)) {
                result[key] = normalize(value as Record<string, unknown>)
              } else {
                result[key] = value
              }
            }
            return result
          }
          return normalize(rawTokens)
        },
      }

      const rawTokens = {
        color: {
          primary: {
            $type: 'color',
            $value: '#ff0000',
          },
        },
      }

      const processed = await normalizePreprocessor.preprocess(rawTokens)

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect((processed as any).color.primary.$type).toBe('COLOR')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect((processed as any).color.primary.$value).toBe('#FF0000')
    })
  })

  describe('Edge Cases', () => {
    it('should handle empty token object', async () => {
      const customPreprocessor: Preprocessor = {
        name: 'identity',
        preprocess: (rawTokens) => rawTokens,
      }

      const emptyTokens = {}

      const processed = await customPreprocessor.preprocess(emptyTokens)
      expect(processed).toEqual({})
    })

    it('should handle arrays in token values', async () => {
      const customPreprocessor: Preprocessor = {
        name: 'identity',
        preprocess: (rawTokens) => rawTokens,
      }

      const tokensWithArrays = {
        font: {
          family: {
            $type: 'fontFamily',
            $value: ['Arial', 'sans-serif'],
          },
        },
      }

      const processed = await customPreprocessor.preprocess(tokensWithArrays)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect((processed as any).font.family.$value).toEqual(['Arial', 'sans-serif'])
    })

    it('should handle null and undefined values', async () => {
      const customPreprocessor: Preprocessor = {
        name: 'identity',
        preprocess: (rawTokens) => rawTokens,
      }

      const tokensWithNulls = {
        color: {
          primary: null,
          secondary: undefined,
          tertiary: {
            $type: 'color',
            $value: '#ff0000',
          },
        },
      }

      const processed = await customPreprocessor.preprocess(tokensWithNulls)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect((processed as any).color.primary).toBeNull()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect((processed as any).color.secondary).toBeUndefined()
    })
  })

  describe('Preprocessor Immutability', () => {
    it('should not mutate original token object', async () => {
      const customPreprocessor: Preprocessor = {
        name: 'add-field',
        preprocess: (rawTokens) => ({
          ...rawTokens,
          _added: true,
        }),
      }

      const originalTokens = {
        color: {
          primary: {
            $type: 'color',
            $value: '#ff0000',
          },
        },
      }

      const originalClone = JSON.parse(JSON.stringify(originalTokens))

      await customPreprocessor.preprocess(originalTokens)

      // Original should remain unchanged
      expect(originalTokens).toEqual(originalClone)
    })
  })
})
