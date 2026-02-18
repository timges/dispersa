import { mkdir, readdir } from 'node:fs/promises'
import * as path from 'node:path'

import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { css, json, js } from '../../src/index'
import { colorToHex, colorToRgb, dimensionToRem } from '../../src/transforms'
import { Dispersa } from '../../src/dispersa'
import {
  cleanupTempDir,
  createTempDir,
  getFixturePath,
  readTempFile,
  tempFileExists,
} from '../utils/test-helpers'

describe('Complete Build Workflow E2E Tests', () => {
  let tempDir: string
  let dispersa: Dispersa

  beforeEach(async () => {
    tempDir = await createTempDir()
    dispersa = new Dispersa()
  })

  afterEach(async () => {
    await cleanupTempDir(tempDir)
  })

  describe('Basic Token Resolution Workflow', () => {
    it('should resolve tokens from resolver file', async () => {
      const resolverPath = getFixturePath('tokens.resolver.json')

      const tokens = await dispersa.resolveTokens(resolverPath, {
        theme: 'light',
        scale: 'tablet',
      })

      expect(tokens).toBeDefined()
      expect(Object.keys(tokens).length).toBeGreaterThan(0)
      expect(tokens['color.primitive.red']).toBeDefined()
      expect(tokens['color.primitive.red'].$value).toEqual({
        colorSpace: 'srgb',
        components: [1, 0, 0],
      })
    })

    it('should resolve tokens with different modifiers', async () => {
      const resolverPath = getFixturePath('tokens.resolver.json')

      const lightTokens = await dispersa.resolveTokens(resolverPath, {
        theme: 'light',
        scale: 'tablet',
      })

      const darkTokens = await dispersa.resolveTokens(resolverPath, {
        theme: 'dark',
        scale: 'tablet',
      })

      // Light and dark themes should have different background colors
      expect(lightTokens['color.base.background'].$value).toEqual({
        colorSpace: 'srgb',
        components: [1, 1, 1],
      })
      expect(darkTokens['color.base.background'].$value).toEqual({
        colorSpace: 'srgb',
        components: [0.067, 0.094, 0.153],
      })
    })

    it('should resolve all permutations', async () => {
      const resolverPath = getFixturePath('tokens.resolver.json')

      const permutations = await dispersa.resolveAllPermutations(resolverPath)

      // Should have 6 permutations (2 themes × 3 scales)
      expect(permutations).toHaveLength(6)

      permutations.forEach(({ tokens, modifierInputs }) => {
        expect(tokens).toBeDefined()
        expect(Object.keys(tokens).length).toBeGreaterThan(0)
        expect(modifierInputs).toBeDefined()
      })
    })
  })

  describe('Single Output Build Workflow', () => {
    it('should build CSS output with transforms', async () => {
      const resolverPath = getFixturePath('tokens.resolver.json')

      const result = await dispersa.build({
        resolver: resolverPath,
        buildPath: tempDir,
        permutations: [{ theme: 'light', scale: 'tablet' }],
        outputs: [
          css({
            name: 'css',
            file: 'tokens.css',
            preset: 'standalone',
            selector: ':root',
            minify: false,
            transforms: [colorToHex(), dimensionToRem()],
          }),
        ],
      })

      expect(result.success).toBe(true)
      expect(result.outputs).toHaveLength(1)
      expect(result.outputs[0].name).toBe('css')

      const cssContent = result.outputs[0].content
      expect(cssContent).toContain(':root {')
      expect(cssContent).toContain('--color-primitive-red:')
    })

    it('should build JSON output', async () => {
      const resolverPath = getFixturePath('tokens.resolver.json')

      const result = await dispersa.build({
        resolver: resolverPath,
        buildPath: tempDir,
        permutations: [{ theme: 'light', scale: 'tablet' }],
        outputs: [
          json({
            name: 'json',
            file: 'tokens.json',
            preset: 'standalone',
            structure: 'flat',
            includeMetadata: false,
            minify: false,
          }),
        ],
      })

      expect(result.success).toBe(true)
      expect(result.outputs).toHaveLength(1)

      const jsonContent = result.outputs[0].content
      const parsed = JSON.parse(jsonContent)

      expect(parsed['color.primitive.red']).toEqual({
        colorSpace: 'srgb',
        components: [1, 0, 0],
      })
    })

    it('should build JavaScript module', async () => {
      const resolverPath = getFixturePath('tokens.resolver.json')

      const result = await dispersa.build({
        resolver: resolverPath,
        buildPath: tempDir,
        permutations: [{ theme: 'light', scale: 'tablet' }],
        outputs: [
          js({
            name: 'js',
            file: 'tokens',
            preset: 'standalone',
          }),
        ],
      })

      expect(result.success).toBe(true)
      expect(result.outputs).toHaveLength(1)

      const jsContent = result.outputs[0].content
      expect(jsContent).toContain('const tokens = {')
      expect(jsContent).toContain('color: {')
    })
  })

  describe('Multi-Output Build Workflow', () => {
    it('should build multiple outputs simultaneously', async () => {
      const resolverPath = getFixturePath('tokens.resolver.json')

      const result = await dispersa.build({
        resolver: resolverPath,
        buildPath: tempDir,
        permutations: [{ theme: 'light', scale: 'tablet' }],
        outputs: [
          css({
            name: 'css',
            file: 'tokens.css',
            preset: 'standalone',
            selector: ':root',
            minify: false,
          }),
          json({
            name: 'json',
            file: 'tokens.json',
            preset: 'standalone',
            structure: 'flat',
            includeMetadata: false,
            minify: false,
          }),
          js({
            name: 'js',
            file: 'tokens',
            preset: 'standalone',
          }),
        ],
      })

      expect(result.success).toBe(true)
      expect(result.outputs).toHaveLength(3)

      // Verify all outputs were built
      expect(result.outputs.some((o) => o.name === 'css')).toBe(true)
      expect(result.outputs.some((o) => o.name === 'json')).toBe(true)
      expect(result.outputs.some((o) => o.name === 'js')).toBe(true)
    })

    it('should apply output-specific transforms', async () => {
      const resolverPath = getFixturePath('tokens.resolver.json')

      const result = await dispersa.build({
        resolver: resolverPath,
        buildPath: tempDir,
        permutations: [{ theme: 'light', scale: 'tablet' }],
        outputs: [
          css({
            name: 'css-hex',
            file: 'tokens-hex.css',
            preset: 'standalone',
            selector: ':root',
            minify: false,
            transforms: [colorToHex()],
          }),
          css({
            name: 'css-rgb',
            file: 'tokens-rgb.css',
            preset: 'standalone',
            selector: ':root',
            minify: false,
            transforms: [colorToRgb()],
          }),
        ],
      })

      const hexOutput = result.outputs.find((o) => o.name === 'css-hex')
      const rgbOutput = result.outputs.find((o) => o.name === 'css-rgb')

      expect(hexOutput).toBeDefined()
      expect(rgbOutput).toBeDefined()

      const hexContent = hexOutput!.content
      const rgbContent = rgbOutput!.content

      // Hex version should have hex colors
      expect(hexContent).toMatch(/#[0-9a-f]{6}/i)

      // RGB version should have rgb colors
      expect(rgbContent).toMatch(/rgb\(/i)
    })
  })

  describe('Multi-Permutation Build Workflow', () => {
    it('should build all permutations automatically', async () => {
      const resolverPath = getFixturePath('tokens.resolver.json')

      const result = await dispersa.build({
        resolver: resolverPath,
        buildPath: tempDir,
        outputs: [
          css({
            name: 'css',
            file: 'tokens.css',
            preset: 'standalone',
            selector: ':root',
            minify: false,
          }),
        ],
      })

      expect(result.success).toBe(true)
      // Should generate files for all permutations (6 = 2 themes × 3 scales)
      expect(result.outputs.length).toBe(6)

      // At least one CSS file should be created
      const files = await readdir(tempDir)
      const cssFiles = files.filter((f) => f.endsWith('.css'))
      expect(cssFiles.length).toBeGreaterThan(0)
    })

    it('should build theme variations correctly', async () => {
      const resolverPath = getFixturePath('tokens.resolver.json')

      await dispersa.build({
        resolver: resolverPath,
        buildPath: tempDir,
        outputs: [
          json({
            name: 'json',
            file: 'tokens.json',
            preset: 'standalone',
            structure: 'flat',
            includeMetadata: false,
            minify: false,
          }),
        ],
      })

      // At least one JSON file should be created
      const files = await readdir(tempDir)
      const jsonFiles = files.filter((f) => f.endsWith('.json'))
      expect(jsonFiles.length).toBeGreaterThan(0)

      // Read first JSON file and verify it has token data
      const firstJsonFile = jsonFiles[0]!
      const content = await readTempFile(tempDir, firstJsonFile)
      const tokens = JSON.parse(content)

      // Verify tokens exist
      expect(Object.keys(tokens).length).toBeGreaterThan(0)
    })
  })

  describe('Error Handling Workflow', () => {
    it('should handle invalid resolver paths gracefully', async () => {
      const result = await dispersa.build({
        resolver: 'nonexistent.json',
        buildPath: tempDir,
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

    it('should handle invalid modifier inputs', async () => {
      const resolverPath = getFixturePath('tokens.resolver.json')

      await expect(
        dispersa.resolveTokens(resolverPath, { theme: 'invalid-theme' }),
      ).rejects.toThrow()
    })

    it('should report build failures with broken renderer', async () => {
      const resolverPath = getFixturePath('tokens.resolver.json')

      const brokenRenderer = {
        format: () => {
          throw new Error('Renderer intentionally broken')
        },
      }

      const result = await dispersa.build({
        resolver: resolverPath,
        buildPath: tempDir,
        permutations: [{ theme: 'light', scale: 'tablet' }],
        outputs: [
          {
            name: 'invalid',
            renderer: brokenRenderer as any,
            file: 'tokens.txt',
          },
        ],
      })

      expect(result.success).toBe(false)
      expect(result.errors).toBeDefined()
    })
  })

  describe('Type Generation Workflow', () => {
    it('should generate TypeScript types', async () => {
      const resolverPath = getFixturePath('tokens.resolver.json')

      const tokens = await dispersa.resolveTokens(resolverPath, { theme: 'light', scale: 'tablet' })
      const fileName = `${tempDir}/tokens.d.ts`

      await dispersa.generateTypes(tokens, fileName, {
        moduleName: 'Tokens',
      })

      const tsExists = await tempFileExists(tempDir, 'tokens.d.ts')
      expect(tsExists).toBe(true)

      const tsContent = await readTempFile(tempDir, 'tokens.d.ts')
      expect(tsContent).toContain('export type TokenName =')
    })
  })
})
