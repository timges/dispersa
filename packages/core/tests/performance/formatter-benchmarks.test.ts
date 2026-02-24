/**
 * @fileoverview Performance benchmarks for renderers
 * Baseline: < 200ms for formatting 1000 tokens
 */

import { describe, expect, it } from 'vitest'
import type { OutputConfig } from '../../src/config'
import type { ResolverDocument } from '../../src/resolution/types'
import type { ResolvedTokens } from '../../src/tokens/types'
import type { RenderContext, Renderer } from '../../src/renderers/types'
import { cssRenderer } from '../../src/renderers/css'
import { jsonRenderer } from '../../src/renderers/json'
import { jsRenderer } from '../../src/renderers/js-module'

describe('Renderer Performance Benchmarks', () => {
  function generateTokens(count: number): ResolvedTokens {
    const tokens: ResolvedTokens = {}
    for (let i = 0; i < count; i++) {
      tokens[`token${i}`] = {
        $value: { colorSpace: 'srgb', components: [Math.random(), Math.random(), Math.random()] },
        $type: 'color',
        path: ['tokens', `token${i}`],
        name: `tokens.token${i}`,
        originalValue: { colorSpace: 'srgb', components: [0.5, 0.5, 0.5] },
      }
    }
    return tokens
  }

  async function measureTime(fn: () => Promise<any>): Promise<number> {
    const start = performance.now()
    await fn()
    return performance.now() - start
  }

  const baseResolver: ResolverDocument = {
    version: '2025.10',
    sets: {},
    resolutionOrder: [],
  }

  const buildContext = (
    renderer: Renderer,
    tokens: ResolvedTokens,
    options: Record<string, unknown>,
  ): RenderContext => {
    const output: OutputConfig = {
      name: 'perf',
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

  it('should format CSS quickly for 1000 tokens', async () => {
    const tokens = generateTokens(1000)
    const renderer = cssRenderer()
    const context = buildContext(renderer, tokens, {
      preset: 'standalone',
      selector: ':root',
    })
    const time = await measureTime(() => renderer.format(context))

    expect(time).toBeLessThan(200)
    console.log(`  ✓ Formatted 1000 tokens to CSS in ${time.toFixed(2)}ms`)
  })

  it('should format JSON quickly for 1000 tokens', async () => {
    const tokens = generateTokens(1000)
    const renderer = jsonRenderer()
    const context = buildContext(renderer, tokens, {
      preset: 'standalone',
      structure: 'flat',
    })
    const time = await measureTime(() => renderer.format(context))

    expect(time).toBeLessThan(150)
    console.log(`  ✓ Formatted 1000 tokens to JSON in ${time.toFixed(2)}ms`)
  })

  it('should format JS module quickly for 1000 tokens', async () => {
    const tokens = generateTokens(1000)
    const renderer = jsRenderer()
    const context = buildContext(renderer, tokens, {
      preset: 'standalone',
    })
    const time = await measureTime(() => renderer.format(context))

    expect(time).toBeLessThan(200)
    console.log(`  ✓ Formatted 1000 tokens to JS in ${time.toFixed(2)}ms`)
  })
})
