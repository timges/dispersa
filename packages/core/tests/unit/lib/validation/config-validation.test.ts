/**
 * @fileoverview Configuration validation integration tests
 *
 * Tests runtime validation of user-provided configurations including:
 * - BuildConfig (build function validation)
 * - OutputConfig (output array validation)
 */

import { describe, expect, it } from 'vitest'
import { build } from '../../../../src/dispersa'
import { css } from '../../../../src/index'
import { cssRenderer } from '../../../../src/renderers/css'
import { nameKebabCase } from '../../../../src/transforms'

describe('Configuration Validation', () => {
  describe('BuildConfig Validation', () => {
    it('should accept valid build config', async () => {
      await expect(
        build({
          resolver: {
            version: '2025.10',
            resolutionOrder: [{ $ref: '#/sets/base' }],
            sets: { base: { sources: [] } },
          },
          outputs: [css({ name: 'css', file: 'tokens.css', preset: 'standalone' })],
        }),
      ).resolves.toBeTruthy()
    })

    it('should throw error when outputs array is missing', async () => {
      const result = await build({} as any)

      expect(result.success).toBe(false)
      expect(result.errors?.[0]?.message).toContain('outputs')
    })

    it('should throw error when outputs array is empty', async () => {
      const result = await build({
        resolver: {
          version: '2025.10',
          resolutionOrder: [{ $ref: '#/sets/base' }],
          sets: { base: { sources: [] } },
        },
        outputs: [],
      })

      expect(result.success).toBe(false)
      expect(result.errors?.[0]?.message).toContain('outputs')
    })

    it('should accept optional transforms', async () => {
      await expect(
        build({
          resolver: {
            version: '2025.10',
            resolutionOrder: [{ $ref: '#/sets/base' }],
            sets: { base: { sources: [] } },
          },
          outputs: [css({ name: 'css', file: 'tokens.css', preset: 'standalone' })],
          transforms: [nameKebabCase()],
        }),
      ).resolves.toBeTruthy()
    })

    it('should accept optional preprocessors', async () => {
      await expect(
        build({
          resolver: {
            version: '2025.10',
            resolutionOrder: [{ $ref: '#/sets/base' }],
            sets: { base: { sources: [] } },
          },
          outputs: [css({ name: 'css', file: 'tokens.css', preset: 'standalone' })],
          preprocessors: [],
        }),
      ).resolves.toBeTruthy()
    })

    it('should accept optional permutations', async () => {
      await expect(
        build({
          resolver: {
            version: '2025.10',
            resolutionOrder: [{ $ref: '#/sets/base' }],
            sets: { base: { sources: [] } },
          },
          outputs: [css({ name: 'css', file: 'tokens.css', preset: 'standalone' })],
          permutations: [{ theme: 'light' }, { theme: 'dark' }],
        }),
      ).resolves.toBeTruthy()
    })

    describe('OutputConfig Validation', () => {
      it('should accept valid output config', async () => {
        await expect(
          build({
            resolver: {
              version: '2025.10',
              resolutionOrder: [{ $ref: '#/sets/base' }],
              sets: { base: { sources: [] } },
            },
            outputs: [
              css({
                name: 'css',
                file: 'tokens.css',
                preset: 'standalone',
                selector: ':root',
                transforms: [nameKebabCase()],
                filters: [],
              }),
            ],
          }),
        ).resolves.toBeTruthy()
      })

      it('should throw error when output name is missing', async () => {
        const result = await build({
          resolver: {
            version: '2025.10',
            resolutionOrder: [{ $ref: '#/sets/base' }],
            sets: { base: { sources: [] } },
          },
          outputs: [{ renderer: cssRenderer() } as any],
        })

        expect(result.success).toBe(false)
      })

      it('should throw error when output renderer is missing', async () => {
        const result = await build({
          resolver: {
            version: '2025.10',
            resolutionOrder: [{ $ref: '#/sets/base' }],
            sets: { base: { sources: [] } },
          },
          outputs: [{ name: 'test' } as any],
        })

        expect(result.success).toBe(false)
      })
    })

    describe('Error Messages', () => {
      it('should provide helpful error messages for build config validation', async () => {
        const result = await build({ outputs: [] })

        expect(result.success).toBe(false)
        expect(result.errors?.[0]?.message).toContain('Invalid build configuration')
        expect(result.errors?.[0]?.message).toContain('outputs')
      })

      it('should provide helpful error messages for output config validation', async () => {
        const result = await build({
          resolver: {
            version: '2025.10',
            resolutionOrder: [{ $ref: '#/sets/base' }],
            sets: { base: { sources: [] } },
          },
          outputs: [{ renderer: cssRenderer() } as any],
        })

        expect(result.success).toBe(false)
        expect(result.errors?.[0]?.message).toContain('Invalid output')
        expect(result.errors?.[0]?.message).toContain('name')
      })
    })

    describe('Resolver Validation in Config', () => {
      it('should validate inline resolver object in BuildConfig', async () => {
        const result = await build({
          resolver: {
            version: '2025.10',
            sets: { base: { sources: [] } },
          } as any,
          outputs: [{ name: 'css', renderer: cssRenderer(), options: { preset: 'standalone' } }],
        })

        expect(result.success).toBe(false)
        expect(result.errors?.[0]?.message).toContain('resolutionOrder')
      })

      it('should accept valid inline resolver object', async () => {
        await expect(
          build({
            resolver: {
              version: '2025.10',
              resolutionOrder: [{ $ref: '#/sets/base' }],
              sets: {
                base: {
                  sources: [],
                },
              },
            },
            outputs: [css({ name: 'css', file: 'tokens.css', preset: 'standalone' })],
          }),
        ).resolves.toBeTruthy()
      })

      it('should throw error for invalid resolver file path', async () => {
        const result = await build({
          resolver: 'nonexistent-file.json',
          outputs: [css({ name: 'css', file: 'tokens.css', preset: 'standalone' })],
        })

        expect(result.success).toBe(false)
        expect(result.errors?.[0]?.message).toContain('ENOENT')
      })
    })
  })
})
