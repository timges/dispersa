/**
 * @fileoverview Performance benchmarks for token resolution
 *
 * Baselines (2025):
 * - Resolution: < 100ms for 1000 tokens
 * - Alias resolution: < 50ms for 1000 aliases
 * - Permutation generation: < 200ms for 10 modifiers
 */

import { describe, expect, it, beforeEach } from 'vitest'
import type { ResolverDocument } from '../../src/lib/resolution/resolution.types'
import { Dispersa } from '../../src/dispersa'

describe('Resolution Performance Benchmarks', () => {
  let dispersa: Dispersa

  beforeEach(() => {
    dispersa = new Dispersa()
  })

  /**
   * Helper to generate test tokens
   */
  function generateTokens(count: number): Record<string, any> {
    const tokens: Record<string, any> = {}
    for (let i = 0; i < count; i++) {
      tokens[`token${i}`] = {
        $value: { colorSpace: 'srgb', components: [Math.random(), Math.random(), Math.random()] },
        $type: 'color',
      }
    }
    return tokens
  }

  /**
   * Helper to measure execution time
   */
  async function measureTime(fn: () => Promise<any>): Promise<number> {
    const start = performance.now()
    await fn()
    const end = performance.now()
    return end - start
  }

  describe('Small Token Sets (10 tokens)', () => {
    it('should resolve quickly', async () => {
      const resolver: ResolverDocument = {
        version: '2025.10',
        sets: {
          base: {
            sources: [generateTokens(10)],
          },
        },
        resolutionOrder: [{ $ref: '#/sets/base' }],
      }

      const time = await measureTime(() => dispersa.resolveTokens(resolver))

      expect(time).toBeLessThan(50) // Should be very fast for small sets
      console.log(`  ✓ Resolved 10 tokens in ${time.toFixed(2)}ms`)
    })
  })

  describe('Medium Token Sets (100 tokens)', () => {
    it('should resolve within reasonable time', async () => {
      const resolver: ResolverDocument = {
        version: '2025.10',
        sets: {
          base: {
            sources: [generateTokens(100)],
          },
        },
        resolutionOrder: [{ $ref: '#/sets/base' }],
      }

      const time = await measureTime(() => dispersa.resolveTokens(resolver))

      expect(time).toBeLessThan(100)
      console.log(`  ✓ Resolved 100 tokens in ${time.toFixed(2)}ms`)
    })
  })

  describe('Large Token Sets (1000 tokens)', () => {
    it('should meet performance baseline', async () => {
      const resolver: ResolverDocument = {
        version: '2025.10',
        sets: {
          base: {
            sources: [generateTokens(1000)],
          },
        },
        resolutionOrder: [{ $ref: '#/sets/base' }],
      }

      const time = await measureTime(() => dispersa.resolveTokens(resolver))

      expect(time).toBeLessThan(200) // Baseline: < 200ms for 1000 tokens
      console.log(`  ✓ Resolved 1000 tokens in ${time.toFixed(2)}ms`)
    })
  })

  describe('Alias Resolution Performance', () => {
    it('should resolve simple aliases quickly', async () => {
      const tokens: Record<string, any> = {
        base: {
          $value: { colorSpace: 'srgb', components: [1, 0, 0] },
          $type: 'color',
        },
      }

      // Create 100 aliases pointing to base
      for (let i = 0; i < 100; i++) {
        tokens[`alias${i}`] = {
          $value: '{base}',
          $type: 'color',
        }
      }

      const resolver: ResolverDocument = {
        version: '2025.10',
        sets: {
          base: {
            sources: [tokens],
          },
        },
        resolutionOrder: [{ $ref: '#/sets/base' }],
      }

      const time = await measureTime(() => dispersa.resolveTokens(resolver))

      expect(time).toBeLessThan(100)
      console.log(`  ✓ Resolved 100 aliases in ${time.toFixed(2)}ms`)
    })

    it('should resolve deep alias chains efficiently', async () => {
      const tokens: Record<string, any> = {
        base: {
          $value: { colorSpace: 'srgb', components: [1, 0, 0] },
          $type: 'color',
        },
      }

      // Create chain of 20 aliases
      for (let i = 0; i < 20; i++) {
        const previous = i === 0 ? 'base' : `alias${i - 1}`
        tokens[`alias${i}`] = {
          $value: `{${previous}}`,
          $type: 'color',
        }
      }

      const resolver: ResolverDocument = {
        version: '2025.10',
        sets: {
          base: {
            sources: [tokens],
          },
        },
        resolutionOrder: [{ $ref: '#/sets/base' }],
      }

      const time = await measureTime(() => dispersa.resolveTokens(resolver))

      expect(time).toBeLessThan(50)
      console.log(`  ✓ Resolved 20-deep alias chain in ${time.toFixed(2)}ms`)
    })
  })

  describe('Permutation Generation Performance', () => {
    it('should generate permutations efficiently', async () => {
      const resolver: ResolverDocument = {
        version: '2025.10',
        sets: {
          base: {
            sources: [generateTokens(100)],
          },
        },
        modifiers: {
          theme: {
            contexts: {
              light: [{}],
              dark: [{}],
            },
            default: 'light',
          },
          scale: {
            contexts: {
              small: [{}],
              medium: [{}],
              large: [{}],
            },
            default: 'medium',
          },
        },
        resolutionOrder: [{ $ref: '#/sets/base' }],
      }

      const time = await measureTime(() => dispersa.resolveAllPermutations(resolver))

      // 2 themes × 3 scales = 6 permutations
      expect(time).toBeLessThan(300) // Baseline: < 300ms for 6 permutations with 100 tokens each
      console.log(`  ✓ Generated 6 permutations (100 tokens each) in ${time.toFixed(2)}ms`)
    })

    it('should handle many modifiers', async () => {
      const contexts: Record<string, any[]> = {}
      for (let i = 0; i < 5; i++) {
        contexts[`context${i}`] = [{}]
      }

      const resolver: ResolverDocument = {
        version: '2025.10',
        sets: {
          base: {
            sources: [generateTokens(50)],
          },
        },
        modifiers: {
          modifier: {
            contexts,
            default: 'context0',
          },
        },
        resolutionOrder: [{ $ref: '#/sets/base' }],
      }

      const time = await measureTime(() => dispersa.resolveAllPermutations(resolver))

      expect(time).toBeLessThan(200)
      console.log(`  ✓ Generated 5 permutations (50 tokens each) in ${time.toFixed(2)}ms`)
    })
  })

  describe('Complex Resolution Scenarios', () => {
    it('should handle nested groups efficiently', async () => {
      const tokens: Record<string, any> = {}

      // Create deeply nested structure
      let current = tokens
      for (let i = 0; i < 10; i++) {
        current[`level${i}`] = {}
        for (let j = 0; j < 10; j++) {
          current[`level${i}`][`token${j}`] = {
            $value: { colorSpace: 'srgb', components: [0.5, 0.5, 0.5] },
            $type: 'color',
          }
        }
        current = current[`level${i}`]
      }

      const resolver: ResolverDocument = {
        version: '2025.10',
        sets: {
          base: {
            sources: [tokens],
          },
        },
        resolutionOrder: [{ $ref: '#/sets/base' }],
      }

      const time = await measureTime(() => dispersa.resolveTokens(resolver))

      expect(time).toBeLessThan(150)
      console.log(`  ✓ Resolved nested groups (10 levels × 10 tokens) in ${time.toFixed(2)}ms`)
    })

    it('should handle multiple sets efficiently', async () => {
      const resolver: ResolverDocument = {
        version: '2025.10',
        sets: {
          primitives: {
            sources: [generateTokens(200)],
          },
          semantic: {
            sources: [generateTokens(200)],
          },
          components: {
            sources: [generateTokens(200)],
          },
        },
        resolutionOrder: [
          { $ref: '#/sets/primitives' },
          { $ref: '#/sets/semantic' },
          { $ref: '#/sets/components' },
        ],
      }

      const time = await measureTime(() => dispersa.resolveTokens(resolver))

      expect(time).toBeLessThan(250)
      console.log(`  ✓ Resolved 3 sets (200 tokens each) in ${time.toFixed(2)}ms`)
    })
  })

  describe('Memory Efficiency', () => {
    it('should not leak memory during repeated resolutions', async () => {
      const resolver: ResolverDocument = {
        version: '2025.10',
        sets: {
          base: {
            sources: [generateTokens(100)],
          },
        },
        resolutionOrder: [{ $ref: '#/sets/base' }],
      }

      // Run multiple times to check for memory leaks
      const iterations = 10
      const times: number[] = []

      for (let i = 0; i < iterations; i++) {
        const time = await measureTime(() => dispersa.resolveTokens(resolver))
        times.push(time)
      }

      // Times should remain relatively consistent (no memory buildup)
      const avgTime = times.reduce((a, b) => a + b, 0) / times.length
      const maxDeviation = Math.max(...times.map((t) => Math.abs(t - avgTime)))

      expect(maxDeviation).toBeLessThan(avgTime * 0.5) // Less than 50% deviation
      console.log(
        `  ✓ Consistent performance over ${iterations} iterations (avg: ${avgTime.toFixed(2)}ms, max deviation: ${maxDeviation.toFixed(2)}ms)`,
      )
    })
  })
})
