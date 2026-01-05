import * as path from 'node:path'

import { beforeEach, describe, expect, it } from 'vitest'

import { ResolvedTokens } from '../../../src'
import { ResolverParser } from '../../../src/adapters/filesystem/resolver-parser'
import type { OutputConfig } from '../../../src/config'
import type { ResolverDocument } from '../../../src/lib/resolution/resolution.types'
import { isOutputTree } from '../../../src/renderers'
import { JsonRenderer } from '../../../src/renderers/json'
import type { RenderContext } from '../../../src/renderers/types'
import { ReferenceResolver, ResolutionEngine } from '../../../src/lib/resolution'
import { AliasResolver } from '../../../src/lib/resolution/alias-resolver'
import { TokenParser } from '../../../src/lib/tokens/token-parser'
import { getFixturePath } from '../../utils/test-helpers'

describe('JSON Renderer', () => {
  let lightTokens: ResolvedTokens
  let renderer: JsonRenderer
  let resolverDocument: ResolverDocument

  beforeEach(async () => {
    const parser = new ResolverParser()
    const tokenParser = new TokenParser()
    const aliasResolver = new AliasResolver()
    const resolverPath = getFixturePath('tokens.resolver.json')
    const fixturesDir = path.dirname(resolverPath)
    const refResolver = new ReferenceResolver(fixturesDir)
    resolverDocument = await parser.parseFile(resolverPath)
    const engine = new ResolutionEngine(resolverDocument, refResolver)

    // Resolve and alias resolve for light theme
    const lightRaw = await engine.resolve({ theme: 'light', scale: 'tablet' })
    const lightFlat = tokenParser.flatten(lightRaw)
    lightTokens = aliasResolver.resolve(lightFlat)

    renderer = new JsonRenderer()
  })

  const buildContext = (options: Record<string, unknown>): RenderContext => {
    const output: OutputConfig = {
      name: 'json',
      renderer,
      file: 'tokens-{theme}.json',
      options,
    }

    return {
      permutations: [{ tokens: lightTokens, modifierInputs: { theme: 'light', scale: 'tablet' } }],
      output,
      resolver: resolverDocument,
      meta: { dimensions: [], defaults: {}, basePermutation: {} },
    }
  }

  const renderJson = async (options: Record<string, unknown>): Promise<string> => {
    const context = buildContext(options)
    const result = await renderer.format(context, context.output.options)
    if (isOutputTree(result)) {
      return Object.values(result.files)[0] ?? ''
    }
    return result
  }

  it('should generate flat JSON with values only', async () => {
    const output = await renderJson({
      preset: 'standalone',
      structure: 'flat',
      includeMetadata: false,
      minify: false,
    })

    const parsed = JSON.parse(output)

    expect(parsed['color.primitive.red']).toEqual({
      colorSpace: 'srgb',
      components: [1, 0, 0],
    })
    expect(parsed['dimension.base.4']).toEqual({ value: 1, unit: 'rem' })
    expect(parsed).not.toHaveProperty('color.primitive.red.$type')

    expect(output).toMatchSnapshot()
  })

  it('should generate flat JSON with metadata', async () => {
    const output = await renderJson({
      preset: 'standalone',
      structure: 'flat',
      includeMetadata: true,
      minify: false,
    })

    const parsed = JSON.parse(output)

    expect(parsed['color.primitive.red']).toHaveProperty('$value')
    expect(parsed['color.primitive.red'].$value).toEqual({
      colorSpace: 'srgb',
      components: [1, 0, 0],
    })
    expect(parsed['color.primitive.red']).toHaveProperty('$type', 'color')
    expect(parsed['color.primitive.red']).not.toHaveProperty('path')
    expect(parsed['color.primitive.red']).not.toHaveProperty('name')
    expect(parsed['color.primitive.red']).not.toHaveProperty('originalValue')
    expect(parsed['color.primitive.red']).not.toHaveProperty('_isAlias')
    expect(parsed['color.primitive.red']).not.toHaveProperty('_sourceModifier')

    expect(parsed['font.family.sans']).toHaveProperty('$description')
  })

  it('should generate nested JSON with values only', async () => {
    const output = await renderJson({
      preset: 'standalone',
      structure: 'nested',
      includeMetadata: false,
      minify: false,
    })

    const parsed = JSON.parse(output)

    expect(parsed.color.primitive.red).toEqual({
      colorSpace: 'srgb',
      components: [1, 0, 0],
    })
    expect(parsed.dimension.base['4']).toEqual({ value: 1, unit: 'rem' })

    expect(output).toMatchSnapshot()
  })

  it('should generate nested JSON with metadata', async () => {
    const output = await renderJson({
      preset: 'standalone',
      structure: 'nested',
      includeMetadata: true,
      minify: false,
    })

    const parsed = JSON.parse(output)

    expect(parsed.color.primitive.red.$value).toEqual({
      colorSpace: 'srgb',
      components: [1, 0, 0],
    })
    expect(parsed.color.primitive.red.$type).toBe('color')

    expect(output).toMatchSnapshot()
  })

  it('should generate minified JSON', async () => {
    const output = await renderJson({
      preset: 'standalone',
      structure: 'flat',
      includeMetadata: false,
      minify: true,
    })

    expect(output).not.toContain('\n')
    expect(output).not.toContain('  ')

    const parsed = JSON.parse(output)
    expect(parsed['color.primitive.red']).toEqual({
      colorSpace: 'srgb',
      components: [1, 0, 0],
    })

    expect(output).toMatchSnapshot()
  })

  it('should preserve all token types', async () => {
    const output = await renderJson({
      preset: 'standalone',
      structure: 'flat',
      includeMetadata: false,
      minify: false,
    })

    const parsed = JSON.parse(output)

    expect(parsed['color.primitive.red']).toBeDefined()
    expect(parsed['dimension.base.4']).toBeDefined()
    expect(parsed['font.family.sans']).toBeDefined()
    expect(parsed['shadow.elevation.md']).toBeDefined()
    expect(parsed['animation.duration.fast']).toBeDefined()
  })
})
