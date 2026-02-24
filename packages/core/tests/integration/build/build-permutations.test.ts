import { rm } from 'node:fs/promises'

import { afterEach, describe, expect, it } from 'vitest'

import { build, buildPermutation } from '../../../src/dispersa'
import { BuildConfig, css, json } from '../../../src/index'
import { nameKebabCase } from '../../../src/transforms'
import { getFixturePath } from '../../utils/test-helpers'

describe('Build Permutation Generation', () => {
  const resolverPath = getFixturePath('tokens.resolver.json')
  const testBuildPath = '/tmp/test-build-permutations-' + Date.now()

  afterEach(async () => {
    await rm(testBuildPath, { recursive: true, force: true })
  })

  describe('buildPermutation()', () => {
    it('builds single permutation correctly', async () => {
      const config: BuildConfig = {
        resolver: resolverPath,
        buildPath: testBuildPath,
        outputs: [
          css({
            name: 'css',
            file: 'tokens.css',
            preset: 'standalone',
            selector: ':root',
            transforms: [nameKebabCase()],
          }),
        ],
      }

      const modifierInputs = { theme: 'dark', scale: 'desktop' }
      const result = await buildPermutation(config, modifierInputs)
      expect(result.success).toBe(true)
      const outputs = result.outputs

      expect(outputs.length).toBe(1)
      expect(outputs[0]!.name).toBe('css')
      expect(outputs[0]!.content).toBeTruthy()

      // Should contain dark theme tokens
      expect(outputs[0]!.content).toContain('color-base-background')
    })

    it('uses defaults when given empty modifierInputs', async () => {
      const config: BuildConfig = {
        resolver: resolverPath,
        buildPath: testBuildPath,
        outputs: [
          json({
            name: 'json',
            file: 'tokens.json',
            preset: 'standalone',
            structure: 'flat',
          }),
        ],
      }

      const result = await buildPermutation(config, {})
      expect(result.success).toBe(true)
      const outputs = result.outputs

      expect(outputs.length).toBe(1)

      const parsedJson = JSON.parse(outputs[0]!.content)
      expect(Object.keys(parsedJson).length).toBeGreaterThan(0)
    })

    it('builds multiple outputs for single permutation', async () => {
      const config: BuildConfig = {
        resolver: resolverPath,
        buildPath: testBuildPath,
        outputs: [
          css({
            name: 'css',
            file: 'tokens.css',
            preset: 'standalone',
            selector: ':root',
          }),
          json({
            name: 'json',
            file: 'tokens.json',
            preset: 'standalone',
            structure: 'flat',
          }),
        ],
      }

      const result = await buildPermutation(config, { theme: 'light', scale: 'mobile' })
      expect(result.success).toBe(true)
      const outputs = result.outputs

      expect(outputs.length).toBe(2)
      expect(outputs.some((o) => o.name === 'css')).toBe(true)
      expect(outputs.some((o) => o.name === 'json')).toBe(true)
    })
  })

  describe('Auto-Generated Permutations', () => {
    it('auto-generates all permutations when none specified', async () => {
      const result = await build({
        resolver: resolverPath,
        buildPath: testBuildPath,
        outputs: [
          css({
            name: 'css',
            file: 'tokens.css',
            preset: 'standalone',
            selector: ':root',
          }),
        ],
      })

      expect(result.success).toBe(true)

      // Should have multiple permutations (theme x scale combinations)
      // theme: light, dark (2)
      // scale: mobile, tablet, desktop (3)
      // Total: 2 x 3 = 6 permutations
      expect(result.outputs.length).toBe(6)
    })
  })
})
