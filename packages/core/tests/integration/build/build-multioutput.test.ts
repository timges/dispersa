import { rm } from 'node:fs/promises'

import { afterEach, describe, expect, it } from 'vitest'

import { build } from '../../../src/dispersa'
import { BuildConfig, css, js, json } from '../../../src/index'
import { getFixturePath } from '../../utils/test-helpers'

describe('Multi-Output Build Integration', () => {
  const resolverPath = getFixturePath('tokens.resolver.json')
  const testBuildPath = '/tmp/test-build-multioutput-' + Date.now()

  afterEach(async () => {
    await rm(testBuildPath, { recursive: true, force: true })
  })

  describe('Multiple Outputs Builds', () => {
    it('builds multiple outputs simultaneously', async () => {
      const config: BuildConfig = {
        resolver: resolverPath,
        buildPath: testBuildPath,
        outputs: [
          css({
            name: 'css',
            preset: 'standalone',
            selector: ':root',
            file: 'tokens.css',
          }),
          json({
            name: 'json',
            preset: 'standalone',
            structure: 'flat',
            file: 'tokens.json',
          }),
          js({
            name: 'js',
            preset: 'standalone',
            file: 'tokens',
          }),
        ],
        permutations: [{ theme: 'light', scale: 'tablet' }],
      }

      const result = await build(config)

      expect(result.success).toBe(true)
      expect(result.outputs.length).toBe(3)

      expect(result.outputs.some((o) => o.name === 'css')).toBe(true)
      expect(result.outputs.some((o) => o.name === 'json')).toBe(true)
      expect(result.outputs.some((o) => o.name === 'js')).toBe(true)
    })

    it('generates correct number of outputs across outputs and permutations', async () => {
      const result = await build({
        resolver: resolverPath,
        buildPath: testBuildPath,
        outputs: [
          css({
            name: 'css',
            preset: 'standalone',
            selector: ':root',
            file: 'tokens.css',
          }),
          json({
            name: 'json',
            preset: 'standalone',
            structure: 'flat',
            file: 'tokens.json',
          }),
        ],
      })

      expect(result.success).toBe(true)

      // Should have outputs for both outputs across all permutations
      // 6 permutations x 2 outputs = 12 outputs
      expect(result.outputs.length).toBe(12)

      const cssOutputs = result.outputs.filter((o) => o.name === 'css')
      const jsonOutputs = result.outputs.filter((o) => o.name === 'json')

      expect(cssOutputs.length).toBe(6)
      expect(jsonOutputs.length).toBe(6)
    })
  })
})
