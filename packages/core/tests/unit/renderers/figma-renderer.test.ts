import * as path from 'node:path'

import { beforeEach, describe, expect, it } from 'vitest'

import { ResolvedTokens } from '../../../src'
import { ResolverParser } from '../../../src/adapters/filesystem/resolver-parser'
import type { OutputConfig } from '../../../src/config'
import type { ResolverDocument } from '../../../src/lib/resolution/resolution.types'
import { FigmaVariablesRenderer } from '../../../src/renderers/figma-variables'
import type { RenderContext } from '../../../src/renderers/types'
import { ReferenceResolver, ResolutionEngine } from '../../../src/lib/resolution'
import { AliasResolver } from '../../../src/lib/resolution/alias-resolver'
import { TokenParser } from '../../../src/lib/tokens/token-parser'
import { getFixturePath, sanitizeSnapshot } from '../../utils/test-helpers'

describe('Figma Variables Renderer', () => {
  let lightTokens: ResolvedTokens
  let renderer: FigmaVariablesRenderer
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

    renderer = new FigmaVariablesRenderer()
  })

  const buildContext = (options: Record<string, unknown>): RenderContext => {
    const output: OutputConfig = {
      name: 'figma',
      renderer,
      file: 'tokens-figma.json',
      options,
    }

    return {
      permutations: [{ tokens: lightTokens, modifierInputs: { theme: 'light', scale: 'tablet' } }],
      output,
      resolver: resolverDocument,
      meta: { dimensions: [], defaults: {}, basePermutation: {} },
    }
  }

  const renderFigma = async (options: Record<string, unknown>): Promise<string> => {
    const context = buildContext(options)
    const result = await renderer.format(context, context.output.options)
    return typeof result === 'string' ? result : JSON.stringify(result)
  }

  it('should generate Figma Variables JSON structure', async () => {
    const output = await renderFigma({})

    const parsed = JSON.parse(output)

    expect(parsed).toHaveProperty('version')
    expect(parsed).toHaveProperty('collections')
    expect(parsed.collections).toHaveLength(1)

    const sanitized = sanitizeSnapshot(output)
    expect(sanitized).toMatchSnapshot()
  })

  it('should create collection with modes', async () => {
    const output = await renderFigma({})

    const parsed = JSON.parse(output)
    const collection = parsed.collections[0]

    expect(collection).toHaveProperty('name')
    expect(collection).toHaveProperty('modes')
    expect(collection.modes).toHaveLength(1)
    expect(collection.modes[0].name).toBe('Light')
  })

  it('should convert color tokens', async () => {
    const output = await renderFigma({})

    const parsed = JSON.parse(output)

    const colorVariable = parsed.variables.find(
      (v: { name: string }) => v.name === 'color.primitive.red',
    )

    expect(colorVariable).toBeDefined()
    expect(colorVariable.resolvedType).toBe('COLOR')

    const sanitized = sanitizeSnapshot(output)
    expect(sanitized).toMatchSnapshot()
  })

  it('should convert dimension tokens to FLOAT', async () => {
    const output = await renderFigma({})

    const parsed = JSON.parse(output)
    const _collection = parsed.collections[0]

    const dimensionVariable = parsed.variables.find(
      (v: { name: string }) => v.name === 'dimension.base.4',
    )

    expect(dimensionVariable).toBeDefined()
    expect(dimensionVariable.resolvedType).toBe('FLOAT')

    const sanitized = sanitizeSnapshot(output)
    expect(sanitized).toMatchSnapshot()
  })

  it('should convert string-based tokens to STRING', async () => {
    const output = await renderFigma({})

    const parsed = JSON.parse(output)
    const _collection = parsed.collections[0]

    const fontFamilyVariable = parsed.variables.find(
      (v: { name: string }) => v.name === 'font.family.mono',
    )

    expect(fontFamilyVariable).toBeDefined()
    expect(fontFamilyVariable.resolvedType).toBe('STRING')

    const sanitized = sanitizeSnapshot(output)
    expect(sanitized).toMatchSnapshot()
  })

  it('should assign scopes correctly', async () => {
    const output = await renderFigma({})

    const parsed = JSON.parse(output)
    const _collection = parsed.collections[0]

    const colorVariable = parsed.variables.find(
      (v: { name: string }) => v.name === 'color.primitive.red',
    )

    expect(colorVariable).toBeDefined()
    expect(colorVariable.scopes).toBeDefined()
    expect(colorVariable.scopes).toContain('ALL_FILLS')

    const sanitized = sanitizeSnapshot(output)
    expect(sanitized).toMatchSnapshot()
  })

  it('should handle multiple token types', async () => {
    const output = await renderFigma({})

    const parsed = JSON.parse(output)
    const _collection = parsed.collections[0]

    const types = new Set(parsed.variables.map((v: { resolvedType: string }) => v.resolvedType))

    expect(types.has('COLOR')).toBe(true)
    expect(types.has('FLOAT')).toBe(true)
    expect(types.has('STRING')).toBe(true)

    const sanitized = sanitizeSnapshot(output)
    expect(sanitized).toMatchSnapshot()
  })

  it('should generate valid IDs for variables', async () => {
    const output = await renderFigma({})

    const parsed = JSON.parse(output)
    const _collection = parsed.collections[0]

    parsed.variables.forEach((variable: { id: string }) => {
      expect(variable.id).toMatch(/^VariableID:/)
    })

    const sanitized = sanitizeSnapshot(output)
    expect(sanitized).toMatchSnapshot()
  })

  it('should preserve alias references when enabled', async () => {
    const output = await renderFigma({ preserveReferences: true })
    const parsed = JSON.parse(output)

    const aliasVariable = parsed.variables.find(
      (v: { name: string }) => v.name === 'semantic.color.text.primary',
    )
    const referencedVariable = parsed.variables.find(
      (v: { name: string }) => v.name === 'color.base.text',
    )

    expect(aliasVariable).toBeDefined()
    expect(referencedVariable).toBeDefined()

    const modeId = parsed.collections[0]?.modes?.[0]?.modeId
    expect(modeId).toBeDefined()

    const aliasValue = aliasVariable.valuesByMode[modeId]
    expect(aliasValue).toEqual({
      type: 'VARIABLE_ALIAS',
      id: referencedVariable.id,
    })
  })

  describe('shadow token decomposition', () => {
    it('should decompose single shadow into leaf variables', async () => {
      const output = await renderFigma({})
      const parsed = JSON.parse(output)

      // shadow.elevation.sm is a single shadow in fixtures
      const shadowColor = parsed.variables.find(
        (v: { name: string }) => v.name === 'shadow.elevation.sm.color',
      )
      const shadowOffsetX = parsed.variables.find(
        (v: { name: string }) => v.name === 'shadow.elevation.sm.offsetX',
      )
      const shadowOffsetY = parsed.variables.find(
        (v: { name: string }) => v.name === 'shadow.elevation.sm.offsetY',
      )
      const shadowBlur = parsed.variables.find(
        (v: { name: string }) => v.name === 'shadow.elevation.sm.blur',
      )
      const shadowSpread = parsed.variables.find(
        (v: { name: string }) => v.name === 'shadow.elevation.sm.spread',
      )

      expect(shadowColor).toBeDefined()
      expect(shadowColor.resolvedType).toBe('COLOR')
      expect(shadowOffsetX).toBeDefined()
      expect(shadowOffsetX.resolvedType).toBe('FLOAT')
      expect(shadowOffsetY).toBeDefined()
      expect(shadowOffsetY.resolvedType).toBe('FLOAT')
      expect(shadowBlur).toBeDefined()
      expect(shadowBlur.resolvedType).toBe('FLOAT')
      expect(shadowSpread).toBeDefined()
      expect(shadowSpread.resolvedType).toBe('FLOAT')
    })

    it('should decompose array shadow (multi-layer) with indexed names', async () => {
      const output = await renderFigma({})
      const parsed = JSON.parse(output)

      // shadow.elevation.xl is an array shadow with 2 layers in fixtures
      const layer0Color = parsed.variables.find(
        (v: { name: string }) => v.name === 'shadow.elevation.xl.0.color',
      )
      const layer0Blur = parsed.variables.find(
        (v: { name: string }) => v.name === 'shadow.elevation.xl.0.blur',
      )
      const layer1Color = parsed.variables.find(
        (v: { name: string }) => v.name === 'shadow.elevation.xl.1.color',
      )
      const layer1Blur = parsed.variables.find(
        (v: { name: string }) => v.name === 'shadow.elevation.xl.1.blur',
      )

      expect(layer0Color).toBeDefined()
      expect(layer0Color.resolvedType).toBe('COLOR')
      expect(layer0Blur).toBeDefined()
      expect(layer0Blur.resolvedType).toBe('FLOAT')
      expect(layer1Color).toBeDefined()
      expect(layer1Color.resolvedType).toBe('COLOR')
      expect(layer1Blur).toBeDefined()
      expect(layer1Blur.resolvedType).toBe('FLOAT')
    })

    it('should not create a whole-value variable for shadow tokens', async () => {
      const output = await renderFigma({})
      const parsed = JSON.parse(output)

      // Shadow tokens should be decomposed, not represented as a single variable
      const wholeShadow = parsed.variables.find(
        (v: { name: string }) => v.name === 'shadow.elevation.sm',
      )
      expect(wholeShadow).toBeUndefined()
    })
  })

  describe('multi-mode handling', () => {
    let darkTokens: ResolvedTokens

    beforeEach(async () => {
      const parser = new ResolverParser()
      const tokenParser = new TokenParser()
      const aliasResolver = new AliasResolver()
      const resolverPath = getFixturePath('tokens.resolver.json')
      const fixturesDir = path.dirname(resolverPath)
      const refResolver = new ReferenceResolver(fixturesDir)
      const doc = await parser.parseFile(resolverPath)
      const engine = new ResolutionEngine(doc, refResolver)

      const darkRaw = await engine.resolve({ theme: 'dark', scale: 'tablet' })
      const darkFlat = tokenParser.flatten(darkRaw)
      darkTokens = aliasResolver.resolve(darkFlat)
    })

    const buildMultiModeContext = (options: Record<string, unknown>): RenderContext => {
      const output: OutputConfig = {
        name: 'figma',
        renderer,
        file: 'tokens-figma.json',
        options,
      }

      return {
        permutations: [
          { tokens: lightTokens, modifierInputs: { theme: 'light', scale: 'tablet' } },
          { tokens: darkTokens, modifierInputs: { theme: 'dark', scale: 'tablet' } },
        ],
        output,
        resolver: resolverDocument,
        meta: { dimensions: [], defaults: {}, basePermutation: {} },
      }
    }

    it('should create multiple modes for multiple permutations', async () => {
      const context = buildMultiModeContext({})
      const result = await renderer.format(context, context.output.options)
      const output = typeof result === 'string' ? result : JSON.stringify(result)
      const parsed = JSON.parse(output)
      const collection = parsed.collections[0]

      expect(collection.modes).toHaveLength(2)
      const modeNames = collection.modes.map((m: { name: string }) => m.name)
      expect(modeNames).toContain('Light')
      expect(modeNames).toContain('Dark')
    })

    it('should populate valuesByMode for each mode', async () => {
      const context = buildMultiModeContext({})
      const result = await renderer.format(context, context.output.options)
      const output = typeof result === 'string' ? result : JSON.stringify(result)
      const parsed = JSON.parse(output)

      const colorVar = parsed.variables.find(
        (v: { name: string }) => v.name === 'color.primitive.red',
      )
      expect(colorVar).toBeDefined()

      const modeIds = parsed.collections[0].modes.map((m: { modeId: string }) => m.modeId)
      expect(Object.keys(colorVar.valuesByMode)).toHaveLength(modeIds.length)
      for (const modeId of modeIds) {
        expect(colorVar.valuesByMode[modeId]).toBeDefined()
      }
    })
  })

  describe('collection name customization', () => {
    it('should use custom collection name when provided', async () => {
      const output = await renderFigma({ collectionName: 'My Design System' })
      const parsed = JSON.parse(output)
      const collection = parsed.collections[0]

      expect(collection.name).toBe('My Design System')
    })

    it('should use default collection name when not provided', async () => {
      const output = await renderFigma({})
      const parsed = JSON.parse(output)
      const collection = parsed.collections[0]

      expect(collection.name).toBeDefined()
      expect(typeof collection.name).toBe('string')
    })
  })

  describe('variable descriptions', () => {
    it('should include $description in variable description', async () => {
      const output = await renderFigma({})
      const parsed = JSON.parse(output)

      // shadow.elevation.sm has $description: "Small elevation shadow" in fixtures
      const shadowLeaf = parsed.variables.find(
        (v: { name: string }) => v.name === 'shadow.elevation.sm.color',
      )

      expect(shadowLeaf).toBeDefined()
      if (shadowLeaf.description) {
        expect(shadowLeaf.description).toContain('Small elevation shadow')
      }
    })
  })

  describe('edge cases', () => {
    it('should handle empty token set without errors', async () => {
      const output: OutputConfig = {
        name: 'figma',
        renderer,
        file: 'tokens-figma.json',
        options: {},
      }

      const context: RenderContext = {
        permutations: [{ tokens: {}, modifierInputs: { theme: 'light' } }],
        output,
        resolver: resolverDocument,
        meta: { dimensions: [], defaults: {}, basePermutation: {} },
      }

      const result = await renderer.format(context, context.output.options)
      const resultStr = typeof result === 'string' ? result : JSON.stringify(result)
      const parsed = JSON.parse(resultStr)

      expect(parsed).toHaveProperty('collections')
      expect(parsed.variables).toHaveLength(0)
    })

    it('should produce deterministic IDs for the same token name', async () => {
      const output1 = await renderFigma({})
      const output2 = await renderFigma({})

      const parsed1 = JSON.parse(output1)
      const parsed2 = JSON.parse(output2)

      const ids1 = parsed1.variables.map((v: { id: string }) => v.id).sort()
      const ids2 = parsed2.variables.map((v: { id: string }) => v.id).sort()

      expect(ids1).toEqual(ids2)
    })
  })
})
