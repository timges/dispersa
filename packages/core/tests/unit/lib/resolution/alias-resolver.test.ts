import * as path from 'node:path'

import { beforeEach, describe, expect, it, vi } from 'vitest'

import { getFixturePath } from '../../../utils/test-helpers'
import { ResolvedTokens } from '../../../../src'
import { AliasResolver } from '../../../../src/lib/resolution/alias-resolver'
import { TokenParser } from '../../../../src/lib/tokens/token-parser'
import { ResolverParser } from '../../../../src/adapters/filesystem/resolver-parser'
import { ReferenceResolver, ResolutionEngine } from '../../../../src/lib/resolution'

describe('Alias Resolver Integration Tests', () => {
  let aliasResolver: AliasResolver

  beforeEach(() => {
    aliasResolver = new AliasResolver()
  })

  async function getResolvedTokens(): Promise<ResolvedTokens> {
    const parser = new ResolverParser()
    const resolverPath = getFixturePath('tokens.resolver.json')
    const fixturesDir = path.dirname(resolverPath)
    const refResolver = new ReferenceResolver(fixturesDir)
    const resolver = await parser.parseFile(resolverPath)
    const engine = new ResolutionEngine(resolver, refResolver)
    const rawTokens = await engine.resolve({ theme: 'light', scale: 'tablet' })

    // Parse and flatten the raw tokens
    const tokenParser = new TokenParser()
    return tokenParser.flatten(rawTokens)
  }

  describe('Simple Alias Resolution', () => {
    it('should resolve simple color aliases', async () => {
      const tokens = await getResolvedTokens()
      const resolved = aliasResolver.resolve(tokens)

      // color.base.background references color.primitive.gray.50, but light theme overrides to white
      expect(resolved['color.base.background'].$value).toEqual({
        colorSpace: 'srgb',
        components: [1, 1, 1],
      })
    })

    it('should resolve aliases to other aliases', async () => {
      const tokens = await getResolvedTokens()
      const resolved = aliasResolver.resolve(tokens)

      // semantic.color.text.primary → color.base.text → color.primitive.gray.900
      expect(resolved['semantic.color.text.primary'].$value).toEqual({
        colorSpace: 'srgb',
        components: [0.067, 0.094, 0.153],
      })
    })

    it('should preserve non-aliased values', async () => {
      const tokens = await getResolvedTokens()
      const resolved = aliasResolver.resolve(tokens)

      // Direct value should remain unchanged
      expect(resolved['color.primitive.red'].$value).toEqual({
        colorSpace: 'srgb',
        components: [1, 0, 0],
      })
    })
  })

  describe('Deep Alias Chains', () => {
    it('should resolve deep alias chains', async () => {
      const tokens = await getResolvedTokens()
      const resolved = aliasResolver.resolve(tokens)

      // semantic.color.action.primary → color.base.primary → color.primitive.brand.blue
      expect(resolved['semantic.color.action.primary'].$value).toEqual({
        colorSpace: 'srgb',
        components: [0, 0.482, 1],
      })
    })

    it('should resolve spacing aliases', async () => {
      const tokens = await getResolvedTokens()
      const resolved = aliasResolver.resolve(tokens)

      // spacing.semantic.md → spacing.scale.4
      expect(resolved['spacing.semantic.md'].$value).toEqual({ value: 1, unit: 'rem' })

      // semantic.spacing.component.padding → spacing.semantic.md → spacing.scale.4
      expect(resolved['semantic.spacing.component.padding'].$value).toEqual({
        value: 1,
        unit: 'rem',
      })
    })
  })

  describe('Composite Token Aliases', () => {
    it('should resolve aliases in shadow tokens', async () => {
      const tokens = await getResolvedTokens()
      const resolved = aliasResolver.resolve(tokens)

      // Shadow tokens support aliases (stable composite type)
      const shadow = resolved['shadow.elevation.md']
      expect(shadow).toBeDefined()
      expect(shadow.$type).toBe('shadow')

      // Shadow value is properly resolved as an object with DTCG dimension format
      const value = shadow.$value as Record<string, unknown>
      expect(value).toBeDefined()
      expect(value.color).toBeDefined()
      expect(value.offsetX).toEqual({ value: 0, unit: 'px' })
      expect(value.offsetY).toEqual({ value: 4, unit: 'px' })
      expect(value.blur).toEqual({ value: 6, unit: 'px' })
    })
  })

  describe('Partial String Aliases', () => {
    it('should resolve aliases in string values', () => {
      const tokens: ResolvedTokens = {
        'base.value': {
          $type: 'dimension',
          $value: '16px',
          path: ['base', 'value'],
          name: 'base.value',
          originalValue: '16px',
        },
        'computed.value': {
          $value: 'The value is {base.value}',
          path: ['computed', 'value'],
          name: 'computed.value',
          originalValue: 'The value is {base.value}',
        },
      }

      const resolved = aliasResolver.resolve(tokens)
      expect(resolved['computed.value'].$value).toBe('The value is 16px')
    })

    it('should resolve multiple aliases in one string', () => {
      const tokens: ResolvedTokens = {
        'font.size': {
          $type: 'dimension',
          $value: '16px',
          path: ['font', 'size'],
          name: 'font.size',
          originalValue: '16px',
        },
        'font.family': {
          $type: 'fontFamily',
          $value: 'Arial',
          path: ['font', 'family'],
          name: 'font.family',
          originalValue: 'Arial',
        },
        combined: {
          $value: '{font.size} {font.family}',
          path: ['combined'],
          name: 'combined',
          originalValue: '{font.size} {font.family}',
        },
      }

      const resolved = aliasResolver.resolve(tokens)
      expect(resolved.combined.$value).toBe('16px Arial')
    })
  })

  describe('Circular Reference Detection', () => {
    it('should detect direct circular references', () => {
      const tokens: ResolvedTokens = {
        a: {
          $type: 'color',
          $value: '{b}',
          path: ['a'],
          name: 'a',
          originalValue: '{b}',
        },
        b: {
          $type: 'color',
          $value: '{a}',
          path: ['b'],
          name: 'b',
          originalValue: '{a}',
        },
      }

      expect(() => aliasResolver.resolve(tokens)).toThrow(/circular/i)
    })

    it('should detect indirect circular references', () => {
      const tokens: ResolvedTokens = {
        a: {
          $type: 'color',
          $value: '{b}',
          path: ['a'],
          name: 'a',
          originalValue: '{b}',
        },
        b: {
          $type: 'color',
          $value: '{c}',
          path: ['b'],
          name: 'b',
          originalValue: '{c}',
        },
        c: {
          $type: 'color',
          $value: '{a}',
          path: ['c'],
          name: 'c',
          originalValue: '{a}',
        },
      }

      expect(() => aliasResolver.resolve(tokens)).toThrow(/circular/i)
    })

    it('should detect circular references in composite tokens', () => {
      const tokens: ResolvedTokens = {
        'shadow.a': {
          $type: 'shadow',
          $value: {
            color: '{shadow.b}',
            offsetX: { value: 0, unit: 'px' },
            offsetY: { value: 1, unit: 'px' },
            blur: { value: 2, unit: 'px' },
          },
          path: ['shadow', 'a'],
          name: 'shadow.a',
          originalValue: {
            color: '{shadow.b}',
            offsetX: { value: 0, unit: 'px' },
            offsetY: { value: 1, unit: 'px' },
            blur: { value: 2, unit: 'px' },
          },
        },
        'shadow.b': {
          $type: 'shadow',
          $value: {
            color: '{shadow.a}',
            offsetX: { value: 0, unit: 'px' },
            offsetY: { value: 2, unit: 'px' },
            blur: { value: 4, unit: 'px' },
          },
          path: ['shadow', 'b'],
          name: 'shadow.b',
          originalValue: {
            color: '{shadow.a}',
            offsetX: { value: 0, unit: 'px' },
            offsetY: { value: 2, unit: 'px' },
            blur: { value: 4, unit: 'px' },
          },
        },
      }

      expect(() => aliasResolver.resolve(tokens)).toThrow(/circular/i)
    })
  })

  describe('Validation Modes', () => {
    const missingReferenceTokens: ResolvedTokens = {
      'color.primary': {
        $type: 'color',
        $value: '{missing.token}',
        path: ['color', 'primary'],
        name: 'color.primary',
        originalValue: '{missing.token}',
      },
    }

    it('should warn and leave unresolved reference in warn mode', () => {
      const warn = vi.fn()
      aliasResolver = new AliasResolver({ validation: { mode: 'warn', onWarning: warn } })

      const resolved = aliasResolver.resolve(missingReferenceTokens)

      expect(resolved['color.primary'].$value).toBe('{missing.token}')
      expect(warn).toHaveBeenCalled()
    })

    it('should skip validation in off mode', () => {
      aliasResolver = new AliasResolver({ validation: { mode: 'off' } })

      const resolved = aliasResolver.resolve(missingReferenceTokens)

      expect(resolved['color.primary'].$value).toBe('{missing.token}')
    })
  })

  describe('Error Handling', () => {
    it('should throw on missing alias target', () => {
      const tokens: ResolvedTokens = {
        valid: {
          $type: 'color',
          $value: '{nonexistent}',
          path: ['valid'],
          name: 'valid',
          originalValue: '{nonexistent}',
        },
      }

      expect(() => aliasResolver.resolve(tokens)).toThrow(/nonexistent/i)
    })

    it('should provide helpful error messages', () => {
      const tokens: ResolvedTokens = {
        'token.a': {
          $type: 'color',
          $value: '{token.missing}',
          path: ['token', 'a'],
          name: 'token.a',
          originalValue: '{token.missing}',
        },
      }

      try {
        aliasResolver.resolve(tokens)
        expect.fail('Should have thrown an error')
      } catch (error) {
        expect((error as Error).message).toContain('token.missing')
        // Error message should contain the missing reference
      }
    })
  })

  describe('Edge Cases', () => {
    it('should throw when alias depth exceeds maxDepth', () => {
      const tokens: ResolvedTokens = {
        a: {
          $type: 'color',
          $value: '{b}',
          path: ['a'],
          name: 'a',
          originalValue: '{b}',
        },
        b: {
          $type: 'color',
          $value: '{c}',
          path: ['b'],
          name: 'b',
          originalValue: '{c}',
        },
        c: {
          $type: 'color',
          $value: '#ff0000',
          path: ['c'],
          name: 'c',
          originalValue: '#ff0000',
        },
      }

      const limitedResolver = new AliasResolver({ maxDepth: 1 })
      expect(() => limitedResolver.resolve(tokens)).toThrow(/max(imum)? alias resolution depth/i)
    })

    it('should handle empty token collections', () => {
      const tokens: ResolvedTokens = {}
      const resolved = aliasResolver.resolve(tokens)
      expect(resolved).toEqual({})
    })

    it('should handle tokens with no aliases', () => {
      const tokens: ResolvedTokens = {
        'color.red': {
          $type: 'color',
          $value: '#ff0000',
          path: ['color', 'red'],
          name: 'color.red',
          originalValue: '#ff0000',
        },
        'color.blue': {
          $type: 'color',
          $value: '#0000ff',
          path: ['color', 'blue'],
          name: 'color.blue',
          originalValue: '#0000ff',
        },
      }

      const resolved = aliasResolver.resolve(tokens)
      expect(resolved['color.red'].$value).toBe('#ff0000')
      expect(resolved['color.blue'].$value).toBe('#0000ff')
    })

    it('should handle mixed aliased and non-aliased values', () => {
      const tokens: ResolvedTokens = {
        base: {
          $type: 'color',
          $value: '#ff0000',
          path: ['base'],
          name: 'base',
          originalValue: '#ff0000',
        },
        alias: {
          $type: 'color',
          $value: '{base}',
          path: ['alias'],
          name: 'alias',
          originalValue: '{base}',
        },
        direct: {
          $type: 'color',
          $value: '#0000ff',
          path: ['direct'],
          name: 'direct',
          originalValue: '#0000ff',
        },
      }

      const resolved = aliasResolver.resolve(tokens)
      expect(resolved.base.$value).toBe('#ff0000')
      expect(resolved.alias.$value).toBe('#ff0000')
      expect(resolved.direct.$value).toBe('#0000ff')
    })

    it('should preserve token metadata during resolution', async () => {
      const tokens: ResolvedTokens = {
        base: {
          $type: 'color',
          $value: '#ff0000',
          $description: 'Base color',
          path: ['base'],
          name: 'base',
          originalValue: '#ff0000',
        },
        alias: {
          $type: 'color',
          $value: '{base}',
          $description: 'Alias to base',
          path: ['alias'],
          name: 'alias',
          originalValue: '{base}',
        },
      }

      const resolved = aliasResolver.resolve(tokens)
      expect(resolved.alias.$description).toBe('Alias to base')
      expect(resolved.alias.$value).toBe('#ff0000')
    })
  })
})
