import * as path from 'node:path'

import { beforeEach, describe, expect, it } from 'vitest'

import type { ResolvedTokens } from '../../../../src'
import { TypeGenerator } from '../../../../src/codegen/type-generator'
import { ResolverParser } from '../../../../src/adapters/filesystem/resolver-parser'
import { ReferenceResolver, ResolutionEngine } from '../../../../src/resolution'
import { AliasResolver } from '../../../../src/resolution/alias-resolver'
import { TokenParser } from '../../../../src/tokens/token-parser'
import { getFixturePath } from '../../../utils/test-helpers'

describe('Type Generation Integration Tests', () => {
  let tokens: ResolvedTokens
  let generator: TypeGenerator

  beforeEach(async () => {
    const parser = new ResolverParser()
    const tokenParser = new TokenParser()
    const aliasResolver = new AliasResolver()
    const resolverPath = getFixturePath('tokens.resolver.json')
    const fixturesDir = path.dirname(resolverPath)
    const refResolver = new ReferenceResolver(fixturesDir)
    const resolver = await parser.parseFile(resolverPath)
    const engine = new ResolutionEngine(resolver, refResolver)

    const rawTokens = await engine.resolve({ theme: 'light', scale: 'tablet' })
    const flatTokens = tokenParser.flatten(rawTokens)
    tokens = aliasResolver.resolve(flatTokens)
    generator = new TypeGenerator()
  })

  describe('Token Name Type Generation', () => {
    it('should generate union type of all token names', () => {
      const lines = generator.generateTokenNamesType(tokens, 'TokenNames')
      const output = lines.join('\n')

      expect(output).toContain('export type TokenNames =')
      expect(output).toContain('"color.primitive.red"')
      expect(output).toContain('"dimension.base.4"')
      expect(output).toContain('"font.family.sans"')
      expect(output).toMatchSnapshot()
    })

    it('should format as multiline union', () => {
      const lines = generator.generateTokenNamesType(tokens, 'TokenNames')
      const output = lines.join('\n')

      expect(output).toMatch(/\|\s+"/)
      expect(output).toMatchSnapshot()
    })

    it('should include all token paths', () => {
      const lines = generator.generateTokenNamesType(tokens, 'TokenNames')
      const output = lines.join('\n')

      const tokenNames = Object.keys(tokens)
      tokenNames.forEach((name) => {
        expect(output).toContain(`"${name}"`)
      })
    })
  })

  describe('Token Value Type Generation', () => {
    it('should generate record type mapping names to values', () => {
      const lines = generator.generateTokenValuesType(tokens, 'TokenValues')
      const output = lines.join('\n')

      expect(output).toContain('export type TokenValues = {')
      expect(output).toContain('"color.primitive.red": string')
      expect(output).toContain('"dimension.base.4": string')
      expect(output).toMatchSnapshot()
    })

    it('should infer correct TypeScript types from token types', () => {
      const lines = generator.generateTokenValuesType(tokens, 'TokenValues')
      const output = lines.join('\n')

      // Colors should be strings
      expect(output).toMatch(/"color\.primitive\.red":\s*string/)

      // Dimensions should be strings
      expect(output).toMatch(/"dimension\.base\.4":\s*string/)

      // Numbers should be numbers (note: lineHeight in fixture is camelCase)
      expect(output).toMatch(/"font\.lineHeight\.normal":\s*number/)

      expect(output).toMatchSnapshot()
    })

    it('should handle array types', () => {
      const lines = generator.generateTokenValuesType(tokens, 'TokenValues')
      const output = lines.join('\n')

      // Font family can be array
      expect(output).toContain('font.family.sans')
      expect(output).toMatchSnapshot()
    })

    it('should handle composite token types', () => {
      const lines = generator.generateTokenValuesType(tokens, 'TokenValues')
      const output = lines.join('\n')

      // Shadow is a stable composite type
      expect(output).toContain('shadow.elevation')

      expect(output).toMatchSnapshot()
    })
  })

  describe('Edge Cases', () => {
    it('should handle empty token collection', () => {
      const emptyTokens: ResolvedTokens = {}

      const namesLines = generator.generateTokenNamesType(emptyTokens, 'TokenNames')
      const names = namesLines.join('\n')
      expect(names).toContain('export type TokenNames = never')

      const valuesLines = generator.generateTokenValuesType(emptyTokens, 'TokenValues')
      const values = valuesLines.join('\n')
      // Can be on one or two lines
      expect(values).toContain('export type TokenValues = {')
      expect(values).toContain('}')
    })

    it('should handle special characters in token names', () => {
      const specialTokens: ResolvedTokens = {
        'token-with-dash': {
          $type: 'color',
          $value: '#ff0000',
          path: ['token-with-dash'],
          name: 'token-with-dash',
          originalValue: '#ff0000',
        },
        token_with_underscore: {
          $type: 'color',
          $value: '#00ff00',
          path: ['token_with_underscore'],
          name: 'token_with_underscore',
          originalValue: '#00ff00',
        },
      }

      const lines = generator.generateTokenNamesType(specialTokens, 'TokenNames')
      const output = lines.join('\n')

      expect(output).toContain('"token-with-dash"')
      expect(output).toContain('"token_with_underscore"')
    })

    it('should handle tokens with extensions', () => {
      const tokensWithExtensions: ResolvedTokens = {
        'color.custom': {
          $type: 'color',
          $value: '#ff0000',
          path: ['color', 'custom'],
          name: 'color.custom',
          originalValue: '#ff0000',
          $extensions: {
            'custom.property': 'value',
          },
        },
      }

      const lines = generator.generateTokenValuesType(tokensWithExtensions, 'TokenValues')
      const output = lines.join('\n')

      // Should still generate types even with extensions
      expect(output).toContain('"color.custom"')
    })
  })

  describe('Type Customization', () => {
    it('should accept custom type names', () => {
      const namesLines = generator.generateTokenNamesType(tokens, 'MyTokenNames')
      const names = namesLines.join('\n')
      expect(names).toContain('export type MyTokenNames =')

      const valuesLines = generator.generateTokenValuesType(tokens, 'MyTokenValues')
      const values = valuesLines.join('\n')
      expect(values).toContain('export type MyTokenValues = {')
    })
  })
})
