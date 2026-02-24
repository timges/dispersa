import { rm } from 'node:fs/promises'

import { afterEach, describe, expect, it } from 'vitest'

import { build, BuildConfig, css, resolveTokens } from '../../../src/index'
import { getFixturePath } from '../../utils/test-helpers'

describe('Build Error Handling', () => {
  const resolverPath = getFixturePath('tokens.resolver.json')
  const testBuildPath = '/tmp/test-build-errors-' + Date.now()

  afterEach(async () => {
    await rm(testBuildPath, { recursive: true, force: true })
  })

  describe('Configuration Errors', () => {
    it('handles missing resolver file', async () => {
      const config: BuildConfig = {
        resolver: '/nonexistent/resolver.json',
        buildPath: testBuildPath,
        outputs: [
          css({
            name: 'css',
            file: 'tokens.css',
            preset: 'standalone',
            selector: ':root',
          }),
        ],
      }

      const result = await build(config)

      expect(result.success).toBe(false)
      expect(result.errors).toBeDefined()
    })

    it('handles invalid modifier context', async () => {
      await expect(async () => {
        await resolveTokens(resolverPath, {
          theme: 'nonexistent-theme',
          scale: 'tablet',
        })
      }).rejects.toThrow()
    })
  })

  describe('Renderer Errors', () => {
    it('handles invalid output renderer', async () => {
      const brokenRenderer = {
        format: () => {
          throw new Error('Renderer error')
        },
      }

      const config: BuildConfig = {
        resolver: resolverPath,
        buildPath: testBuildPath,
        outputs: [
          {
            name: 'invalid',
            renderer: brokenRenderer as any,
            file: 'tokens.txt',
          },
        ],
        permutations: [{ theme: 'light', scale: 'tablet' }],
      }

      const result = await build(config)

      expect(result.success).toBe(false)
      expect(result.errors).toBeDefined()
      expect(result.errors![0]!.message).toContain('Renderer error')
    })
  })

  describe('Transform Errors', () => {
    it('handles invalid transform', async () => {
      const brokenTransform = () => ({
        name: 'broken',
        transform: () => {
          throw new Error('Transform error')
        },
      })

      const config: BuildConfig = {
        resolver: resolverPath,
        buildPath: testBuildPath,
        outputs: [
          css({
            name: 'css',
            file: 'tokens.css',
            preset: 'standalone',
            selector: ':root',
            transforms: [brokenTransform() as any],
          }),
        ],
        permutations: [{ theme: 'light', scale: 'tablet' }],
      }

      const result = await build(config)

      expect(result.success).toBe(false)
      expect(result.errors).toBeDefined()
      expect(result.errors![0]!.message).toContain('Transform error')
    })
  })
})
