/**
 * @fileoverview Performance benchmarks for transforms
 * Baseline: < 50ms for 1000 token transformations
 */

import { describe, expect, it } from 'vitest'
import { colorToHex, dimensionToRem, nameKebabCase } from '../../src/transforms'
import type { ResolvedToken } from '../../src/tokens/types'

describe('Transform Performance Benchmarks', () => {
  function generateColorTokens(count: number): ResolvedToken[] {
    return Array.from({ length: count }, (_, i) => ({
      $value: { colorSpace: 'srgb', components: [Math.random(), Math.random(), Math.random()] },
      $type: 'color' as const,
      path: ['color', `token${i}`],
      name: `color.token${i}`,
      originalValue: { colorSpace: 'srgb', components: [0.5, 0.5, 0.5] },
    }))
  }

  async function measureTime(fn: () => void): Promise<number> {
    const start = performance.now()
    fn()
    return performance.now() - start
  }

  it('should transform 1000 color tokens quickly', async () => {
    const tokens = generateColorTokens(1000)
    const time = await measureTime(() => tokens.forEach((t) => colorToHex.transform(t)))

    expect(time).toBeLessThan(50)
    console.log(`  ✓ Transformed 1000 colors to hex in ${time.toFixed(2)}ms`)
  })

  it('should transform dimension tokens efficiently', async () => {
    const tokens = Array.from({ length: 1000 }, (_, i) => ({
      $value: { value: 16, unit: 'px' },
      $type: 'dimension' as const,
      path: ['spacing', `token${i}`],
      name: `spacing.token${i}`,
      originalValue: { value: 16, unit: 'px' },
    }))

    const time = await measureTime(() => tokens.forEach((t) => dimensionToRem.transform(t)))

    expect(time).toBeLessThan(30)
    console.log(`  ✓ Transformed 1000 dimensions in ${time.toFixed(2)}ms`)
  })

  it('should transform names efficiently', async () => {
    const tokens = Array.from({ length: 1000 }, (_, i) => ({
      $value: 1,
      $type: 'number' as const,
      path: ['test', 'deeply', 'nested', `token${i}`],
      name: `test.deeply.nested.token${i}`,
      originalValue: 1,
    }))

    const time = await measureTime(() => tokens.forEach((t) => nameKebabCase.transform(t)))

    expect(time).toBeLessThan(40)
    console.log(`  ✓ Transformed 1000 names in ${time.toFixed(2)}ms`)
  })
})
