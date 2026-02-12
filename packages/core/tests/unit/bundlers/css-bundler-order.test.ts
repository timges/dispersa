import { describe, expect, it } from 'vitest'

import type { ResolverDocument } from '../../../src/resolution/resolution.types'
import { bundleAsCss } from '../../../src/renderers/bundlers/css'

describe('CSS bundler ordering', () => {
  it('should order single-dimension modifiers by resolutionOrder', async () => {
    const resolver: ResolverDocument = {
      version: '2025.10',
      sets: {
        base: {
          sources: [
            {
              color: {
                primary: {
                  $value: '#000000',
                  $type: 'color',
                },
              },
            },
          ],
        },
      },
      modifiers: {
        platform: {
          contexts: { web: [], mobile: [] },
          default: 'web',
        },
        theme: {
          contexts: { light: [], dark: [] },
          default: 'light',
        },
      },
      resolutionOrder: [
        { $ref: '#/sets/base' },
        { $ref: '#/modifiers/platform' },
        { $ref: '#/modifiers/theme' },
      ],
    }

    const baseTokens = {
      'color.primary': {
        $value: '#000000',
        $type: 'color',
        path: ['color', 'primary'],
        name: 'color.primary',
        originalValue: '#000000',
        _sourceSet: 'base',
      },
    }

    const bundleData = [
      {
        tokens: baseTokens,
        modifierInputs: { platform: 'web', theme: 'light' },
        isBase: true,
      },
      {
        tokens: baseTokens,
        modifierInputs: { platform: 'mobile', theme: 'light' },
        isBase: false,
      },
      {
        tokens: baseTokens,
        modifierInputs: { platform: 'web', theme: 'dark' },
        isBase: false,
      },
    ]

    const output = await bundleAsCss(bundleData, resolver, undefined, async () => {
      return ':root{}'
    })

    const baseIndex = output.indexOf('/* Set: base */')
    const platformIndex = output.indexOf('/* Modifier: platform=mobile */')
    const themeIndex = output.indexOf('/* Modifier: theme=dark */')

    expect(baseIndex).toBeGreaterThanOrEqual(0)
    expect(platformIndex).toBeGreaterThanOrEqual(0)
    expect(themeIndex).toBeGreaterThanOrEqual(0)
    expect(baseIndex).toBeLessThan(platformIndex)
    expect(platformIndex).toBeLessThan(themeIndex)
  })

  it('should place base before modifiers even when default is not the first context key', async () => {
    const resolver: ResolverDocument = {
      version: '2025.10',
      sets: {
        base: {
          sources: [
            {
              color: {
                primary: {
                  $value: '#000000',
                  $type: 'color',
                },
              },
            },
          ],
        },
      },
      modifiers: {
        platform: {
          // "mobile" listed before "desktop", but default is "desktop"
          contexts: { mobile: [], desktop: [] },
          default: 'desktop',
        },
        theme: {
          contexts: { light: [], dark: [] },
          default: 'light',
        },
      },
      resolutionOrder: [
        { $ref: '#/sets/base' },
        { $ref: '#/modifiers/platform' },
        { $ref: '#/modifiers/theme' },
      ],
    }

    const baseTokens = {
      'color.primary': {
        $value: '#000000',
        $type: 'color',
        path: ['color', 'primary'],
        name: 'color.primary',
        originalValue: '#000000',
        _sourceSet: 'base',
      },
    }

    const bundleData = [
      {
        tokens: baseTokens,
        modifierInputs: { platform: 'desktop', theme: 'light' },
        isBase: true,
      },
      {
        tokens: baseTokens,
        modifierInputs: { platform: 'mobile', theme: 'light' },
        isBase: false,
      },
      {
        tokens: baseTokens,
        modifierInputs: { platform: 'desktop', theme: 'dark' },
        isBase: false,
      },
    ]

    const output = await bundleAsCss(bundleData, resolver, undefined, async () => {
      return ':root{}'
    })

    const baseIndex = output.indexOf('/* Set: base */')
    const platformIndex = output.indexOf('/* Modifier: platform=mobile */')
    const themeIndex = output.indexOf('/* Modifier: theme=dark */')

    expect(baseIndex).toBeGreaterThanOrEqual(0)
    expect(platformIndex).toBeGreaterThanOrEqual(0)
    expect(themeIndex).toBeGreaterThanOrEqual(0)
    expect(baseIndex).toBeLessThan(platformIndex)
    expect(platformIndex).toBeLessThan(themeIndex)
  })
})
