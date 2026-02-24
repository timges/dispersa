import { describe, expect, it } from 'vitest'

import { resolveTokens } from '../../../dist'
import type { ResolverDocument } from '../../../src/resolution/types'
const srgb = (red: number, green: number, blue: number) => ({
  colorSpace: 'srgb',
  components: [red, green, blue],
})

describe('Resolution order behavior', () => {
  it('applies sets in resolutionOrder sequence (later overrides earlier)', async () => {
    const resolver: ResolverDocument = {
      version: '2025.10',
      sets: {
        base: {
          sources: [
            {
              color: {
                primary: {
                  $type: 'color',
                  $value: srgb(0, 0, 1),
                },
              },
            },
          ],
        },
        override: {
          sources: [
            {
              color: {
                primary: {
                  $type: 'color',
                  $value: srgb(1, 0, 0),
                },
              },
            },
          ],
        },
      },
      resolutionOrder: [{ $ref: '#/sets/base' }, { $ref: '#/sets/override' }],
    }

    const tokens = await resolveTokens(resolver)

    expect(tokens['color.primary']?.$value).toEqual(srgb(1, 0, 0))
  })

  it('respects resolutionOrder even when set definitions are reordered', async () => {
    const resolver: ResolverDocument = {
      version: '2025.10',
      sets: {
        override: {
          sources: [
            {
              color: {
                primary: {
                  $type: 'color',
                  $value: srgb(1, 0, 0),
                },
              },
            },
          ],
        },
        base: {
          sources: [
            {
              color: {
                primary: {
                  $type: 'color',
                  $value: srgb(0, 0, 1),
                },
              },
            },
          ],
        },
      },
      resolutionOrder: [{ $ref: '#/sets/base' }, { $ref: '#/sets/override' }],
    }

    const tokens = await resolveTokens(resolver)

    expect(tokens['color.primary']?.$value).toEqual(srgb(1, 0, 0))
  })
})
