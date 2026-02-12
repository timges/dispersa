import * as path from 'node:path'

import { beforeEach, describe, expect, it } from 'vitest'

import { ResolvedToken, ResolvedTokens } from '../../../src'
import { ResolverParser } from '../../../src/adapters/filesystem/resolver-parser'
import type { OutputConfig } from '../../../src/config'
import type { ResolverDocument } from '../../../src/resolution/resolution.types'
import { isOutputTree } from '../../../src/renderers'
import { CssRenderer } from '../../../src/renderers/css'
import type { RenderContext } from '../../../src/renderers/types'
import { ReferenceResolver, ResolutionEngine } from '../../../src/resolution'
import { AliasResolver } from '../../../src/resolution/alias-resolver'
import { TokenParser } from '../../../src/tokens/token-parser'
import { getFixturePath } from '../../utils/test-helpers'

describe('CSS Renderer', () => {
  let lightTokens: ResolvedTokens
  let darkTokens: ResolvedTokens
  let renderer: CssRenderer
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

    // Resolve and alias resolve for both themes
    const lightRaw = await engine.resolve({ theme: 'light', scale: 'tablet' })
    const lightFlat = tokenParser.flatten(lightRaw)
    lightTokens = aliasResolver.resolve(lightFlat)

    const darkRaw = await engine.resolve({ theme: 'dark', scale: 'tablet' })
    const darkFlat = tokenParser.flatten(darkRaw)
    darkTokens = aliasResolver.resolve(darkFlat)

    renderer = new CssRenderer()
  })

  const buildContext = (
    tokens: ResolvedTokens,
    options: Record<string, unknown>,
    modifierInputs: Record<string, string> = { theme: 'light', scale: 'tablet' },
  ): RenderContext => {
    const output: OutputConfig = {
      name: 'css',
      renderer,
      file: 'tokens.css',
      options,
    }

    return {
      permutations: [{ tokens, modifierInputs }],
      output,
      resolver: resolverDocument,
      meta: {
        dimensions: ['theme', 'scale'],
        defaults: { theme: 'light', scale: 'tablet' },
        basePermutation: { theme: 'light', scale: 'tablet' },
      },
    }
  }

  const renderCss = async (
    tokens: ResolvedTokens,
    options: Record<string, unknown>,
    modifierInputs?: Record<string, string>,
  ): Promise<string> => {
    const context = buildContext(tokens, options, modifierInputs)
    const result = await renderer.format(context, context.output.options)
    if (isOutputTree(result)) {
      return Object.values(result.files)[0] ?? ''
    }
    return result
  }

  it('should generate CSS with :root selector', async () => {
    const output = await renderCss(lightTokens, {
      preset: 'standalone',
      selector: ':root',
      minify: false,
    })

    expect(output).toContain(':root {')
    expect(output).toContain('--color.primitive.red: #ff0000;')
    expect(output).toContain('--color.base.background: #ffffff;')
    expect(output).toMatchSnapshot()
  })

  it('should generate CSS with theme selectors', async () => {
    // Create both theme outputs
    const lightOutput = await renderCss(
      lightTokens,
      { preset: 'standalone', selector: '[data-theme="light"]', minify: false },
      { theme: 'light', scale: 'tablet' },
    )

    const darkOutput = await renderCss(
      darkTokens,
      { preset: 'standalone', selector: '[data-theme="dark"]', minify: false },
      { theme: 'dark', scale: 'tablet' },
    )

    expect(lightOutput).toContain('[data-theme="light"] {')
    expect(lightOutput).toContain('--color.base.background: #ffffff;')

    expect(darkOutput).toContain('[data-theme="dark"] {')
    expect(darkOutput).toContain('--color.base.background: #111827;')

    expect(lightOutput).toMatchSnapshot()
    expect(darkOutput).toMatchSnapshot()
  })

  it('should generate minified CSS', async () => {
    const output = await renderCss(lightTokens, {
      preset: 'standalone',
      selector: ':root',
      minify: true,
    })

    expect(output).not.toContain('\n  ')
    expect(output).toContain(':root{')
    expect(output).toMatchSnapshot()
  })

  it('should use token name as-is with CSS variable prefix', async () => {
    // Create tokens with kebab-case names (as if transformed)
    const transformedTokens = Object.entries(lightTokens).reduce(
      (acc, [key, token]: [string, ResolvedToken]) => {
        acc[key] = { ...token, name: token.name.replace(/\./g, '-').toLowerCase() }
        return acc
      },
      {} as typeof lightTokens,
    )

    const output = await renderCss(transformedTokens, {
      preset: 'standalone',
      selector: ':root',
      minify: false,
    })

    expect(output).toContain('--color-primitive-red:')
    expect(output).toContain('--color-base-background:')
    expect(output).toMatchSnapshot()
  })

  it('should format all token types correctly', async () => {
    const output = await renderCss(lightTokens, {
      preset: 'standalone',
      selector: ':root',
      minify: false,
    })

    // Colors
    expect(output).toContain('--color.primitive.red: #ff0000;')

    // Dimensions
    expect(output).toContain('--dimension.base.4: 1rem;')

    // Font families (arrays become comma-separated)
    expect(output).toContain('--font.family.sans:')
    expect(output).toContain('Inter')

    // Numbers
    expect(output).toContain('--font.lineHeight.normal: 1.5;')

    // Shadows
    expect(output).toContain('--shadow.elevation.sm-color:')

    expect(output).toMatchSnapshot()
  })

  it('should handle shadow arrays', async () => {
    const output = await renderCss(lightTokens, {
      preset: 'standalone',
      selector: ':root',
      minify: false,
    })

    // Multiple shadow layers should be expanded
    expect(output).toContain('--shadow.elevation.xl-0-color:')

    expect(output).toMatchSnapshot()
  })

  it('should handle string-based selector (backward compatibility)', async () => {
    const output = await renderCss(lightTokens, {
      preset: 'standalone',
      selector: '[data-theme="light"]',
      minify: false,
    })

    expect(output).toContain('[data-theme="light"] {')
    expect(output).not.toContain(':root {')
  })

  it('should handle string-based media query (backward compatibility)', async () => {
    const output = await renderCss(lightTokens, {
      preset: 'standalone',
      selector: ':root',
      mediaQuery: '(max-width: 768px)',
      minify: false,
    })

    expect(output).toContain('@media (max-width: 768px)')
    expect(output).toContain(':root {')
  })

  it('should use transformed names for modifier references', async () => {
    const baseToken: ResolvedToken = {
      $value: { colorSpace: 'srgb', components: [0, 0, 0], alpha: 1 },
      $type: 'color',
      name: 'color-base-black',
      path: ['color', 'base', 'black'],
      originalValue: { colorSpace: 'srgb', components: [0, 0, 0], alpha: 1 },
    }
    const aliasToken: ResolvedToken = {
      $value: { colorSpace: 'srgb', components: [0, 0, 0], alpha: 1 },
      $type: 'color',
      name: 'color-alias-background',
      path: ['color', 'alias', 'background'],
      originalValue: '{color.base.black}',
    }

    const baseTokens: ResolvedTokens = {
      'color.base.black': { ...baseToken, _sourceModifier: 'base' } as ResolvedToken,
    }
    const darkTokens: ResolvedTokens = {
      'color.base.black': { ...baseToken, _sourceModifier: 'base' } as ResolvedToken,
      'color.alias.background': {
        ...aliasToken,
        _sourceModifier: 'theme-dark',
      } as ResolvedToken,
    }

    const output: OutputConfig = {
      name: 'css',
      renderer,
      file: 'tokens.css',
      options: {
        preset: 'bundle',
        preserveReferences: true,
        minify: false,
      },
    }

    const context: RenderContext = {
      permutations: [
        { tokens: baseTokens, modifierInputs: { theme: 'light', scale: 'tablet' } },
        { tokens: darkTokens, modifierInputs: { theme: 'dark', scale: 'tablet' } },
      ],
      output,
      resolver: resolverDocument,
      meta: {
        dimensions: ['theme', 'scale'],
        defaults: { theme: 'light', scale: 'tablet' },
        basePermutation: { theme: 'light', scale: 'tablet' },
      },
    }

    const result = await renderer.format(context, context.output.options)
    const content = typeof result === 'string' ? result : (Object.values(result.files)[0] ?? '')

    expect(content).toContain('--color-alias-background: var(--color-base-black);')
  })

  it('should use default selector when none provided', async () => {
    const output = await renderCss(lightTokens, {
      preset: 'standalone',
      minify: false,
    })

    // Default selector is :root
    expect(output).toContain(':root {')
  })

  it('should preserve pure and composite leaf references when enabled', async () => {
    const referencedColor: ResolvedToken = {
      $value: { colorSpace: 'srgb', components: [1, 0, 0], alpha: 1 },
      $type: 'color',
      name: 'color.base.background',
      path: ['color', 'base', 'background'],
      originalValue: { colorSpace: 'srgb', components: [1, 0, 0], alpha: 1 },
    }

    const shadowToken: ResolvedToken = {
      $value: {
        color: { colorSpace: 'srgb', components: [1, 0, 0], alpha: 1 },
        offsetX: { value: 1, unit: 'px' },
        offsetY: { value: 2, unit: 'px' },
        blur: { value: 3, unit: 'px' },
        spread: { value: 0, unit: 'px' },
      },
      $type: 'shadow',
      name: 'shadow.elevation.sm',
      path: ['shadow', 'elevation', 'sm'],
      originalValue: {
        color: '{color.base.background}',
        offsetX: { value: 1, unit: 'px' },
        offsetY: { value: 2, unit: 'px' },
        blur: { value: 3, unit: 'px' },
        spread: { value: 0, unit: 'px' },
      },
    }

    const tokens: ResolvedTokens = {
      'color.base.background': referencedColor,
      'shadow.elevation.sm': shadowToken,
    }

    const output = await renderCss(tokens, {
      preset: 'standalone',
      selector: ':root',
      minify: false,
      preserveReferences: true,
    })

    expect(output).toContain('--color.base.background: #ff0000;')
    expect(output).toContain('--shadow.elevation.sm-color: var(--color.base.background);')
  })
})
