/**
 * @fileoverview Enterprise-scale performance tests
 * Tests with 5000+ tokens to simulate large design systems
 */

import { describe, expect, it } from 'vitest'
import { css } from '../../src/builders'
import type { ResolverDocument } from '../../src/lib/resolution/resolution.types'
import { Dispersa } from '../../src/dispersa'

describe('Large Token Sets (Enterprise Scale)', () => {
  function generateLargeTokenSet(count: number): Record<string, any> {
    const tokens: Record<string, any> = {}
    for (let i = 0; i < count; i++) {
      tokens[`token${i}`] = {
        $value: { colorSpace: 'srgb', components: [0.5, 0.5, 0.5] },
        $type: 'color',
      }
    }
    return tokens
  }

  async function measureTime(fn: () => Promise<any>): Promise<number> {
    const start = performance.now()
    await fn()
    return performance.now() - start
  }

  it('should handle 5000 tokens (enterprise scale)', async () => {
    const dispersa = new Dispersa()
    const resolver: ResolverDocument = {
      version: '2025.10',
      sets: {
        base: {
          sources: [generateLargeTokenSet(5000)],
        },
      },
      resolutionOrder: [{ $ref: '#/sets/base' }],
    }

    const time = await measureTime(() => dispersa.resolveTokens(resolver))

    expect(time).toBeLessThan(1000) // 1 second for 5000 tokens
    console.log(
      `  ✓ Resolved 5000 tokens in ${time.toFixed(2)}ms (${(time / 5000).toFixed(3)}ms per token)`,
    )
  })

  it('should build 5000 tokens with multiple formats', async () => {
    const dispersa = new Dispersa()
    const resolver: ResolverDocument = {
      version: '2025.10',
      sets: {
        base: {
          sources: [generateLargeTokenSet(5000)],
        },
      },
      resolutionOrder: [{ $ref: '#/sets/base' }],
    }

    const time = await measureTime(() =>
      dispersa.build({
        resolver,
        outputs: [
          css({
            name: 'css',
            file: 'tokens.css',
            preset: 'standalone',
            selector: ':root',
          }),
        ],
      }),
    )

    expect(time).toBeLessThan(2000) // 2 seconds for full build
    console.log(`  ✓ Built 5000 tokens to CSS in ${time.toFixed(2)}ms`)
  })

  it('should handle multiple permutations at scale', async () => {
    const dispersa = new Dispersa()
    const resolver: ResolverDocument = {
      version: '2025.10',
      sets: {
        base: {
          sources: [generateLargeTokenSet(1000)],
        },
      },
      modifiers: {
        theme: {
          contexts: { light: [{}], dark: [{}] },
          default: 'light',
        },
        platform: {
          contexts: { web: [{}], mobile: [{}], desktop: [{}] },
          default: 'web',
        },
      },
      resolutionOrder: [{ $ref: '#/sets/base' }],
    }

    // 2 themes × 3 platforms = 6 permutations × 1000 tokens
    const time = await measureTime(() => dispersa.resolveAllPermutations(resolver))

    expect(time).toBeLessThan(1500)
    console.log(`  ✓ Generated 6 permutations (1000 tokens each) in ${time.toFixed(2)}ms`)
  })
})
