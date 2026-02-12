import { describe, expect, it, vi } from 'vitest'

import type { ResolverDocument } from '../../../src/resolution/resolution.types'
import { Dispersa } from '../../../src/dispersa'

describe('Pipeline $ref Resolution', () => {
  it('resolves embedded JSON Pointer $ref values before flattening', async () => {
    const resolver: ResolverDocument = {
      version: '2025.10',
      sets: {
        base: {
          sources: [
            {
              color: {
                base: {
                  $type: 'color',
                  $value: {
                    colorSpace: 'srgb',
                    components: [0.2, 0.4, 0.9],
                  },
                },
                derived: {
                  $type: 'color',
                  $value: {
                    colorSpace: 'srgb',
                    components: [
                      { $ref: '#/color/base/$value/components/0' },
                      { $ref: '#/color/base/$value/components/1' },
                      0.7,
                    ],
                  },
                },
              },
            },
          ],
        },
      },
      resolutionOrder: [{ $ref: '#/sets/base' }],
    }

    const dispersa = new Dispersa()
    const tokens = await dispersa.resolveTokens(resolver)

    expect(tokens['color.derived'].$value).toEqual({
      colorSpace: 'srgb',
      components: [0.2, 0.4, 0.7],
    })
  })

  it('resolves token-level $ref objects before alias resolution', async () => {
    const resolver: ResolverDocument = {
      version: '2025.10',
      sets: {
        base: {
          sources: [
            {
              color: {
                base: {
                  $type: 'color',
                  $value: {
                    colorSpace: 'srgb',
                    components: [0.1, 0.2, 0.3],
                  },
                },
                alias: {
                  $ref: '#/color/base',
                },
              },
            },
          ],
        },
      },
      resolutionOrder: [{ $ref: '#/sets/base' }],
    }

    const dispersa = new Dispersa()
    const tokens = await dispersa.resolveTokens(resolver)

    expect(tokens['color.alias'].$value).toEqual({
      colorSpace: 'srgb',
      components: [0.1, 0.2, 0.3],
    })
  })

  it('keeps token-level $ref as a token when referencing $value', async () => {
    const resolver: ResolverDocument = {
      version: '2025.10',
      sets: {
        base: {
          sources: [
            {
              colors: {
                blue: {
                  $type: 'color',
                  $value: {
                    colorSpace: 'srgb',
                    components: [0.2, 0.4, 0.9],
                  },
                },
                primary: {
                  $type: 'color',
                  $ref: '#/colors/blue/$value',
                },
              },
            },
          ],
        },
      },
      resolutionOrder: [{ $ref: '#/sets/base' }],
    }

    const dispersa = new Dispersa()
    const tokens = await dispersa.resolveTokens(resolver)

    expect(tokens['colors.primary'].$value).toEqual({
      colorSpace: 'srgb',
      components: [0.2, 0.4, 0.9],
    })
  })

  it('infers $type for pure alias and token-level $ref tokens', async () => {
    const resolver: ResolverDocument = {
      version: '2025.10',
      sets: {
        base: {
          sources: [
            {
              color: {
                base: {
                  $type: 'color',
                  $value: {
                    colorSpace: 'srgb',
                    components: [0.2, 0.4, 0.9],
                  },
                },
                viaAlias: {
                  $value: '{color.base}',
                },
                viaRef: {
                  $ref: '#/color/base/$value',
                },
              },
            },
          ],
        },
      },
      resolutionOrder: [{ $ref: '#/sets/base' }],
    }

    const dispersa = new Dispersa()
    const tokens = await dispersa.resolveTokens(resolver)

    expect(tokens['color.viaAlias'].$type).toBe('color')
    expect(tokens['color.viaRef'].$type).toBe('color')
  })

  it('throws on type mismatch for pure alias and token-level $ref by default', async () => {
    const resolver: ResolverDocument = {
      version: '2025.10',
      sets: {
        base: {
          sources: [
            {
              dimension: {
                base: {
                  $type: 'dimension',
                  $value: { value: 4, unit: 'px' },
                },
              },
              color: {
                badAlias: {
                  $type: 'color',
                  $value: '{dimension.base}',
                },
                badRef: {
                  $type: 'color',
                  $ref: '#/dimension/base/$value',
                },
              },
            },
          ],
        },
      },
      resolutionOrder: [{ $ref: '#/sets/base' }],
    }

    const dispersa = new Dispersa()
    await expect(dispersa.resolveTokens(resolver)).rejects.toThrow(/type mismatch/i)
  })

  it('warns and preserves unresolved $ref objects in warn mode', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const resolver: ResolverDocument = {
      version: '2025.10',
      sets: {
        base: {
          sources: [
            {
              color: {
                base: {
                  $type: 'color',
                  $value: {
                    colorSpace: 'srgb',
                    components: [{ $ref: '#/color/missing/$value/components/0' }, 0.4, 0.7],
                  },
                },
              },
            },
          ],
        },
      },
      resolutionOrder: [{ $ref: '#/sets/base' }],
    }

    const dispersa = new Dispersa({ validation: { mode: 'warn' } })
    const tokens = await dispersa.resolveTokens(resolver)

    expect(tokens['color.base'].$value).toEqual({
      colorSpace: 'srgb',
      components: [{ $ref: '#/color/missing/$value/components/0' }, 0.4, 0.7],
    })
    expect(warn).toHaveBeenCalled()
    warn.mockRestore()
  })
})
