import { describe, expect, it, vi } from 'vitest'

import type { ResolverDocument } from '../../../../src/lib/resolution/resolution.types'
import type { ResolvedTokens } from '../../../../src/lib/tokens/types'
import type { BundleDataItem } from '../../../../src/renderers/bundlers/types'
import { bundleAsJsModule } from '../../../../src/renderers/bundlers/js'

describe('JavaScript Module Bundler', () => {
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
      $value: '#ff0000',
      $type: 'color',
      path: ['color', 'red'],
      name: 'color.red',
      originalValue: '#ff0000',
    },
  }

  const createFormatter = () =>
    vi
      .fn()
      .mockResolvedValue(
        ['const tokens = {', "  'color.red': '#ff0000'", '}', '', 'export default tokens'].join(
          '\n',
        ),
      )

  function evalBundle(code: string): { tokenBundle: any; getTokens?: (modifiers?: any) => any } {
    // The bundler outputs ESM syntax; convert it to a callable function body for testing.
    const transformed = code
      .replace(/export function getTokens/g, 'function getTokens')
      .replace(/export default tokenBundle/g, '')

    // eslint-disable-next-line no-new-func
    const fn = new Function(`${transformed}\nreturn { tokenBundle, getTokens }`)
    return fn() as any
  }

  it('should include metadata and tokens bundle', async () => {
    const bundleData: BundleDataItem[] = [
      { tokens: mockTokens, modifierInputs: { theme: 'light' }, isBase: true },
      { tokens: mockTokens, modifierInputs: { theme: 'dark' }, isBase: false },
    ]

    const formatTokens = createFormatter()
    const output = await bundleAsJsModule(
      bundleData,
      mockResolver,
      { generateHelper: true },
      formatTokens,
    )

    expect(output).toContain('_meta')
    expect(output).toContain('tokenBundle')
    expect(output).toContain('getTokens')
  })

  it('getTokens() should return the matching permutation tokens', async () => {
    const resolver: ResolverDocument = {
      modifiers: {
        theme: {
          contexts: { light: [], dark: [] },
          default: 'light',
        },
        scale: {
          contexts: { mobile: [], desktop: [] },
          default: 'mobile',
        },
      },
      sets: {},
      resolutionOrder: [],
    }

    // Intentionally insert keys out of order to ensure stable keying.
    const modifierInputs = { scale: 'desktop', theme: 'dark' }

    const bundleData: BundleDataItem[] = [{ tokens: mockTokens, modifierInputs, isBase: false }]
    const output = await bundleAsJsModule(
      bundleData,
      resolver,
      { generateHelper: true },
      createFormatter(),
    )

    const evaluated = evalBundle(output)
    expect(evaluated.getTokens).toBeTypeOf('function')
    const resultTokens = evaluated.getTokens?.({ theme: 'dark', scale: 'desktop' })
    expect(resultTokens).toBeDefined()
    expect(resultTokens).toHaveProperty('color.red')
  })

  it('should call formatter for each permutation', async () => {
    const bundleData: BundleDataItem[] = [
      { tokens: mockTokens, modifierInputs: { theme: 'light' }, isBase: true },
      { tokens: mockTokens, modifierInputs: { theme: 'dark' }, isBase: false },
    ]

    const formatTokens = createFormatter()
    await bundleAsJsModule(bundleData, mockResolver, { generateHelper: false }, formatTokens)
    expect(formatTokens).toHaveBeenCalledTimes(2)
  })
})
