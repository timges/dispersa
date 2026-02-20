/**
 * @fileoverview Contract tests for Renderer interface
 */

import { describe, expect, it } from 'vitest'

import { defineRenderer, isOutputTree } from '../../src/renderers'
import { cssRenderer } from '../../src/renderers/css'
import { jsRenderer } from '../../src/renderers/js-module'
import { jsonRenderer } from '../../src/renderers/json'
import type { OutputConfig } from '../../src/config'
import type { ResolverDocument } from '../../src/resolution/types'
import type { FormatOptions, RenderContext, Renderer } from '../../src/renderers/types'

const baseResolver: ResolverDocument = {
  sets: {},
  resolutionOrder: [],
}

const buildContext = (
  renderer: Renderer,
  tokens: Record<string, any>,
  options: Record<string, unknown> = {},
): RenderContext => {
  const output: OutputConfig = {
    name: 'test',
    renderer,
    file: 'tokens.txt',
    options,
  }

  return {
    permutations: [{ tokens, modifierInputs: {} }],
    output,
    resolver: baseResolver,
    meta: { dimensions: [], defaults: {}, basePermutation: {} },
  }
}

const collectOutputContents = async (
  renderer: Renderer,
  context: RenderContext,
): Promise<string[]> => {
  const output = await renderer.format(context)
  if (typeof output === 'string') {
    return [output]
  }
  if (isOutputTree(output)) {
    return Object.values(output.files)
  }
  throw new Error('Unexpected renderer output')
}

describe('Renderer Interface Contract', () => {
  const renderers = [
    { name: 'cssRenderer', renderer: cssRenderer() },
    { name: 'jsonRenderer', renderer: jsonRenderer() },
    { name: 'jsRenderer', renderer: jsRenderer() },
  ]

  describe('Format Method Signature', () => {
    renderers.forEach(({ name, renderer }) => {
      it(`${name} should accept render context`, async () => {
        const testTokens = {
          'test.token': {
            $value: { colorSpace: 'srgb', components: [0, 0.27, 0.55] },
            $type: 'color',
            path: ['test', 'token'],
            name: 'test.token',
            originalValue: '#ff0000',
          },
        }

        const context = buildContext(renderer, testTokens)
        await expect(renderer.format(context)).resolves.toBeDefined()
      })
    })
  })

  describe('Output Validation', () => {
    const testTokens = {
      'color.primary': {
        $value: { colorSpace: 'srgb', components: [1, 0, 0] },
        $type: 'color',
        path: ['color', 'primary'],
        name: 'color.primary',
        originalValue: { colorSpace: 'srgb', components: [1, 0, 0] },
      },
      'spacing.small': {
        $value: { value: 8, unit: 'px' },
        $type: 'dimension',
        path: ['spacing', 'small'],
        name: 'spacing.small',
        originalValue: { value: 8, unit: 'px' },
      },
    }

    renderers.forEach(({ name, renderer }) => {
      it(`${name} should produce non-empty output`, async () => {
        const context = buildContext(renderer, testTokens, {
          preset: 'standalone',
        })
        const contents = await collectOutputContents(renderer, context)
        expect(contents.length).toBeGreaterThan(0)
        contents.forEach((content) => expect(content.trim().length).toBeGreaterThan(0))
      })
    })
  })

  describe('CSS Renderer Specific Contracts', () => {
    it('should honor CSS-specific options', async () => {
      const renderer = cssRenderer()
      const tokens = {
        'test.color': {
          $value: { colorSpace: 'srgb', components: [0, 0.27, 0.55] },
          $type: 'color',
          path: ['test', 'color'],
          name: 'test.color',
          originalValue: '#ff0000',
        },
      }

      const context = buildContext(renderer, tokens, {
        preset: 'standalone',
        selector: ':root',
        minify: true,
      })

      const contents = await collectOutputContents(renderer, context)
      expect(contents[0]?.includes(':root')).toBe(true)
    })
  })

  describe('JSON Renderer Specific Contracts', () => {
    it('should produce valid JSON', async () => {
      const renderer = jsonRenderer()
      const tokens = {
        'test.value': {
          $value: { colorSpace: 'srgb', components: [0, 0.27, 0.55] },
          $type: 'color',
          path: ['test', 'value'],
          name: 'test.value',
          originalValue: '#ff0000',
        },
      }

      const context = buildContext(renderer, tokens, {
        preset: 'standalone',
        structure: 'flat',
        includeMetadata: true,
      })

      const contents = await collectOutputContents(renderer, context)
      contents.forEach((content) => expect(() => JSON.parse(content)).not.toThrow())
    })
  })

  describe('defineRenderer Helper', () => {
    it('should be exported from dispersa/renderers', () => {
      expect(defineRenderer).toBeDefined()
      expect(typeof defineRenderer).toBe('function')
    })

    it('should return the same renderer object passed to it', () => {
      const renderer: Renderer = {
        format: () => 'output',
      }

      const result = defineRenderer(renderer)
      expect(result).toBe(renderer)
    })

    it('should preserve generic type parameter for typed options', () => {
      type CustomOptions = { prefix: string; minify?: boolean }

      const renderer = defineRenderer<CustomOptions>({
        format(context, options) {
          const prefix = options?.prefix ?? 'token'
          return `${prefix}: output`
        },
      })

      expect(renderer.format).toBeDefined()
      expect(typeof renderer.format).toBe('function')
    })

    it('should work with async format functions', () => {
      const renderer = defineRenderer({
        format: async () => 'async output',
      })

      expect(renderer.format).toBeDefined()
    })

    it('should work with preset property', () => {
      const renderer = defineRenderer({
        preset: 'standalone',
        format: () => 'output',
      })

      expect(renderer.preset).toBe('standalone')
    })
  })
})
