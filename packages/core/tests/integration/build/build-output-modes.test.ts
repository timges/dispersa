import { rm } from 'node:fs/promises'

import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { build } from '../../../src/dispersa'
import { css } from '../../../src/index'
import { getFixturePath } from '../../utils/test-helpers'

describe('Build Output Modes', () => {
  const resolverPath = getFixturePath('tokens.resolver.json')
  const testBuildPath = '/tmp/test-build-output-modes-' + Date.now()

  beforeEach(() => {
  })

  afterEach(async () => {
    await rm(testBuildPath, { recursive: true, force: true })
  })

  describe('Standalone Preset', () => {
    it('works with standalone preset', async () => {
      const result = await build({
        resolver: resolverPath,
        buildPath: testBuildPath,
        permutations: [{ theme: 'light' }, { theme: 'dark' }],
        outputs: [
          css({
            name: 'css',
            preset: 'standalone',
            selector: ':root',
            file: 'tokens.css',
          }),
        ],
      })

      expect(result.success).toBe(true)
      expect(result.outputs.length).toBe(2) // One file per permutation

      const lightFile = result.outputs.find((o) => o.path.includes('light'))
      const darkFile = result.outputs.find((o) => o.path.includes('dark'))

      expect(lightFile).toBeDefined()
      expect(darkFile).toBeDefined()
    })
  })

  describe('Bundle Preset', () => {
    it('works with bundle preset', async () => {
      const result = await build({
        resolver: resolverPath,
        buildPath: testBuildPath,
        permutations: [{ theme: 'light' }, { theme: 'dark' }],
        outputs: [
          css({
            name: 'css',
            preset: 'bundle',
            // No selector - uses default behavior
            file: 'tokens-bundle.css',
          }),
        ],
      })

      expect(result.success).toBe(true)
      expect(result.outputs.length).toBe(1) // Single bundled file

      const bundledFile = result.outputs[0]
      expect(bundledFile!.content).toContain(':root')
      expect(bundledFile!.content).toContain('[data-theme="dark"]')
      expect(bundledFile!.content).toContain('/* Set: base */')
    })
  })

  describe('API Consistency', () => {
    it('works with new API structure', async () => {
      const result = await build({
        resolver: resolverPath,
        buildPath: testBuildPath,
        permutations: [{ theme: 'light' }],
        outputs: [
          css({
            name: 'css',
            preset: 'standalone',
            selector: ':root',
            file: 'tokens.css',
          }),
        ],
      })

      expect(result.success).toBe(true)
      expect(result.outputs.length).toBe(1)
    })
  })
})
