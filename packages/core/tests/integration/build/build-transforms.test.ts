import { rm } from 'node:fs/promises'

import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { build } from '../../../src/dispersa'
import {
    BuildConfig,
    css,
    json,
} from '../../../src/index'
import { colorToHex, nameKebabCase } from '../../../src/transforms'
import { getFixturePath } from '../../utils/test-helpers'

describe('Build Transform Integration', () => {
  const resolverPath = getFixturePath('tokens.resolver.json')
  const testBuildPath = '/tmp/test-build-transforms-' + Date.now()

  afterEach(async () => {
    await rm(testBuildPath, { recursive: true, force: true })
  })

  describe('Global Transforms', () => {
    it('applies global transforms to all outputs', async () => {
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
        ],
        transforms: [nameKebabCase()],
        permutations: [{ theme: 'light', scale: 'tablet' }],
      }

      const result = await build(config)

      expect(result.success).toBe(true)

      const cssOutput = result.outputs[0]
      // Check that names are kebab-cased
      expect(cssOutput!.content).toContain('color-primitive')
      expect(cssOutput!.content).not.toContain('colorPrimitive')
    })
  })

  describe('Output-Specific Transforms', () => {
    it('applies different transforms to different outputs', async () => {
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
          css({
            name: 'css2',
            file: 'tokens2.css',
            preset: 'standalone',
            selector: ':root',
            transforms: [colorToHex()], // Test value transform
          }),
        ],
        permutations: [{ theme: 'light', scale: 'tablet' }],
      }

      const result = await build(config)

      expect(result.success).toBe(true)
      expect(result.outputs.length).toBe(2)

      const cssOutput = result.outputs.find((o) => o.name === 'css')
      const css2Output = result.outputs.find((o) => o.name === 'css2')

      expect(cssOutput).toBeDefined()
      expect(css2Output).toBeDefined()

      // CSS should have kebab-case
      expect(cssOutput!.content).toContain('color-primitive')

      // CSS2 should have hex colors (value transform)
      expect(css2Output!.content).toMatch(/#[0-9a-f]{6}/i)
    })
  })

  describe('Custom Transforms', () => {
    it('uses custom transform correctly', async () => {
      const customDoubleTransform = {
        name: 'test/double-value',
        matcher: (token) => token.$type === 'number',
        transform: (token) => ({
          ...token,
          $value: typeof token.$value === 'number' ? token.$value * 2 : token.$value,
        }),
      }

      const config: BuildConfig = {
        resolver: resolverPath,
        buildPath: testBuildPath,
        outputs: [
          json({
            name: 'json',
            file: 'tokens.json',
            preset: 'standalone',
            structure: 'flat',
            includeMetadata: false,
            transforms: [customDoubleTransform],
          }),
        ],
        permutations: [{ theme: 'light', scale: 'tablet' }],
      }

      const result = await build(config)

      expect(result.success).toBe(true)

      const parsedJson = JSON.parse(result.outputs[0]!.content)

      // Check that number values were doubled
      // lineHeight are number type: tight (1.25), normal (1.5), relaxed (1.75)
      expect(parsedJson['font.lineHeight.tight']).toBe(2.5) // 1.25 * 2
      expect(parsedJson['font.lineHeight.normal']).toBe(3) // 1.5 * 2
    })
  })

  describe('Custom Renderers', () => {
    it('uses custom renderer correctly', async () => {
      const customRenderer = {
        format: (tokens) => {
          return `CUSTOM FORMAT: ${Object.keys(tokens).length} tokens`
        },
      }

      const config: BuildConfig = {
        resolver: resolverPath,
        buildPath: testBuildPath,
        outputs: [
          {
            name: 'custom',
            renderer: customRenderer,
            file: 'tokens.txt',
          },
        ],
        permutations: [{ theme: 'light', scale: 'tablet' }],
      }

      const result = await build(config)

      expect(result.success).toBe(true)
      expect(result.outputs[0]!.content).toContain('CUSTOM FORMAT')
      expect(result.outputs[0]!.content).toContain('tokens')
    })
  })
})
