import * as path from 'node:path'

import { beforeEach, describe, expect, it } from 'vitest'

import { ResolverParser } from '../../src/adapters/filesystem/resolver-parser'
import { ReferenceResolver, ResolutionEngine } from '../../src/resolution'
import type { ResolverDocument } from '../../src/resolution/types'
import { TokenParser } from '../../src/tokens/token-parser'
import { ConfigurationError } from '../../src/shared/errors'
import { getFixturePath } from '../utils/test-helpers'

const srgb = (red: number, green: number, blue: number) => ({
  colorSpace: 'srgb',
  components: [red, green, blue],
})

const colorDoc = (red: number, green: number, blue: number) => ({
  color: {
    primary: {
      $type: 'color',
      $value: srgb(red, green, blue),
    },
  },
})

describe('Resolver Integration Tests', () => {
  let parser: ResolverParser
  let refResolver: ReferenceResolver

  beforeEach(() => {
    parser = new ResolverParser()
    const fixturesDir = path.dirname(getFixturePath('tokens.resolver.json'))
    refResolver = new ReferenceResolver(fixturesDir)
  })

  describe('Resolver Document Parsing', () => {
    it('should parse resolver file successfully', async () => {
      const resolverPath = getFixturePath('tokens.resolver.json')
      const resolver = await parser.parseFile(resolverPath)

      expect(resolver).toBeDefined()
      expect(resolver.version).toBe('2025.10')
      expect(resolver.name).toBe('Test Token Set')
    })

    it('should validate resolver version', async () => {
      const resolverPath = getFixturePath('tokens.resolver.json')
      const resolver = await parser.parseFile(resolverPath)

      expect(resolver.version).toBe('2025.10')
    })

    it('should parse sets correctly', async () => {
      const resolverPath = getFixturePath('tokens.resolver.json')
      const resolver = await parser.parseFile(resolverPath)

      expect(resolver.sets).toBeDefined()
      expect(resolver.sets?.base).toBeDefined()
      expect(resolver.sets?.semantic).toBeDefined()
      expect(resolver.sets?.base.sources).toHaveLength(6)
      expect(resolver.sets?.semantic.sources).toHaveLength(1)
    })

    it('should parse modifiers correctly', async () => {
      const resolverPath = getFixturePath('tokens.resolver.json')
      const resolver = await parser.parseFile(resolverPath)

      expect(resolver.modifiers).toBeDefined()
      expect(resolver.modifiers?.theme).toBeDefined()
      expect(resolver.modifiers?.scale).toBeDefined()

      // Check theme modifier
      const themeModifier = resolver.modifiers?.theme
      expect(themeModifier?.default).toBe('light')
      expect(themeModifier?.contexts?.light).toBeDefined()
      expect(themeModifier?.contexts?.dark).toBeDefined()

      // Check scale modifier
      const scaleModifier = resolver.modifiers?.scale
      expect(scaleModifier?.default).toBe('tablet')
      expect(scaleModifier?.contexts?.mobile).toBeDefined()
      expect(scaleModifier?.contexts?.tablet).toBeDefined()
      expect(scaleModifier?.contexts?.desktop).toBeDefined()
    })

    it('should parse resolution order correctly', async () => {
      const resolverPath = getFixturePath('tokens.resolver.json')
      const resolver = await parser.parseFile(resolverPath)

      expect(resolver.resolutionOrder).toBeDefined()
      expect(resolver.resolutionOrder).toHaveLength(4)
    })
  })

  describe('Reference Resolution', () => {
    it('should resolve file references ($ref)', async () => {
      const resolverPath = getFixturePath('tokens.resolver.json')
      const resolver = await parser.parseFile(resolverPath)

      // Resolve a set's sources
      const baseSet = resolver.sets?.base
      expect(baseSet?.sources).toBeDefined()

      const firstSource = baseSet!.sources[0]
      const resolved = await refResolver.resolve(firstSource)

      expect(resolved).toBeDefined()
      expect(resolved).toHaveProperty('color')
    })

    it('should resolve JSON Pointer references', async () => {
      const resolverPath = getFixturePath('tokens.resolver.json')
      const resolver = await parser.parseFile(resolverPath)

      // Resolve a resolution order reference
      const firstOrder = resolver.resolutionOrder[0]
      const resolved = await refResolver.resolve(
        firstOrder as unknown as Record<string, unknown>,
        resolver,
      )

      expect(resolved).toBeDefined()
      expect(resolved).toHaveProperty('sources')
    })

    it('should handle nested references', async () => {
      const resolverPath = getFixturePath('tokens.resolver.json')
      const resolver = await parser.parseFile(resolverPath)

      const baseSet = resolver.sets?.base
      const colorSource = baseSet!.sources[0]
      const colorTokens = await refResolver.resolve(colorSource, resolverPath)

      expect(colorTokens).toHaveProperty('color')
      expect((colorTokens as Record<string, unknown>).color).toHaveProperty('primitive')
      expect((colorTokens as Record<string, unknown>).color).toHaveProperty('base')
    })
  })

  describe('Resolution Engine', () => {
    it('should generate permutations correctly', async () => {
      const resolverPath = getFixturePath('tokens.resolver.json')
      const resolver = await parser.parseFile(resolverPath)
      const engine = new ResolutionEngine(resolver, refResolver)

      const permutations = engine.generatePermutations()

      // Should generate 6 permutations: 2 themes × 3 scales
      expect(permutations).toHaveLength(6)
    })

    it('should include all modifier combinations', async () => {
      const resolverPath = getFixturePath('tokens.resolver.json')
      const resolver = await parser.parseFile(resolverPath)
      const engine = new ResolutionEngine(resolver, refResolver)

      const permutations = engine.generatePermutations()

      // Check specific combinations exist
      const lightMobile = permutations.find((p) => p.theme === 'light' && p.scale === 'mobile')
      expect(lightMobile).toBeDefined()

      const darkDesktop = permutations.find((p) => p.theme === 'dark' && p.scale === 'desktop')
      expect(darkDesktop).toBeDefined()
    })

    it('should resolve with specific modifiers', async () => {
      const resolverPath = getFixturePath('tokens.resolver.json')
      const resolver = await parser.parseFile(resolverPath)
      const engine = new ResolutionEngine(resolver, refResolver)

      const tokens = await engine.resolve({ theme: 'dark', scale: 'mobile' })

      expect(tokens).toBeDefined()
      expect(Object.keys(tokens).length).toBeGreaterThan(0)
    })

    it('should merge tokens correctly (last-wins)', async () => {
      const resolverPath = getFixturePath('tokens.resolver.json')
      const resolver = await parser.parseFile(resolverPath)
      const engine = new ResolutionEngine(resolver, refResolver)
      const tokenParser = new TokenParser()

      // Light theme should have white background
      const lightRaw = await engine.resolve({ theme: 'light', scale: 'tablet' })
      const lightTokens = tokenParser.flatten(lightRaw)
      expect(lightTokens['color.base.background']).toBeDefined()
      expect(lightTokens['color.base.background'].$value).toEqual({
        colorSpace: 'srgb',
        components: [1, 1, 1],
      })

      // Dark theme should have dark background
      const darkRaw = await engine.resolve({ theme: 'dark', scale: 'tablet' })
      const darkTokens = tokenParser.flatten(darkRaw)
      expect(darkTokens['color.base.background']).toBeDefined()
      expect(darkTokens['color.base.background'].$value).toEqual({
        colorSpace: 'srgb',
        components: [0.067, 0.094, 0.153],
      })
    })

    it('should apply modifier defaults', async () => {
      const resolverPath = getFixturePath('tokens.resolver.json')
      const resolver = await parser.parseFile(resolverPath)
      const engine = new ResolutionEngine(resolver, refResolver)

      // Resolve without specifying modifiers - should use defaults
      const tokens = await engine.resolve({})

      expect(tokens).toBeDefined()
      // Default is light theme, tablet scale
      expect(Object.keys(tokens).length).toBeGreaterThan(0)
    })

    it('should require modifier input when default is missing', async () => {
      const resolver: ResolverDocument = {
        version: '2025.10',
        sets: {
          base: {
            sources: [
              {
                color: {
                  primary: {
                    $value: { colorSpace: 'srgb', components: [0, 0.27, 0.55] },
                    $type: 'color',
                  },
                },
              },
            ],
          },
        },
        modifiers: {
          theme: {
            contexts: { light: [], dark: [] },
          },
        },
        resolutionOrder: [{ $ref: '#/sets/base' }, { $ref: '#/modifiers/theme' }],
      }
      const engine = new ResolutionEngine(resolver, refResolver)

      await expect(engine.resolve({})).rejects.toThrow(ConfigurationError)
    })

    it('should handle scale modifier correctly', async () => {
      const resolverPath = getFixturePath('tokens.resolver.json')
      const resolver = await parser.parseFile(resolverPath)
      const engine = new ResolutionEngine(resolver, refResolver)
      const tokenParser = new TokenParser()

      // Mobile scale should have smaller font sizes
      const mobileRaw = await engine.resolve({ theme: 'light', scale: 'mobile' })
      const mobileTokens = tokenParser.flatten(mobileRaw)
      expect(mobileTokens['font.size.base']).toBeDefined()
      expect(mobileTokens['font.size.base'].$value).toEqual({ value: 0.875, unit: 'rem' })

      // Desktop scale should have larger font sizes
      const desktopRaw = await engine.resolve({ theme: 'light', scale: 'desktop' })
      const desktopTokens = tokenParser.flatten(desktopRaw)
      expect(desktopTokens['font.size.base']).toBeDefined()
      expect(desktopTokens['font.size.base'].$value).toEqual({ value: 1.125, unit: 'rem' })

      // Tablet (default) should have base font sizes
      const tabletRaw = await engine.resolve({ theme: 'light', scale: 'tablet' })
      const tabletTokens = tokenParser.flatten(tabletRaw)
      expect(tabletTokens['font.size.base']).toBeDefined()
      expect(tabletTokens['font.size.base'].$value).toEqual({ value: 1, unit: 'rem' })
    })

    it('should resolve all token types from base set', async () => {
      const resolverPath = getFixturePath('tokens.resolver.json')
      const resolver = await parser.parseFile(resolverPath)
      const engine = new ResolutionEngine(resolver, refResolver)

      const tokens = await engine.resolve({ theme: 'light', scale: 'tablet' })

      // Check various token types are present
      expect(tokens).toHaveProperty('color.primitive.red')
      expect(tokens).toHaveProperty('dimension.base.4')
      expect(tokens).toHaveProperty('font.family.sans')
      expect(tokens).toHaveProperty('spacing.scale.4')
      expect(tokens).toHaveProperty('shadow.elevation.md')
      expect(tokens).toHaveProperty('animation.duration.fast')
    })

    it('should preserve semantic tokens', async () => {
      const resolverPath = getFixturePath('tokens.resolver.json')
      const resolver = await parser.parseFile(resolverPath)
      const engine = new ResolutionEngine(resolver, refResolver)

      const tokens = await engine.resolve({ theme: 'light', scale: 'tablet' })

      // Check semantic tokens are present
      expect(tokens).toHaveProperty('semantic.color.text.primary')
      expect(tokens).toHaveProperty('semantic.color.background.primary')
      expect(tokens).toHaveProperty('semantic.color.action.primary')
      expect(tokens).toHaveProperty('semantic.spacing.component.padding')
    })
  })

  describe('DTCG Spec Compliance (2025.10)', () => {
    describe('Invalid Pointer Validation (Section 4.2.1)', () => {
      it('should throw error when set references a modifier', () => {
        const invalidResolver = {
          version: '2025.10',
          sets: {
            mySet: {
              sources: [{ $ref: '#/modifiers/theme' }],
            },
          },
          modifiers: {
            theme: {
              contexts: {
                light: [colorDoc(1, 1, 1)],
                dark: [colorDoc(0, 0, 0)],
              },
            },
          },
          resolutionOrder: [{ $ref: '#/sets/mySet' }],
        }

        expect(() => parser.parseInline(invalidResolver as any)).toThrow(
          /Invalid resolver document/,
        )
      })

      it('should throw error when modifier context references another modifier', () => {
        const invalidResolver = {
          version: '2025.10',
          modifiers: {
            theme: {
              contexts: {
                light: [{ $ref: '#/modifiers/size' }],
                dark: [colorDoc(0, 0, 0)],
              },
            },
            size: {
              contexts: {
                small: [{ size: '12px' }],
                large: [{ size: '16px' }],
              },
            },
          },
          resolutionOrder: [{ $ref: '#/modifiers/theme' }],
        }

        expect(() => parser.parseInline(invalidResolver as any)).toThrow(
          /Invalid resolver document/,
        )
      })

      it('should throw error when reference points to resolutionOrder', () => {
        const invalidResolver = {
          version: '2025.10',
          sets: {
            mySet: {
              sources: [{ $ref: '#/resolutionOrder/0' }],
            },
          },
          resolutionOrder: [{ $ref: '#/sets/mySet' }],
        }

        expect(() => parser.parseInline(invalidResolver as any)).toThrow(
          /Invalid resolver document/,
        )
      })
    })

    describe('Modifier Context Count Validation (Section 4.1.5.1)', () => {
      it('should throw error for modifier with 0 contexts', () => {
        const invalidResolver = {
          version: '2025.10',
          modifiers: {
            theme: {
              contexts: {},
            },
          },
          resolutionOrder: [{ $ref: '#/modifiers/theme' }],
        }

        expect(() => parser.parseInline(invalidResolver as any)).toThrow(
          /Invalid resolver document/,
        )
      })

      it('should throw error for modifier with 1 context (should use set instead)', () => {
        const invalidResolver = {
          version: '2025.10',
          modifiers: {
            theme: {
              contexts: {
                light: [colorDoc(1, 1, 1)],
              },
            },
          },
          resolutionOrder: [{ $ref: '#/modifiers/theme' }],
        }

        expect(() => parser.parseInline(invalidResolver as any)).toThrow(
          /Invalid resolver document/,
        )
      })

      it('should accept modifier with 2 or more contexts', () => {
        const validResolver = {
          version: '2025.10',
          modifiers: {
            theme: {
              contexts: {
                light: [colorDoc(1, 1, 1)],
                dark: [colorDoc(0, 0, 0)],
              },
            },
          },
          resolutionOrder: [{ $ref: '#/modifiers/theme' }],
        }

        expect(() => parser.parseInline(validResolver as any)).not.toThrow()
      })
    })

    describe('Default Value Validation', () => {
      it('should throw error when default does not match any context', () => {
        const invalidResolver = {
          version: '2025.10',
          modifiers: {
            theme: {
              default: 'medium',
              contexts: {
                light: [colorDoc(1, 1, 1)],
                dark: [colorDoc(0, 0, 0)],
              },
            },
          },
          resolutionOrder: [{ $ref: '#/modifiers/theme' }],
        }

        expect(() => parser.parseInline(invalidResolver as any)).toThrow(
          /invalid default value "medium".*Must be one of: light, dark/,
        )
      })

      it('should accept default that matches a context', () => {
        const validResolver = {
          version: '2025.10',
          modifiers: {
            theme: {
              default: 'light',
              contexts: {
                light: [colorDoc(1, 1, 1)],
                dark: [colorDoc(0, 0, 0)],
              },
            },
          },
          resolutionOrder: [{ $ref: '#/modifiers/theme' }],
        }

        expect(() => parser.parseInline(validResolver as any)).not.toThrow()
      })
    })

    describe('Input Type Validation (Section 5.2)', () => {
      it('should throw error for boolean input values', async () => {
        const resolverPath = getFixturePath('tokens.resolver.json')
        const resolver = await parser.parseFile(resolverPath)
        const engine = new ResolutionEngine(resolver, refResolver)

        await expect(engine.resolve({ theme: true as any })).rejects.toThrow(
          /Invalid input type.*Expected string but got boolean/,
        )
      })

      it('should throw error for number input values', async () => {
        const resolverPath = getFixturePath('tokens.resolver.json')
        const resolver = await parser.parseFile(resolverPath)
        const engine = new ResolutionEngine(resolver, refResolver)

        await expect(engine.resolve({ theme: 100 as any })).rejects.toThrow(
          /Invalid input type.*Expected string but got number/,
        )
      })

      it('should accept string input values', async () => {
        const resolverPath = getFixturePath('tokens.resolver.json')
        const resolver = await parser.parseFile(resolverPath)
        const engine = new ResolutionEngine(resolver, refResolver)

        await expect(engine.resolve({ theme: 'light', scale: 'tablet' })).resolves.toBeDefined()
      })
    })

    describe('Reference Object Extending (Section 4.2.2)', () => {
      it('should merge local properties alongside $ref', async () => {
        const testResolver = {
          version: '2025.10',
          sets: {
            base: {
              description: 'Base description',
              sources: [colorDoc(0, 0, 0)],
            },
          },
          resolutionOrder: [
            {
              $ref: '#/sets/base',
              description: 'Override description',
              customProp: 'custom value',
            } as any,
          ],
        }

        const parsedResolver = parser.parseInline(testResolver as any)
        expect(parsedResolver.resolutionOrder[0]).toHaveProperty('$ref')
        expect(parsedResolver.resolutionOrder[0]).toHaveProperty(
          'description',
          'Override description',
        )
      })

      it('should handle shallow merge (arrays not deep merged)', async () => {
        const baseSet = {
          sources: [colorDoc(1, 0, 0)],
          $extensions: { version: '1.0', author: 'original' },
        }

        const extended = {
          $ref: '#/sets/base',
          sources: [colorDoc(0, 1, 0)],
          $extensions: { author: 'override' },
        }

        // When resolved, sources array should be replaced (not merged)
        // metadata object should be replaced (not deep merged)
        const testResolver = {
          version: '2025.10',
          sets: {
            base: baseSet,
          },
          resolutionOrder: [extended as any],
        }

        const parsedResolver = parser.parseInline(testResolver as any)
        expect((parsedResolver.resolutionOrder[0] as any).sources).toEqual([colorDoc(0, 1, 0)])
      })

      it('should apply reference overrides during resolution', async () => {
        const testResolver = {
          version: '2025.10',
          sets: {
            base: {
              sources: [
                {
                  color: {
                    primary: {
                      $type: 'color',
                      $value: { colorSpace: 'srgb', components: [1, 0, 0] },
                    },
                  },
                },
              ],
            },
          },
          resolutionOrder: [
            {
              $ref: '#/sets/base',
              sources: [
                {
                  color: {
                    primary: {
                      $type: 'color',
                      $value: { colorSpace: 'srgb', components: [0, 1, 0] },
                    },
                  },
                },
              ],
            } as any,
          ],
        }

        const parsedResolver = parser.parseInline(testResolver as any)
        const engine = new ResolutionEngine(parsedResolver, refResolver)
        const tokenParser = new TokenParser()

        const rawTokens = await engine.resolve({})
        const tokens = tokenParser.flatten(rawTokens)

        expect(tokens['color.primary']).toBeDefined()
        expect(tokens['color.primary'].$value).toEqual({
          colorSpace: 'srgb',
          components: [0, 1, 0],
        })
      })
    })

    describe('Case-Insensitive Inputs (SHOULD requirement)', () => {
      it('should treat inputs case-insensitively', async () => {
        const resolverPath = getFixturePath('tokens.resolver.json')
        const resolver = await parser.parseFile(resolverPath)
        const engine = new ResolutionEngine(resolver, refResolver)

        // All these should produce the same result
        const result1 = await engine.resolve({ theme: 'light', scale: 'tablet' })
        const result2 = await engine.resolve({ Theme: 'Light', Scale: 'Tablet' })
        const result3 = await engine.resolve({ THEME: 'LIGHT', SCALE: 'TABLET' })

        expect(result1).toEqual(result2)
        expect(result2).toEqual(result3)
      })
    })
  })
})
