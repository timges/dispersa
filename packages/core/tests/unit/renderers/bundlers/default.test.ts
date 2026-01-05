import { describe, expect, it, vi } from 'vitest'

import type { ResolvedTokens } from '../../../../src/lib/tokens/types'
import type { BundleDataItem } from '../../../../src/renderers/bundlers/types'
import { bundleAsDefault } from '../../../../src/renderers/bundlers/default'

describe('Default Bundler', () => {
  const mockTokens: ResolvedTokens = {
    'color.red': {
      $value: '#ff0000',
      $type: 'color',
      path: ['color', 'red'],
      name: 'color.red',
      originalValue: '#ff0000',
    },
  }

  it('should label base and override permutations', async () => {
    const bundleData: BundleDataItem[] = [
      { tokens: mockTokens, modifierInputs: { theme: 'light' }, isBase: true },
      { tokens: mockTokens, modifierInputs: { theme: 'dark' }, isBase: false },
    ]

    const formatTokens = vi.fn().mockResolvedValue('--color-red: #ff0000;')
    const result = await bundleAsDefault(bundleData, formatTokens)

    expect(result).toContain('/* Base theme: light */')
    expect(result).toContain('/* Overrides: dark */')
  })
})
