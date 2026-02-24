import { rm } from 'node:fs/promises'

import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { build, BuildConfig, css, json, resolveAllPermutations, resolveTokens } from '../../../src/index'
import { getFixturePath } from '../../utils/test-helpers'

describe('Basic Build Operations', () => {
  const resolverPath = getFixturePath('tokens.resolver.json')
  const testBuildPath = '/tmp/test-build-basic-' + Date.now()

  afterEach(async () => {
    await rm(testBuildPath, { recursive: true, force: true })
  })

  describe('build() with explicit permutations', () => {
    it('generates one output per permutation when given explicit permutations', async () => {
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
        ],
        permutations: [
          { theme: 'light', scale: 'tablet' },
          { theme: 'dark', scale: 'tablet' },
        ],
      }

      const result = await build(config)

      expect(result.success).toBe(true)
      expect(result.outputs.length).toBe(2) // One per permutation
      expect(result.errors).toBeUndefined()

      // Standalone mode generates files with theme/scale suffixes
      result.outputs.forEach((output) => {
        expect(output.content).toBeTruthy()
        expect(output.path).toMatch(/tokens.*\.css$/)
      })
    })

    it('builds successfully with single permutation', async () => {
      const config: BuildConfig = {
        resolver: resolverPath,
        buildPath: testBuildPath,
        outputs: [
          json({
            name: 'json',
            preset: 'standalone',
            structure: 'flat',
            file: 'tokens.json',
          }),
        ],
        permutations: [{ theme: 'light', scale: 'mobile' }],
      }

      const result = await build(config)

      expect(result.success).toBe(true)
      expect(result.outputs.length).toBe(1)

      const output = result.outputs[0]
      expect(output).toBeDefined()
      expect(output!.content).toBeTruthy()

      const parsedJson = JSON.parse(output!.content)
      expect(Object.keys(parsedJson).length).toBeGreaterThan(0)
    })

    it('uses defaults when given empty permutation object', async () => {
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
        ],
        permutations: [{}], // Empty permutation uses defaults
      }

      const result = await build(config)

      expect(result.success).toBe(true)
      expect(result.outputs.length).toBe(1)
    })
  })

  describe('resolveTokens()', () => {
    it('resolves tokens without writing files', async () => {
      const tokens = await resolveTokens(resolverPath, {
        theme: 'light',
        scale: 'tablet',
      })

      expect(tokens).toBeDefined()
      expect(Object.keys(tokens).length).toBeGreaterThan(0)

      // Should have resolved tokens with paths
      const tokenNames = Object.keys(tokens)
      expect(tokenNames.some((n) => n.includes('color'))).toBe(true)
    })

    it('uses defaults when no modifiers provided', async () => {
      const tokens = await resolveTokens(resolverPath, {})

      expect(tokens).toBeDefined()
      expect(Object.keys(tokens).length).toBeGreaterThan(0)
    })

    it('resolves aliases correctly', async () => {
      const tokens = await resolveTokens(resolverPath, {
        theme: 'light',
        scale: 'tablet',
      })

      // Check that color.base.primary has been resolved (it references color.primitive.brand.blue)
      const primaryToken = tokens['color.base.primary']
      expect(primaryToken).toBeDefined()
      // Should be resolved DTCG object, not {color.primitive.brand.blue}
      expect(primaryToken!.$value).toEqual({
        colorSpace: 'srgb',
        components: [0, 0.482, 1],
      })
    })

    it('produces different results with different modifiers', async () => {
      const lightTokens = await resolveTokens(resolverPath, {
        theme: 'light',
        scale: 'tablet',
      })

      const darkTokens = await resolveTokens(resolverPath, {
        theme: 'dark',
        scale: 'tablet',
      })

      // Background colors should differ between themes
      const lightBg = lightTokens['color.base.background']
      const darkBg = darkTokens['color.base.background']

      expect(lightBg!.$value).not.toBe(darkBg!.$value)
    })
  })

  describe('resolveAllPermutations()', () => {
    it('resolves all permutations without writing files', async () => {
      const permutations = await resolveAllPermutations(resolverPath)

      expect(permutations).toBeDefined()
      expect(permutations.length).toBe(6) // 2 themes x 3 scales

      // Each permutation should have tokens and modifierInputs
      permutations.forEach((perm) => {
        expect(perm.tokens).toBeDefined()
        expect(perm.modifierInputs).toBeDefined()
        expect(Object.keys(perm.tokens).length).toBeGreaterThan(0)
      })
    })

    it('generates all modifier combinations', async () => {
      const permutations = await resolveAllPermutations(resolverPath)

      const modifierCombos = permutations.map((p) => p.modifierInputs)

      // Should have light + dark themes
      const lightCount = modifierCombos.filter((m) => m.theme === 'light').length
      const darkCount = modifierCombos.filter((m) => m.theme === 'dark').length

      expect(lightCount).toBe(3) // light x 3 scales
      expect(darkCount).toBe(3) // dark x 3 scales

      // Should have all scales
      const mobileCount = modifierCombos.filter((m) => m.scale === 'mobile').length
      const tabletCount = modifierCombos.filter((m) => m.scale === 'tablet').length
      const desktopCount = modifierCombos.filter((m) => m.scale === 'desktop').length

      expect(mobileCount).toBe(2) // 2 themes x mobile
      expect(tabletCount).toBe(2) // 2 themes x tablet
      expect(desktopCount).toBe(2) // 2 themes x desktop
    })
  })
})


