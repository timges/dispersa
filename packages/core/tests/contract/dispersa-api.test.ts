/**
 * @fileoverview Contract tests for Dispersa class API
 *
 * These tests verify that the Dispersa class maintains a stable API.
 * Method signatures, return types, and behavior contracts must remain consistent.
 */

import { beforeEach, describe, expect, it } from 'vitest'
import { json } from '../../src/index'
import type { ResolverDocument } from '../../src/resolution/resolution.types'
import { Dispersa } from '../../src/dispersa'

describe('Dispersa Class API Contract', () => {
  let dispersa: Dispersa

  beforeEach(() => {
    dispersa = new Dispersa()
  })

  describe('Constructor', () => {
    it('should be callable without arguments', () => {
      expect(() => new Dispersa()).not.toThrow()
    })

    it('should accept optional configuration', () => {
      expect(() => new Dispersa({})).not.toThrow()
      expect(() => new Dispersa({ buildPath: './output' })).not.toThrow()
    })

    it('should accept resolver in constructor', () => {
      const resolver: ResolverDocument = {
        version: '2025.10',
        sets: {
          base: {
            sources: [
              { spacing: { small: { $value: { value: 8, unit: 'px' }, $type: 'dimension' } } },
            ],
          },
        },
        resolutionOrder: [{ $ref: '#/sets/base' }],
      }
      expect(() => new Dispersa({ resolver })).not.toThrow()
    })
  })

  describe('resolveTokens() Method', () => {
    it('should exist as a method', () => {
      expect(dispersa).toHaveProperty('resolveTokens')
      expect(typeof dispersa.resolveTokens).toBe('function')
    })

    it('should accept ResolverDocument as first argument', async () => {
      const resolver: ResolverDocument = {
        version: '2025.10',
        sets: {
          base: {
            sources: [
              { spacing: { small: { $value: { value: 8, unit: 'px' }, $type: 'dimension' } } },
            ],
          },
        },
        resolutionOrder: [{ $ref: '#/sets/base' }],
      }

      await expect(dispersa.resolveTokens(resolver)).resolves.toBeDefined()
    })

    it('should accept optional modifier inputs as second argument', async () => {
      const resolver: ResolverDocument = {
        version: '2025.10',
        sets: {
          base: {
            sources: [
              { spacing: { small: { $value: { value: 8, unit: 'px' }, $type: 'dimension' } } },
            ],
          },
        },
        modifiers: {
          theme: {
            contexts: { light: [], dark: [] },
            default: 'light',
          },
        },
        resolutionOrder: [{ $ref: '#/sets/base' }],
      }

      await expect(dispersa.resolveTokens(resolver, { theme: 'light' })).resolves.toBeDefined()
      await expect(dispersa.resolveTokens(resolver, {})).resolves.toBeDefined()
    })

    it('should return a Promise', () => {
      const resolver: ResolverDocument = {
        version: '2025.10',
        sets: {
          base: {
            sources: [
              { spacing: { small: { $value: { value: 8, unit: 'px' }, $type: 'dimension' } } },
            ],
          },
        },
        resolutionOrder: [{ $ref: '#/sets/base' }],
      }

      const result = dispersa.resolveTokens(resolver)
      expect(result).toBeInstanceOf(Promise)
    })

    it('should resolve to ResolvedTokens object', async () => {
      const resolver: ResolverDocument = {
        version: '2025.10',
        sets: {
          base: {
            sources: [
              {
                color: {
                  red: {
                    $value: { colorSpace: 'srgb', components: [1, 0, 0], alpha: 1 },
                    $type: 'color',
                  },
                },
              },
            ],
          },
        },
        resolutionOrder: [{ $ref: '#/sets/base' }],
      }

      const tokens = await dispersa.resolveTokens(resolver)
      expect(tokens).toBeDefined()
      expect(typeof tokens).toBe('object')
      expect(tokens['color.red']).toBeDefined()
      expect(tokens['color.red']).toHaveProperty('$value')
      expect(tokens['color.red']).toHaveProperty('$type')
      expect(tokens['color.red']).toHaveProperty('path')
      expect(tokens['color.red']).toHaveProperty('name')
    })
  })

  describe('resolveAllPermutations() Method', () => {
    it('should exist as a method', () => {
      expect(dispersa).toHaveProperty('resolveAllPermutations')
      expect(typeof dispersa.resolveAllPermutations).toBe('function')
    })

    it('should accept resolver as argument', async () => {
      const resolver: ResolverDocument = {
        version: '2025.10',
        sets: {
          base: {
            sources: [
              { spacing: { small: { $value: { value: 8, unit: 'px' }, $type: 'dimension' } } },
            ],
          },
        },
        resolutionOrder: [{ $ref: '#/sets/base' }],
      }

      await expect(dispersa.resolveAllPermutations(resolver)).resolves.toBeDefined()
    })

    it('should return a Promise of array', () => {
      const resolver: ResolverDocument = {
        version: '2025.10',
        sets: {
          base: {
            sources: [
              { spacing: { small: { $value: { value: 8, unit: 'px' }, $type: 'dimension' } } },
            ],
          },
        },
        resolutionOrder: [{ $ref: '#/sets/base' }],
      }

      const result = dispersa.resolveAllPermutations(resolver)
      expect(result).toBeInstanceOf(Promise)
    })

    it('should resolve to array of permutations with correct structure', async () => {
      const resolver: ResolverDocument = {
        version: '2025.10',
        sets: {
          base: {
            sources: [
              { spacing: { small: { $value: { value: 8, unit: 'px' }, $type: 'dimension' } } },
            ],
          },
        },
        modifiers: {
          theme: {
            contexts: { light: [], dark: [] },
            default: 'light',
          },
        },
        resolutionOrder: [{ $ref: '#/sets/base' }],
      }

      const permutations = await dispersa.resolveAllPermutations(resolver)
      expect(Array.isArray(permutations)).toBe(true)

      permutations.forEach((perm) => {
        expect(perm).toHaveProperty('tokens')
        expect(perm).toHaveProperty('modifierInputs')
        expect(typeof perm.tokens).toBe('object')
        expect(typeof perm.modifierInputs).toBe('object')
      })
    })
  })

  describe('build() Method', () => {
    it('should exist as a method', () => {
      expect(dispersa).toHaveProperty('build')
      expect(typeof dispersa.build).toBe('function')
    })

    it('should accept BuildConfig object', async () => {
      const resolver: ResolverDocument = {
        version: '2025.10',
        sets: {
          base: {
            sources: [
              { spacing: { small: { $value: { value: 8, unit: 'px' }, $type: 'dimension' } } },
            ],
          },
        },
        resolutionOrder: [{ $ref: '#/sets/base' }],
      }

      const config = {
        resolver,
        outputs: [
          json({
            name: 'test',
            file: 'test.json',
            preset: 'standalone',
          }),
        ],
      }

      await expect(dispersa.build(config)).resolves.toBeDefined()
    })

    it('should return a Promise', () => {
      const resolver: ResolverDocument = {
        version: '2025.10',
        sets: {
          base: {
            sources: [
              { spacing: { small: { $value: { value: 8, unit: 'px' }, $type: 'dimension' } } },
            ],
          },
        },
        resolutionOrder: [{ $ref: '#/sets/base' }],
      }

      const result = dispersa.build({
        resolver,
        outputs: [
          json({
            name: 'test',
            preset: 'standalone',
          }),
        ],
      })
      expect(result).toBeInstanceOf(Promise)
    })

    it('should resolve to BuildResult with correct structure', async () => {
      const resolver: ResolverDocument = {
        version: '2025.10',
        sets: {
          base: {
            sources: [
              { spacing: { small: { $value: { value: 8, unit: 'px' }, $type: 'dimension' } } },
            ],
          },
        },
        resolutionOrder: [{ $ref: '#/sets/base' }],
      }

      const result = await dispersa.build({
        resolver,
        outputs: [
          json({
            name: 'test',
            file: 'test.json',
            preset: 'standalone',
          }),
        ],
      })

      expect(result).toHaveProperty('success')
      expect(result).toHaveProperty('outputs')
      expect(typeof result.success).toBe('boolean')
      expect(Array.isArray(result.outputs)).toBe(true)
    })

    it('should include errors property when build fails', async () => {
      const result = await dispersa.build({
        resolver: 'nonexistent.json',
        outputs: [
          json({
            name: 'test',
            file: 'test.json',
            preset: 'standalone',
          }),
        ],
      })

      expect(result.success).toBe(false)
      expect(result.errors).toBeDefined()
    })
  })

  describe('buildPermutation() Method', () => {
    it('should exist as a method', () => {
      expect(dispersa).toHaveProperty('buildPermutation')
      expect(typeof dispersa.buildPermutation).toBe('function')
    })

    it('should accept config first with optional modifier inputs', async () => {
      const resolver: ResolverDocument = {
        version: '2025.10',
        sets: {
          base: {
            sources: [
              { spacing: { small: { $value: { value: 8, unit: 'px' }, $type: 'dimension' } } },
            ],
          },
        },
        resolutionOrder: [{ $ref: '#/sets/base' }],
      }

      const config = {
        resolver,
        outputs: [
          json({
            name: 'test',
            file: 'test.json',
            preset: 'standalone',
          }),
        ],
      }

      await expect(dispersa.buildPermutation(config, {})).resolves.toMatchObject({
        success: true,
      })
    })

    it('should return a BuildResult with outputs', async () => {
      const resolver: ResolverDocument = {
        version: '2025.10',
        sets: {
          base: {
            sources: [
              { spacing: { small: { $value: { value: 8, unit: 'px' }, $type: 'dimension' } } },
            ],
          },
        },
        resolutionOrder: [{ $ref: '#/sets/base' }],
      }

      const config = {
        resolver,
        outputs: [json({ name: 'test', file: 'test.json', preset: 'standalone' })],
      }

      const outputs = await dispersa.buildPermutation(config, {})
      expect(outputs.success).toBe(true)
      expect(Array.isArray(outputs.outputs)).toBe(true)
      expect(outputs.outputs.length).toBe(1)
    })
  })

  describe('generateTypes() Method', () => {
    it('should exist as a method', () => {
      expect(dispersa).toHaveProperty('generateTypes')
      expect(typeof dispersa.generateTypes).toBe('function')
    })

    it('should accept tokens, output path, and options', async () => {
      const tokens = {
        'spacing.small': {
          $value: { value: 8, unit: 'px' },
          $type: 'dimension',
          path: ['spacing', 'small'],
          name: 'spacing.small',
          originalValue: { value: 8, unit: 'px' },
        },
      }

      // Should not throw
      await expect(
        dispersa.generateTypes(tokens, '/tmp/test.d.ts', { moduleName: 'Test' }),
      ).resolves.toBeUndefined()
    })
  })

  describe('API Consistency', () => {
    it('should maintain method names across instances', () => {
      const dispersa1 = new Dispersa()
      const dispersa2 = new Dispersa()

      expect(Object.keys(dispersa1).sort()).toEqual(Object.keys(dispersa2).sort())
    })

    it('should have all expected public methods', () => {
      const expectedMethods = [
        'resolveTokens',
        'resolveAllPermutations',
        'build',
        'buildOrThrow',
        'buildPermutation',
        'generateTypes',
      ]

      expectedMethods.forEach((method) => {
        expect(dispersa).toHaveProperty(method)
        expect(typeof dispersa[method]).toBe('function')
      })
    })
  })

  describe('Error Handling Contracts', () => {
    it('should reject with Error when resolver is invalid', async () => {
      await expect(dispersa.resolveTokens('nonexistent.json')).rejects.toThrow()
    })

    it('should not throw synchronously for invalid input', async () => {
      // Should not throw synchronously
      const promise = dispersa.resolveTokens('invalid')
      expect(promise).toBeInstanceOf(Promise)

      // But the promise should reject asynchronously
      await expect(promise).rejects.toThrow()
    })

    it('should return failed build result rather than throwing', async () => {
      const result = await dispersa.build({
        resolver: 'invalid',
        outputs: [
          json({
            name: 'test',
            file: 'test.json',
            preset: 'standalone',
          }),
        ],
      })

      expect(result.success).toBe(false)
      expect(result.errors).toBeDefined()
    })
  })
})
