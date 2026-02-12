/**
 * Tests for composite token types (DTCG 2025.10)
 */
import path from 'node:path'

import { beforeEach, describe, expect, it } from 'vitest'
import type { OutputConfig } from '../../../src/config'
import type { ResolverDocument } from '../../../src/resolution/resolution.types'
import { CssRenderer } from '../../../src/renderers/css'
import { JsonRenderer } from '../../../src/renderers/json'
import { isOutputTree } from '../../../src/renderers'
import type { RenderContext } from '../../../src/renderers/types'
import { AliasResolver } from '../../../src/resolution/alias-resolver'
import { TokenParser } from '../../../src/tokens/token-parser'

describe('Composite Tokens', () => {
  let parser: TokenParser
  let aliasResolver: AliasResolver
  const fixturesDir = path.join(__dirname, '..', '..', 'fixtures', 'tokens')

  beforeEach(() => {
    parser = new TokenParser()
    aliasResolver = new AliasResolver()
  })

  const baseResolver: ResolverDocument = {
    sets: {},
    resolutionOrder: [],
  }

  const buildContext = (output: OutputConfig, tokens: Record<string, any>): RenderContext => ({
    permutations: [{ tokens, modifierInputs: {} }],
    output,
    resolver: baseResolver,
    meta: { dimensions: [], defaults: {}, basePermutation: {} },
  })

  describe('Shadow Tokens', () => {
    it('should parse single shadow tokens', async () => {
      const shadowsPath = path.join(fixturesDir, 'shadows.json')
      const raw = await parser.parseFile(shadowsPath)
      const tokens = parser.flatten(raw)

      const shadow = tokens['shadow.elevation.sm']
      expect(shadow).toBeDefined()
      expect(shadow.$type).toBe('shadow')
      expect(shadow.$value).toHaveProperty('offsetX')
      expect(shadow.$value).toHaveProperty('offsetY')
      expect(shadow.$value).toHaveProperty('blur')
      expect(shadow.$value).toHaveProperty('color')
    })

    it('should parse multiple shadow layers', async () => {
      const shadowsPath = path.join(fixturesDir, 'shadows.json')
      const raw = await parser.parseFile(shadowsPath)
      const tokens = parser.flatten(raw)

      const shadow = tokens['shadow.elevation.xl']
      expect(shadow).toBeDefined()
      expect(Array.isArray(shadow.$value)).toBe(true)
      expect((shadow.$value as unknown as Record<string, unknown>[]).length).toBeGreaterThan(1)
    })

    it('should format shadow as CSS', async () => {
      const shadowsPath = path.join(fixturesDir, 'shadows.json')
      const raw = await parser.parseFile(shadowsPath)
      const tokens = parser.flatten(raw)

      const cssRenderer = new CssRenderer()
      const output: OutputConfig = {
        name: 'css',
        renderer: cssRenderer,
        file: 'tokens.css',
        options: {
          preset: 'standalone',
          selector: ':root',
          minify: false,
        },
      }
      const context = buildContext(output, tokens)
      const result = await cssRenderer.format(context, output.options)
      const css = isOutputTree(result) ? (Object.values(result.files)[0] ?? '') : result

      // Leaf sub-properties are still emitted
      expect(css).toContain('--shadow.elevation.sm-color:')
      expect(css).toContain('--shadow.elevation.md-offsetX:')
      expect(css).toContain('--shadow.elevation.xl-0-blur:')
      // Whole value is inlined (preserveReferences defaults to false)
      expect(css).toContain('--shadow.elevation.md:')
      expect(css).not.toContain('var(--shadow.elevation.md-offsetX)')
    })
  })

  describe('Typography Tokens', () => {
    it('should parse typography tokens', async () => {
      const typographyPath = path.join(fixturesDir, 'typography.json')
      const raw = await parser.parseFile(typographyPath)
      const tokens = parser.flatten(raw)

      const typography = tokens['typography.heading']
      expect(typography).toBeDefined()
      expect(typography.$type).toBe('typography')
      expect(typography.$value).toHaveProperty('fontFamily')
      expect(typography.$value).toHaveProperty('fontSize')
      expect(typography.$value).toHaveProperty('fontWeight')
      expect(typography.$value).toHaveProperty('letterSpacing')
      expect(typography.$value).toHaveProperty('lineHeight')
    })
  })

  describe('Border Tokens', () => {
    it('should parse border tokens', async () => {
      const borderPath = path.join(fixturesDir, 'borders.json')
      const raw = await parser.parseFile(borderPath)
      const tokens = parser.flatten(raw)

      const border = tokens['border.heavy']
      expect(border).toBeDefined()
      expect(border.$type).toBe('border')
      expect(border.$value).toHaveProperty('color')
      expect(border.$value).toHaveProperty('width')
      expect(border.$value).toHaveProperty('style')
    })
  })

  describe('Stroke Style Tokens', () => {
    it('should parse stroke style tokens', async () => {
      const strokeStylePath = path.join(fixturesDir, 'stroke-styles.json')
      const raw = await parser.parseFile(strokeStylePath)
      const tokens = parser.flatten(raw)

      const strokeStyle = tokens['stroke.dashed']
      expect(strokeStyle).toBeDefined()
      expect(strokeStyle.$type).toBe('strokeStyle')
    })
  })

  describe('Transition Tokens', () => {
    it('should parse transition tokens', async () => {
      const transitionPath = path.join(fixturesDir, 'transitions.json')
      const raw = await parser.parseFile(transitionPath)
      const tokens = parser.flatten(raw)

      const transition = tokens['transition.emphasis']
      expect(transition).toBeDefined()
      expect(transition.$type).toBe('transition')
      expect(transition.$value).toHaveProperty('duration')
      expect(transition.$value).toHaveProperty('delay')
      expect(transition.$value).toHaveProperty('timingFunction')
    })
  })

  describe('Gradient Tokens', () => {
    it('should parse gradient tokens', async () => {
      const gradientPath = path.join(fixturesDir, 'gradients.json')
      const raw = await parser.parseFile(gradientPath)
      const tokens = parser.flatten(raw)

      const gradient = tokens['gradient.blueToRed']
      expect(gradient).toBeDefined()
      expect(gradient.$type).toBe('gradient')
      expect(Array.isArray(gradient.$value)).toBe(true)
    })
  })

  describe('Composite CSS Expansion', () => {
    it('should expand typography tokens into leaf variables', async () => {
      const typographyPath = path.join(fixturesDir, 'typography.json')
      const raw = await parser.parseFile(typographyPath)
      const tokens = parser.flatten(raw)

      const cssRenderer = new CssRenderer()
      const output: OutputConfig = {
        name: 'css',
        renderer: cssRenderer,
        file: 'tokens.css',
        options: {
          preset: 'standalone',
          selector: ':root',
          minify: false,
        },
      }
      const context = buildContext(output, tokens)
      const result = await cssRenderer.format(context, output.options)
      const css = isOutputTree(result) ? (Object.values(result.files)[0] ?? '') : result

      expect(css).toContain('--typography.heading-fontFamily-0:')
      expect(css).toContain('--typography.heading-fontSize:')
      expect(css).toContain('--typography.heading-lineHeight:')
    })

    it('should emit whole vars for border and transition tokens', async () => {
      const borderPath = path.join(fixturesDir, 'borders.json')
      const transitionPath = path.join(fixturesDir, 'transitions.json')
      const borderRaw = await parser.parseFile(borderPath)
      const transitionRaw = await parser.parseFile(transitionPath)
      const tokens = { ...parser.flatten(borderRaw), ...parser.flatten(transitionRaw) }

      const cssRenderer = new CssRenderer()
      const output: OutputConfig = {
        name: 'css',
        renderer: cssRenderer,
        file: 'tokens.css',
        options: {
          preset: 'standalone',
          selector: ':root',
          minify: false,
        },
      }
      const context = buildContext(output, tokens)
      const result = await cssRenderer.format(context, output.options)
      const css = isOutputTree(result) ? (Object.values(result.files)[0] ?? '') : result

      // Whole values are inlined (preserveReferences defaults to false)
      expect(css).toContain('--border.heavy:')
      expect(css).not.toContain('var(--border.heavy-width)')
      expect(css).not.toContain('--border.focus:')
      expect(css).toContain('--transition.emphasis:')
      expect(css).not.toContain('cubic-bezier(var(--transition.emphasis-timingFunction-0)')
    })
  })

  describe('Shadow Token JSON Export', () => {
    it('should export shadow tokens to JSON with metadata', async () => {
      const shadowsPath = path.join(fixturesDir, 'shadows.json')

      const shadowsRaw = await parser.parseFile(shadowsPath)
      const allTokens = parser.flatten(shadowsRaw)

      const jsonRenderer = new JsonRenderer()
      const output: OutputConfig = {
        name: 'json',
        renderer: jsonRenderer,
        file: 'tokens.json',
        options: {
          preset: 'standalone',
          structure: 'flat',
          includeMetadata: true,
          minify: false,
        },
      }
      const context = buildContext(output, allTokens)
      const result = await jsonRenderer.format(context, output.options)
      const json = isOutputTree(result) ? (Object.values(result.files)[0] ?? '') : result

      const parsed = JSON.parse(json)

      // Check that shadow tokens are present
      expect(parsed['shadow.elevation.sm']).toBeDefined()
      expect(parsed['shadow.elevation.sm'].$type).toBe('shadow')
    })
  })
})
