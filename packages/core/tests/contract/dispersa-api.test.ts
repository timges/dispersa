/**
 * @fileoverview Contract tests for Dispersa functional API
 *
 * These tests verify that the Dispersa functions maintain a stable API.
 * Function signatures, return types, and behavior contracts must remain consistent.
 */

import { describe, expect, it } from 'vitest'
import {
  build,
  buildOrThrow,
  buildPermutation,
  generateTypes,
  lint,
  resolveAllPermutations,
  resolveTokens,
} from '../../src/dispersa'
import { dispersaPlugin } from '../../src/lint'
import { json } from '../../src/index'
import type { ResolverDocument } from '../../src/resolution/types'
import { getFixturePath } from '../utils/test-helpers'

describe('Dispersa Functional API Contract', () => {
  describe('resolveTokens()', () => {
    it('should exist as a function', () => {
      expect(typeof resolveTokens).toBe('function')
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

      await expect(resolveTokens(resolver)).resolves.toBeDefined()
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

      await expect(resolveTokens(resolver, { theme: 'light' })).resolves.toBeDefined()
      await expect(resolveTokens(resolver, {})).resolves.toBeDefined()
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

      const result = resolveTokens(resolver)
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

      const tokens = await resolveTokens(resolver)
      expect(tokens).toBeDefined()
      expect(typeof tokens).toBe('object')
      expect(tokens['color.red']).toBeDefined()
      expect(tokens['color.red']).toHaveProperty('$value')
      expect(tokens['color.red']).toHaveProperty('$type')
      expect(tokens['color.red']).toHaveProperty('path')
      expect(tokens['color.red']).toHaveProperty('name')
    })
  })

  describe('resolveAllPermutations()', () => {
    it('should exist as a function', () => {
      expect(typeof resolveAllPermutations).toBe('function')
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

      await expect(resolveAllPermutations(resolver)).resolves.toBeDefined()
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

      const result = resolveAllPermutations(resolver)
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

      const permutations = await resolveAllPermutations(resolver)
      expect(Array.isArray(permutations)).toBe(true)

      permutations.forEach((perm) => {
        expect(perm).toHaveProperty('tokens')
        expect(perm).toHaveProperty('modifierInputs')
        expect(typeof perm.tokens).toBe('object')
        expect(typeof perm.modifierInputs).toBe('object')
      })
    })
  })

  describe('build()', () => {
    it('should exist as a function', () => {
      expect(typeof build).toBe('function')
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

      await expect(build(config)).resolves.toBeDefined()
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

      const result = build({
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

      const result = await build({
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
      const result = await build({
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

  describe('buildOrThrow()', () => {
    it('should exist as a function', () => {
      expect(typeof buildOrThrow).toBe('function')
    })

    it('should throw on invalid resolver', async () => {
      await expect(
        buildOrThrow({
          resolver: 'nonexistent.json',
          outputs: [
            json({
              name: 'test',
              file: 'test.json',
              preset: 'standalone',
            }),
          ],
        }),
      ).rejects.toThrow()
    })
  })

  describe('buildPermutation()', () => {
    it('should exist as a function', () => {
      expect(typeof buildPermutation).toBe('function')
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

      await expect(buildPermutation(config, {})).resolves.toMatchObject({
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

      const outputs = await buildPermutation(config, {})
      expect(outputs.success).toBe(true)
      expect(Array.isArray(outputs.outputs)).toBe(true)
      expect(outputs.outputs.length).toBe(1)
    })
  })

  describe('generateTypes()', () => {
    it('should exist as a function', () => {
      expect(typeof generateTypes).toBe('function')
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

      await expect(
        generateTypes(tokens, '/tmp/test.d.ts', { moduleName: 'Test' }),
      ).resolves.toBeUndefined()
    })
  })

  describe('lint()', () => {
    const resolverPath = getFixturePath('tokens.resolver.json')

    it('should exist as a function', () => {
      expect(typeof lint).toBe('function')
    })

    it('should accept LintOptions and return LintResult', async () => {
      const result = await lint({
        resolver: resolverPath,
        plugins: { dispersa: dispersaPlugin },
        rules: {},
      })

      expect(result).toBeDefined()
      expect(result).toHaveProperty('issues')
      expect(result).toHaveProperty('errorCount')
      expect(result).toHaveProperty('warningCount')
      expect(typeof result.errorCount).toBe('number')
      expect(typeof result.warningCount).toBe('number')
    })

    it('should throw LintError when failOnError is true and errors exist', async () => {
      await expect(
        lint({
          resolver: resolverPath,
          plugins: { dispersa: dispersaPlugin },
          rules: { 'dispersa/require-description': 'error' },
        }),
      ).rejects.toThrow()
    })

    it('should return result without throwing when failOnError is false', async () => {
      const result = await lint({
        resolver: resolverPath,
        plugins: { dispersa: dispersaPlugin },
        rules: { 'dispersa/require-description': 'error' },
        failOnError: false,
      })

      expect(result).toBeDefined()
      expect(result.errorCount).toBeGreaterThan(0)
    })
  })

  describe('API Consistency', () => {
    it('should have all expected public functions exported', () => {
      const functions = [
        resolveTokens,
        resolveAllPermutations,
        build,
        buildOrThrow,
        buildPermutation,
        generateTypes,
        lint,
      ]

      functions.forEach((fn) => {
        expect(typeof fn).toBe('function')
      })
    })
  })

  describe('Error Handling Contracts', () => {
    it('should reject with Error when resolver is invalid', async () => {
      await expect(resolveTokens('nonexistent.json')).rejects.toThrow()
    })

    it('should not throw synchronously for invalid input', async () => {
      const promise = resolveTokens('invalid')
      expect(promise).toBeInstanceOf(Promise)

      await expect(promise).rejects.toThrow()
    })

    it('should return failed build result rather than throwing', async () => {
      const result = await build({
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
