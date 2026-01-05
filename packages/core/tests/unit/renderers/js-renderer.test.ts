import * as path from 'node:path'

import { beforeEach, describe, expect, it } from 'vitest'

import { ResolvedTokens } from '../../../src'
import { ResolverParser } from '../../../src/adapters/filesystem/resolver-parser'
import type { OutputConfig } from '../../../src/config'
import type { ResolverDocument } from '../../../src/lib/resolution/resolution.types'
import { isOutputTree } from '../../../src/renderers'
import { JsModuleRenderer } from '../../../src/renderers/js-module'
import type { RenderContext } from '../../../src/renderers/types'
import { ReferenceResolver, ResolutionEngine } from '../../../src/lib/resolution'
import { AliasResolver } from '../../../src/lib/resolution/alias-resolver'
import { TokenParser } from '../../../src/lib/tokens/token-parser'
import { getFixturePath } from '../../utils/test-helpers'

describe('JS Module Renderer', () => {
  let lightTokens: ResolvedTokens
  let renderer: JsModuleRenderer
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

    renderer = new JsModuleRenderer()
  })

  const buildContext = (options: Record<string, unknown>): RenderContext => {
    const output: OutputConfig = {
      name: 'js',
      renderer,
      file: 'tokens.js',
      options,
    }

    return {
      permutations: [{ tokens: lightTokens, modifierInputs: { theme: 'light', scale: 'tablet' } }],
      output,
      resolver: resolverDocument,
      meta: { dimensions: [], defaults: {}, basePermutation: {} },
    }
  }

  const renderJs = async (options: Record<string, unknown>): Promise<string> => {
    const context = buildContext(options)
    const result = await renderer.format(context, context.output.options)
    if (isOutputTree(result)) {
      return Object.values(result.files)[0] ?? ''
    }
    return result
  }

  it('should generate default export format with nested structure', async () => {
    const output = await renderJs({
      preset: 'standalone',
    })

    expect(output).toContain('export default tokens')
    expect(output).toContain('const tokens = {')
    expect(output).toContain('color:')
    expect(output).toContain('primitive:')
    expect(output).toContain('sans: [')
    expect(output).toMatchSnapshot()
  })

  it('should generate flat structure when specified', async () => {
    const output = await renderJs({
      preset: 'standalone',
      structure: 'flat',
    })

    // Flat structure should use dotted keys (Prettier uses single quotes)
    expect(output).toContain("'color.primitive.red':")
    expect(output).toContain("'font.family.sans':")
    expect(output).toMatchSnapshot()
  })

  it('should generate nested structure when specified', async () => {
    const output = await renderJs({
      preset: 'standalone',
      structure: 'nested',
    })

    // Nested structure should have hierarchical objects
    expect(output).toContain('color:')
    expect(output).toContain('primitive:')
    expect(output).toMatchSnapshot()
  })
})
