import { rm } from 'node:fs/promises'
import { afterEach, describe, expect, it } from 'vitest'

import { build } from '../../../src/dispersa'
import { BuildConfig, css, json } from '../../../src/index'
import type { ResolverDocument } from '../../../src/resolution/types'
import { colorToHex, nameKebabCase } from '../../../src/transforms'

const srgb = (r: number, g: number, b: number) => ({
  colorSpace: 'srgb',
  components: [r, g, b],
})

const inlineResolver: ResolverDocument = {
  version: '2025.10',
  sets: {
    colors: {
      sources: [
        {
          color: {
            $type: 'color',
            palette: {
              blue: { $value: srgb(0, 0.4, 0.8) },
              'blue-600': { $value: srgb(0, 0.3, 0.7) },
              red: { $value: srgb(0.86, 0.15, 0.15) },
              'gray-300': { $value: srgb(0.84, 0.85, 0.86) },
              'gray-900': { $value: srgb(0.1, 0.11, 0.12) },
            },
            action: {
              brand: {
                $root: { $value: '{color.palette.blue}' },
                hover: { $value: '{color.palette.blue-600}' },
              },
            },
            border: {
              default: {
                $root: { $value: '{color.palette.gray-300}' },
                focus: { $value: '{color.palette.blue}' },
              },
            },
            text: {
              default: { $value: '{color.palette.gray-900}' },
              danger: { $value: '{color.palette.red}' },
            },
            button: {
              background: { $value: '{color.action.brand.$root}' },
            },
          },
        },
      ],
    },
  },
  resolutionOrder: [{ $ref: '#/sets/colors' }],
}

describe('$root token output', () => {
  const testBuildPath = '/tmp/test-build-root-tokens-' + Date.now()

  afterEach(async () => {
    await rm(testBuildPath, { recursive: true, force: true })
  })

  it('CSS output uses clean names without $root', async () => {

    const config: BuildConfig = {
      resolver: inlineResolver,
      buildPath: testBuildPath,
      outputs: [
        css({
          name: 'css',
          file: 'tokens.css',
          preset: 'standalone',
          selector: ':root',
          transforms: [nameKebabCase(), colorToHex()],
        }),
      ],
      permutations: [{}],
    }

    const result = await build(config)

    expect(result.success).toBe(true)
    const content = result.outputs[0]!.content

    expect(content).toContain('--color-action-brand:')
    expect(content).not.toContain('$root')
    expect(content).not.toMatch(/--[^:]*root/)
    expect(content).toContain('--color-action-brand-hover:')
    expect(content).toContain('--color-border-default:')
    expect(content).toContain('--color-border-default-focus:')
  })

  it('JSON flat output uses clean keys without $root', async () => {

    const config: BuildConfig = {
      resolver: inlineResolver,
      buildPath: testBuildPath,
      outputs: [
        json({
          name: 'json',
          file: 'tokens.json',
          preset: 'standalone',
          structure: 'flat',
          includeMetadata: false,
        }),
      ],
      permutations: [{}],
    }

    const result = await build(config)

    expect(result.success).toBe(true)
    const parsed = JSON.parse(result.outputs[0]!.content)

    expect(parsed).toHaveProperty('color.action.brand')
    expect(parsed).not.toHaveProperty('color.action.brand.$root')
    expect(parsed).toHaveProperty('color.action.brand.hover')
    expect(parsed).toHaveProperty('color.border.default')
    expect(parsed).not.toHaveProperty('color.border.default.$root')
    expect(parsed).toHaveProperty('color.border.default.focus')
  })

  it('JSON nested output has no $root node in tree', async () => {

    const config: BuildConfig = {
      resolver: inlineResolver,
      buildPath: testBuildPath,
      outputs: [
        json({
          name: 'json',
          file: 'tokens.json',
          preset: 'standalone',
          structure: 'nested',
          includeMetadata: false,
        }),
      ],
      permutations: [{}],
    }

    const result = await build(config)

    expect(result.success).toBe(true)
    const parsed = JSON.parse(result.outputs[0]!.content)

    const brand = parsed.color?.action?.brand
    expect(brand).toBeDefined()
    expect(brand.$root).toBeUndefined()

    const borderDefault = parsed.color?.border?.default
    expect(borderDefault).toBeDefined()
    expect(borderDefault.$root).toBeUndefined()
  })

  it('alias referencing $root resolves correctly then strips', async () => {

    const config: BuildConfig = {
      resolver: inlineResolver,
      buildPath: testBuildPath,
      outputs: [
        json({
          name: 'json',
          file: 'tokens.json',
          preset: 'standalone',
          structure: 'flat',
          includeMetadata: false,
        }),
      ],
      permutations: [{}],
    }

    const result = await build(config)

    expect(result.success).toBe(true)
    const parsed = JSON.parse(result.outputs[0]!.content)

    expect(parsed['color.button.background']).toEqual(parsed['color.action.brand'])
  })

  it('CSS preserveReferences resolves $root aliases as var() references', async () => {

    const config: BuildConfig = {
      resolver: inlineResolver,
      buildPath: testBuildPath,
      outputs: [
        css({
          name: 'css',
          file: 'tokens.css',
          preset: 'standalone',
          selector: ':root',
          preserveReferences: true,
          transforms: [nameKebabCase(), colorToHex()],
        }),
      ],
      permutations: [{}],
    }

    const result = await build(config)

    expect(result.success).toBe(true)
    const content = result.outputs[0]!.content

    expect(content).toContain('--color-button-background: var(--color-action-brand)')
    expect(content).not.toContain('$root')
  })
})
