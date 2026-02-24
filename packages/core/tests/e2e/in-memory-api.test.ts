/**
 * @fileoverview E2E tests for in-memory mode without filesystem access
 */

import { describe, expect, it } from 'vitest'

import { build, resolveAllPermutations, resolveTokens } from '../../src/dispersa'
import { css, json } from '../../src/index'
import type { ResolverDocument } from '../../src/resolution/types'
import { colorToHex, dimensionToRem } from '../../src/transforms'

describe('In-Memory API E2E Tests', () => {
  describe('Inline Resolver Documents', () => {
    it('should accept inline resolver object instead of file path', async () => {
      const resolver: ResolverDocument = {
        version: '2025.10',
        sets: {
          base: {
            sources: [
              {
                color: {
                  primary: {
                    $value: {
                      colorSpace: 'srgb',
                      components: [0, 0.5, 1],
                    },
                    $type: 'color',
                  },
                  secondary: {
                    $value: {
                      colorSpace: 'srgb',
                      components: [1, 0.5, 0],
                    },
                    $type: 'color',
                  },
                },
              },
            ],
          },
        },
        resolutionOrder: [{ $ref: '#/sets/base' }],
      }

      const tokens = await resolveTokens(resolver)

      expect(tokens).toBeDefined()
      expect(tokens['color.primary']).toBeDefined()
      expect(tokens['color.primary'].$value).toEqual({
        colorSpace: 'srgb',
        components: [0, 0.5, 1],
      })
      expect(tokens['color.secondary']).toBeDefined()
    })

    it('should support modifiers in inline resolver', async () => {
      const resolver: ResolverDocument = {
        version: '2025.10',
        sets: {
          base: {
            sources: [
              {
                color: {
                  background: {
                    $value: { colorSpace: 'srgb', components: [1, 1, 1] },
                    $type: 'color',
                  },
                },
              },
            ],
          },
        },
        modifiers: {
          theme: {
            contexts: {
              light: [
                {
                  color: {
                    background: {
                      $value: { colorSpace: 'srgb', components: [1, 1, 1] },
                      $type: 'color',
                    },
                  },
                },
              ],
              dark: [
                {
                  color: {
                    background: {
                      $value: { colorSpace: 'srgb', components: [0.1, 0.1, 0.1] },
                      $type: 'color',
                    },
                  },
                },
              ],
            },
            default: 'light',
          },
        },
        resolutionOrder: [{ $ref: '#/sets/base' }, { $ref: '#/modifiers/theme' }],
      }

      const lightTokens = await resolveTokens(resolver, { theme: 'light' })
      const darkTokens = await resolveTokens(resolver, { theme: 'dark' })

      expect(lightTokens['color.background'].$value).toEqual({
        colorSpace: 'srgb',
        components: [1, 1, 1],
      })
      expect(darkTokens['color.background'].$value).toEqual({
        colorSpace: 'srgb',
        components: [0.1, 0.1, 0.1],
      })
    })

    it('should resolve all permutations from inline resolver', async () => {
      const resolver: ResolverDocument = {
        version: '2025.10',
        sets: {
          base: {
            sources: [
              {
                spacing: {
                  small: {
                    $value: { value: 8, unit: 'px' },
                    $type: 'dimension',
                  },
                },
              },
            ],
          },
        },
        modifiers: {
          scale: {
            contexts: {
              mobile: [
                {
                  spacing: {
                    small: {
                      $value: { value: 8, unit: 'px' },
                      $type: 'dimension',
                    },
                  },
                },
              ],
              desktop: [
                {
                  spacing: {
                    small: {
                      $value: { value: 12, unit: 'px' },
                      $type: 'dimension',
                    },
                  },
                },
              ],
            },
            default: 'mobile',
          },
        },
        resolutionOrder: [{ $ref: '#/sets/base' }, { $ref: '#/modifiers/scale' }],
      }

      const permutations = await resolveAllPermutations(resolver)

      expect(permutations).toHaveLength(2)
      expect(permutations.some((p) => p.modifierInputs.scale === 'mobile')).toBe(true)
      expect(permutations.some((p) => p.modifierInputs.scale === 'desktop')).toBe(true)
    })

    it('should return modifier inputs using resolver casing', async () => {
      const resolver: ResolverDocument = {
        version: '2025.10',
        sets: {
          base: {
            sources: [
              {
                color: {
                  primary: {
                    $value: { colorSpace: 'srgb', components: [0, 0, 0] },
                    $type: 'color',
                  },
                },
              },
            ],
          },
        },
        modifiers: {
          Theme: {
            contexts: {
              LightMode: [],
              DarkMode: [],
            },
            default: 'LightMode',
          },
        },
        resolutionOrder: [{ $ref: '#/sets/base' }, { $ref: '#/modifiers/Theme' }],
      }

      const permutations = await resolveAllPermutations(resolver)
      const contexts = permutations.map(
        (perm: { modifierInputs: { Theme: string } }) => perm.modifierInputs.Theme,
      )

      expect(contexts).toContain('LightMode')
      expect(contexts).toContain('DarkMode')
    })

    it('should skip reference resolution in warn mode without throwing', async () => {
      const resolver: ResolverDocument = {
        version: '2025.10',
        sets: {
          base: {
            sources: [
              {
                color: {
                  primary: {
                    $ref: '#/missing/value',
                  },
                },
              },
            ],
          },
        },
        resolutionOrder: [{ $ref: '#/sets/base' }],
      }

      const tokens = await resolveTokens(resolver, {}, { mode: 'warn' })
      expect(tokens['color.primary']?.$ref).toBe('#/missing/value')
    })
  })

  describe('In-Memory Build Without Filesystem', () => {
    it('should build in-memory and return content without writing files', async () => {
      const resolver: ResolverDocument = {
        version: '2025.10',
        sets: {
          base: {
            sources: [
              {
                color: {
                  primary: {
                    $value: { colorSpace: 'srgb', components: [0, 0, 1] },
                    $type: 'color',
                  },
                },
                spacing: {
                  small: {
                    $value: { value: 8, unit: 'px' },
                    $type: 'dimension',
                  },
                },
              },
            ],
          },
        },
        resolutionOrder: [{ $ref: '#/sets/base' }],
      }

      const result = await build({
        resolver,
        outputs: [
          css({
            name: 'css',
            preset: 'standalone',
            selector: ':root',
            minify: false,
            transforms: [colorToHex(), dimensionToRem()],
          }),
          json({
            name: 'json',
            preset: 'standalone',
            structure: 'flat',
            includeMetadata: false,
            minify: false,
          }),
        ],
      })

      expect(result.success).toBe(true)
      expect(result.outputs).toHaveLength(2)

      const cssOutput = result.outputs.find((o) => o.name === 'css')
      const jsonOutput = result.outputs.find((o) => o.name === 'json')

      expect(cssOutput).toBeDefined()
      expect(cssOutput!.path).toBe('css-base.css')
      expect(cssOutput!.content).toContain(':root {')
      expect(cssOutput!.content).toContain('--color-primary:')

      expect(jsonOutput).toBeDefined()
      expect(jsonOutput!.path).toBe('json-base.json')
      const parsed = JSON.parse(jsonOutput!.content)
      expect(parsed['color.primary']).toBeDefined()
    })

    it('should build with bundle renderers in-memory', async () => {
      const resolver: ResolverDocument = {
        version: '2025.10',
        sets: {
          base: {
            sources: [
              {
                color: {
                  text: {
                    $value: { colorSpace: 'srgb', components: [0, 0, 0] },
                    $type: 'color',
                  },
                },
              },
            ],
          },
        },
        modifiers: {
          theme: {
            contexts: {
              light: [
                {
                  color: {
                    text: {
                      $value: { colorSpace: 'srgb', components: [0, 0, 0] },
                      $type: 'color',
                    },
                  },
                },
              ],
              dark: [
                {
                  color: {
                    text: {
                      $value: { colorSpace: 'srgb', components: [1, 1, 1] },
                      $type: 'color',
                    },
                  },
                },
              ],
            },
            default: 'light',
          },
        },
        resolutionOrder: [{ $ref: '#/sets/base' }, { $ref: '#/modifiers/theme' }],
      }

      const result = await build({
        resolver,
        outputs: [
          css({
            name: 'css',
            preset: 'bundle',
            // No selector - uses default behavior
            transforms: [colorToHex()],
          }),
        ],
      })

      expect(result.success).toBe(true)
      expect(result.outputs).toHaveLength(1)

      const bundledCss = result.outputs[0].content
      expect(bundledCss).toContain(':root')
      expect(bundledCss).toContain('[data-theme="dark"]')
    })

    it('should handle multiple permutations in-memory', async () => {
      const resolver: ResolverDocument = {
        version: '2025.10',
        sets: {
          base: {
            sources: [
              {
                fontSize: {
                  base: {
                    $value: { value: 16, unit: 'px' },
                    $type: 'dimension',
                  },
                },
              },
            ],
          },
        },
        modifiers: {
          scale: {
            contexts: {
              small: [
                { fontSize: { base: { $value: { value: 14, unit: 'px' }, $type: 'dimension' } } },
              ],
              medium: [
                { fontSize: { base: { $value: { value: 16, unit: 'px' }, $type: 'dimension' } } },
              ],
              large: [
                { fontSize: { base: { $value: { value: 18, unit: 'px' }, $type: 'dimension' } } },
              ],
            },
            default: 'medium',
          },
        },
        resolutionOrder: [{ $ref: '#/sets/base' }, { $ref: '#/modifiers/scale' }],
      }

      const result = await build({
        resolver,
        outputs: [
          json({
            name: 'json',
            preset: 'standalone',
            structure: 'flat',
            includeMetadata: false,
            minify: false,
          }),
        ],
      })

      expect(result.success).toBe(true)
      expect(result.outputs).toHaveLength(3) // small, medium, large

      const outputPaths = result.outputs.map((output) => output.path)
      expect(outputPaths).toEqual(
        expect.arrayContaining([
          'json-base.json',
          'json-scale-small.json',
          'json-scale-large.json',
        ]),
      )

      result.outputs.forEach((output) => {
        const parsed = JSON.parse(output.content)
        expect(parsed['fontSize.base']).toBeDefined()
        expect(parsed['fontSize.base'].value).toBeGreaterThan(0)
      })
    })
  })

  describe('Custom Transform Pipeline In-Memory', () => {
    it('should apply custom transforms without filesystem', async () => {
      const resolver: ResolverDocument = {
        version: '2025.10',
        sets: {
          base: {
            sources: [
              {
                spacing: {
                  small: { $value: { value: 4, unit: 'px' }, $type: 'dimension' },
                  medium: { $value: { value: 8, unit: 'px' }, $type: 'dimension' },
                  large: { $value: { value: 16, unit: 'px' }, $type: 'dimension' },
                },
              },
            ],
          },
        },
        resolutionOrder: [{ $ref: '#/sets/base' }],
      }

      const customDoubleTransform = {
        name: 'custom/double',
        matcher: (token) => token.$type === 'dimension',
        transform: (token) => {
          const dimValue = token.$value as { value: number; unit: string }
          return {
            ...token,
            $value: { value: dimValue.value * 2, unit: dimValue.unit },
          }
        },
      }

      const result = await build({
        resolver,
        outputs: [
          json({
            name: 'json',
            file: 'tokens.json',
            preset: 'standalone',
            structure: 'flat',
            includeMetadata: false,
            minify: false,
            transforms: [customDoubleTransform],
          }),
        ],
      })

      expect(result.success).toBe(true)

      const parsed = JSON.parse(result.outputs[0].content)
      expect(parsed['spacing.small'].value).toBe(8) // 4 * 2
      expect(parsed['spacing.medium'].value).toBe(16) // 8 * 2
      expect(parsed['spacing.large'].value).toBe(32) // 16 * 2
    })
  })
})
