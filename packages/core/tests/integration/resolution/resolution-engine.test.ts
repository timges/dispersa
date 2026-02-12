import * as path from 'node:path'

import { beforeEach, describe, expect, it, vi } from 'vitest'

import { ResolverParser } from '../../../src/adapters/filesystem/resolver-parser'
import { ReferenceResolver, ResolutionEngine } from '../../../src/resolution'
import { TokenParser } from '../../../src/tokens/token-parser'
import { getFixturePath } from '../../utils/test-helpers'

describe('Resolution Engine Integration', () => {
  let parser: ResolverParser
  let refResolver: ReferenceResolver

  beforeEach(() => {
    parser = new ResolverParser()
    const fixturesDir = path.dirname(getFixturePath('tokens.resolver.json'))
    refResolver = new ReferenceResolver(fixturesDir)
  })

  describe('Reference Resolution', () => {
    it('resolves file references ($ref)', async () => {
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

    it('resolves JSON Pointer references', async () => {
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

    it('handles nested references', async () => {
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

  describe('Permutation Generation', () => {
    it('generates correct number of permutations', async () => {
      const resolverPath = getFixturePath('tokens.resolver.json')
      const resolver = await parser.parseFile(resolverPath)
      const engine = new ResolutionEngine(resolver, refResolver)

      const permutations = engine.generatePermutations()

      // Should generate 6 permutations: 2 themes × 3 scales
      expect(permutations).toHaveLength(6)
    })

    it('includes all modifier combinations', async () => {
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
  })

  describe('Token Resolution', () => {
    it('resolves tokens with specific modifiers', async () => {
      const resolverPath = getFixturePath('tokens.resolver.json')
      const resolver = await parser.parseFile(resolverPath)
      const engine = new ResolutionEngine(resolver, refResolver)

      const tokens = await engine.resolve({ theme: 'dark', scale: 'mobile' })

      expect(tokens).toBeDefined()
      expect(Object.keys(tokens).length).toBeGreaterThan(0)
    })

    it('merges tokens correctly using last-wins strategy', async () => {
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

    it('applies modifier defaults when none specified', async () => {
      const resolverPath = getFixturePath('tokens.resolver.json')
      const resolver = await parser.parseFile(resolverPath)
      const engine = new ResolutionEngine(resolver, refResolver)

      // Resolve without specifying modifiers - should use defaults
      const tokens = await engine.resolve({})

      expect(tokens).toBeDefined()
      // Default is light theme, tablet scale
      expect(Object.keys(tokens).length).toBeGreaterThan(0)
    })

    it('handles scale modifier variations correctly', async () => {
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

    it('resolves all token types from base set', async () => {
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

    it('preserves semantic tokens during resolution', async () => {
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

  describe('Validation Modes', () => {
    it('should warn instead of throwing for invalid modifier input types', async () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
      const resolverPath = getFixturePath('tokens.resolver.json')
      const resolver = await parser.parseFile(resolverPath)
      const engine = new ResolutionEngine(resolver, refResolver, {
        validation: { mode: 'warn' },
      })

      await expect(engine.resolve({ theme: true as any })).resolves.toBeDefined()
      expect(warn).toHaveBeenCalled()
      warn.mockRestore()
    })

    it('should skip validation when mode is off', async () => {
      const resolverPath = getFixturePath('tokens.resolver.json')
      const resolver = await parser.parseFile(resolverPath)
      const engine = new ResolutionEngine(resolver, refResolver, {
        validation: { mode: 'off' },
      })

      await expect(engine.resolve({ theme: true as any })).resolves.toBeDefined()
    })
  })
})
