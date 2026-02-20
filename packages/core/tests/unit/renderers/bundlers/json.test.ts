import { describe, expect, it, vi } from 'vitest'

import type { ResolverDocument } from '../../../../src/resolution/types'
import type { ResolvedTokens } from '../../../../src/tokens/types'
import type { BundleDataItem } from '../../../../src/renderers/bundlers/types'
import { bundleAsJson } from '../../../../src/renderers/bundlers/json'

describe('JSON Bundler', () => {
  const mockResolver: ResolverDocument = {
    modifiers: {
      theme: {
        contexts: {
          light: { tokens: {} },
          dark: { tokens: {} },
        },
        default: 'light',
      },
    },
    sets: {},
    resolutionOrder: [],
  }

  const mockTokens: ResolvedTokens = {
    'color.red': {
      $value: { colorSpace: 'srgb', components: [1, 0, 0] },
      $type: 'color',
      path: ['color', 'red'],
      name: 'color.red',
      originalValue: '#ff0000',
      _sourceModifier: 'theme-light',
    },
  }

  const formatTokens = vi.fn().mockResolvedValue(JSON.stringify({ 'color.red': '#ff0000' }))

  it('should create bundle with metadata', async () => {
    const bundleData: BundleDataItem[] = [
      { tokens: mockTokens, modifierInputs: { theme: 'light' }, isBase: true },
    ]

    const result = await bundleAsJson(bundleData, mockResolver, formatTokens)
    const parsed = JSON.parse(result)

    expect(parsed).toHaveProperty('_meta')
    expect(parsed).toHaveProperty('tokens')
    expect(parsed._meta).toHaveProperty('dimensions')
    expect(parsed._meta).toHaveProperty('defaults')
  })

  it('should store tokens with correct keys', async () => {
    const bundleData: BundleDataItem[] = [
      { tokens: mockTokens, modifierInputs: { theme: 'light' }, isBase: true },
      { tokens: mockTokens, modifierInputs: { theme: 'dark' }, isBase: false },
    ]

    const result = await bundleAsJson(bundleData, mockResolver, formatTokens)
    const parsed = JSON.parse(result)

    expect(parsed.tokens).toHaveProperty('theme=light')
    expect(parsed.tokens).toHaveProperty('theme=dark')
  })

  it('should strip internal metadata before formatting', async () => {
    const bundleData: BundleDataItem[] = [
      { tokens: mockTokens, modifierInputs: { theme: 'light' }, isBase: true },
    ]

    const formatter = vi.fn().mockResolvedValue(JSON.stringify({ ok: true }))
    await bundleAsJson(bundleData, mockResolver, formatter)

    const calledWith = formatter.mock.calls[0]?.[0] as ResolvedTokens
    expect(calledWith['color.red']).not.toHaveProperty('_sourceModifier')
  })
})
