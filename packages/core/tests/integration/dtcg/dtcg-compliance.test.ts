import * as path from 'node:path'

import { beforeEach, describe, expect, it } from 'vitest'

import { ResolverParser } from '../../../src/adapters/filesystem/resolver-parser'
import { ReferenceResolver, ResolutionEngine } from '../../../src/resolution'
import { getFixturePath } from '../../utils/test-helpers'

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

const dimensionDoc = (value: number) => ({
  size: {
    base: {
      $type: 'dimension',
      $value: { value, unit: 'px' },
    },
  },
})

describe('DTCG Spec Compliance (2025.10)', () => {
  let parser: ResolverParser
  let refResolver: ReferenceResolver

  beforeEach(() => {
    parser = new ResolverParser()
    const fixturesDir = path.dirname(getFixturePath('tokens.resolver.json'))
    refResolver = new ReferenceResolver(fixturesDir)
  })

  describe('Invalid Pointer Validation (Section 4.2.1)', () => {
    it('throws error when set references a modifier', () => {
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

      expect(() => parser.parseInline(invalidResolver as any)).toThrow(/Invalid resolver document/)
    })

    it('throws error when modifier context references another modifier', () => {
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
              small: [dimensionDoc(12)],
              large: [dimensionDoc(16)],
            },
          },
        },
        resolutionOrder: [{ $ref: '#/modifiers/theme' }],
      }

      expect(() => parser.parseInline(invalidResolver as any)).toThrow(/Invalid resolver document/)
    })

    it('throws error when reference points to resolutionOrder', () => {
      const invalidResolver = {
        version: '2025.10',
        sets: {
          mySet: {
            sources: [{ $ref: '#/resolutionOrder/0' }],
          },
        },
        resolutionOrder: [{ $ref: '#/sets/mySet' }],
      }

      expect(() => parser.parseInline(invalidResolver as any)).toThrow(/Invalid resolver document/)
    })
  })

  describe('Modifier Context Count Validation (Section 4.1.5.1)', () => {
    it('throws error for modifier with 0 contexts', () => {
      const invalidResolver = {
        version: '2025.10',
        modifiers: {
          theme: {
            contexts: {},
          },
        },
        resolutionOrder: [{ $ref: '#/modifiers/theme' }],
      }

      expect(() => parser.parseInline(invalidResolver as any)).toThrow(/Invalid resolver document/)
    })

    it('throws error for modifier with 1 context (should use set instead)', () => {
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

      expect(() => parser.parseInline(invalidResolver as any)).toThrow(/Invalid resolver document/)
    })

    it('accepts modifier with 2 or more contexts', () => {
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
    it('throws error when default does not match any context', () => {
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

    it('accepts default that matches a context', () => {
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
    it('throws error for boolean input values', async () => {
      const resolverPath = getFixturePath('tokens.resolver.json')
      const resolver = await parser.parseFile(resolverPath)
      const engine = new ResolutionEngine(resolver, refResolver)

      await expect(engine.resolve({ theme: true as any })).rejects.toThrow(
        /Invalid input type.*Expected string but got boolean/,
      )
    })

    it('throws error for number input values', async () => {
      const resolverPath = getFixturePath('tokens.resolver.json')
      const resolver = await parser.parseFile(resolverPath)
      const engine = new ResolutionEngine(resolver, refResolver)

      await expect(engine.resolve({ theme: 100 as any })).rejects.toThrow(
        /Invalid input type.*Expected string but got number/,
      )
    })

    it('accepts string input values', async () => {
      const resolverPath = getFixturePath('tokens.resolver.json')
      const resolver = await parser.parseFile(resolverPath)
      const engine = new ResolutionEngine(resolver, refResolver)

      await expect(engine.resolve({ theme: 'light', scale: 'tablet' })).resolves.toBeDefined()
    })
  })

  describe('Reference Object Extending (Section 4.2.2)', () => {
    it('merges local properties alongside $ref', async () => {
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

    it('handles shallow merge (arrays not deep merged)', async () => {
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
  })

  describe('Case-Insensitive Inputs (SHOULD requirement)', () => {
    it('treats inputs case-insensitively', async () => {
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
