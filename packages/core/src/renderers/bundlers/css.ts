/**
 * @fileoverview CSS bundler for multi-theme output
 */

import type { CssRendererOptions } from '@renderers/types'
import type { ResolverDocument } from '@resolution/resolution.types'
import { BasePermutationError, ConfigurationError } from '@shared/errors/index'
import type { ResolvedToken, ResolvedTokens } from '@tokens/types'

import type { BundleDataItem } from './types'
import {
  stripInternalMetadata,
  resolveSelector,
  resolveMediaQuery,
  countModifierDifferences,
  getExpectedSource,
  filterTokensBySource,
  parseModifierSource,
  normalizeModifierInputs,
} from './utils'

type ResolvedCssOptions = Omit<CssRendererOptions, 'selector' | 'mediaQuery'> & {
  selector?: string
  mediaQuery?: string
  referenceTokens?: ResolvedTokens
}

type TokenWithSource = ResolvedToken & {
  _sourceSet?: string
  _sourceModifier?: string
}

const getSourceSet = (token: ResolvedToken): string | undefined => {
  if (typeof token !== 'object' || token === null) {
    return undefined
  }
  const maybe = token as TokenWithSource
  return typeof maybe._sourceSet === 'string' ? maybe._sourceSet : undefined
}

const getSourceModifier = (token: ResolvedToken): string | undefined => {
  if (typeof token !== 'object' || token === null) {
    return undefined
  }
  const maybe = token as TokenWithSource
  return typeof maybe._sourceModifier === 'string' ? maybe._sourceModifier : undefined
}

/**
 * Bundle tokens as CSS with descriptive comments
 *
 * CSS-specific strategy: Uses cascade model with minimal overrides
 * - Base permutation gets all tokens in :root
 * - Single-dimension modifiers get only their overrides in [data-*] selectors
 * - Multi-dimension permutations are skipped (would create duplicate selectors)
 */
export async function bundleAsCss(
  bundleData: BundleDataItem[],
  resolver: ResolverDocument,
  options?: CssRendererOptions,
  formatTokens?: (tokens: ResolvedTokens, options: ResolvedCssOptions) => Promise<string>,
): Promise<string> {
  const baseItem = bundleData.find((item) => item.isBase)
  if (!baseItem) {
    throw new BasePermutationError('Base permutation not found in bundle data')
  }
  if (!formatTokens) {
    throw new ConfigurationError('CSS formatter was not provided')
  }

  const orderedBundleData = orderBundleData(bundleData, resolver, baseItem)
  const cssBlocks: string[] = []

  for (const item of orderedBundleData) {
    if (item.isBase) {
      const blocks = await formatBasePermutation(item, resolver, options, formatTokens)
      cssBlocks.push(...blocks)
      continue
    }

    const block = await formatModifierPermutation(item, baseItem, options, formatTokens)
    if (block) {
      cssBlocks.push(block)
    }
  }

  return cssBlocks.join('\n\n')
}

async function formatBasePermutation(
  { tokens, modifierInputs }: BundleDataItem,
  resolver: ResolverDocument,
  options: CssRendererOptions | undefined,
  formatTokens: (tokens: ResolvedTokens, options: ResolvedCssOptions) => Promise<string>,
): Promise<string[]> {
  const firstModifierName = resolver.modifiers ? Object.keys(resolver.modifiers)[0] : ''
  const modifier = firstModifierName ?? ''
  const context = modifierInputs[modifier] ?? ''

  const selector = resolveSelector(options?.selector, modifier, context, true, modifierInputs)
  const mediaQuery = resolveMediaQuery(options?.mediaQuery, modifier, context, true, modifierInputs)
  const referenceTokens = stripInternalMetadata(tokens)
  const defaultBlocks = buildDefaultLayerBlocks(tokens, modifierInputs, resolver)

  const cssBlocks: string[] = []
  for (const block of defaultBlocks) {
    const cleanTokens = stripInternalMetadata(block.tokens)
    const css = await formatTokens(cleanTokens, {
      selector,
      mediaQuery,
      minify: options?.minify,
      referenceTokens,
    })
    const header = block.description
      ? `/* ${block.key} */\n/* ${block.description} */`
      : `/* ${block.key} */`
    cssBlocks.push(`${header}\n${css}`)
  }

  return cssBlocks
}

async function formatModifierPermutation(
  { tokens, modifierInputs }: BundleDataItem,
  baseItem: BundleDataItem,
  options: CssRendererOptions | undefined,
  formatTokens: (tokens: ResolvedTokens, options: ResolvedCssOptions) => Promise<string>,
): Promise<string | undefined> {
  // Skip permutations where multiple modifiers differ from base
  const differenceCount = countModifierDifferences(modifierInputs, baseItem.modifierInputs)
  if (differenceCount > 1) {
    return undefined
  }

  // Non-base: filter to only tokens from this modifier's source
  const expectedSource = getExpectedSource(modifierInputs, baseItem.modifierInputs)
  let tokensToInclude = filterTokensBySource(tokens, expectedSource)
  const hasSourceMetadata = Object.values(tokens).some(
    (token) => token != null && getSourceModifier(token) !== undefined,
  )

  // If tokens have no source metadata, fall back to full token set
  if (Object.keys(tokensToInclude).length === 0 && !hasSourceMetadata) {
    tokensToInclude = tokens
  }

  if (Object.keys(tokensToInclude).length === 0) {
    return undefined
  }

  const [modifier, context] = parseModifierSource(expectedSource)
  const cleanTokens = stripInternalMetadata(tokensToInclude)
  const referenceTokens = stripInternalMetadata(tokens)
  const selector = resolveSelector(options?.selector, modifier, context, false, modifierInputs)
  const mediaQuery = resolveMediaQuery(
    options?.mediaQuery,
    modifier,
    context,
    false,
    modifierInputs,
  )

  const css = await formatTokens(cleanTokens, {
    selector,
    mediaQuery,
    minify: options?.minify,
    referenceTokens,
  })
  return `/* Modifier: ${modifier}=${context} */\n${css}`
}

type DefaultLayerBlock = {
  key: string
  description?: string
  tokens: BundleDataItem['tokens']
}

/** Collect tokens belonging to a specific set, excluding already-included tokens */
function collectSetTokens(
  tokens: BundleDataItem['tokens'],
  setName: string,
  included: Set<string>,
): BundleDataItem['tokens'] {
  const result: BundleDataItem['tokens'] = {}
  for (const [name, token] of Object.entries(tokens)) {
    if (!included.has(name) && getSourceSet(token) === setName) {
      result[name] = token
    }
  }
  return result
}

/** Collect tokens belonging to a specific modifier source, excluding already-included tokens */
function collectModifierTokens(
  tokens: BundleDataItem['tokens'],
  expectedSource: string,
  included: Set<string>,
): BundleDataItem['tokens'] {
  const result: BundleDataItem['tokens'] = {}
  for (const [name, token] of Object.entries(tokens)) {
    if (!included.has(name) && (getSourceModifier(token) ?? '').toLowerCase() === expectedSource) {
      result[name] = token
    }
  }
  return result
}

/** Collect all tokens not yet included in any block */
function collectRemainder(
  tokens: BundleDataItem['tokens'],
  included: Set<string>,
): BundleDataItem['tokens'] {
  const result: BundleDataItem['tokens'] = {}
  for (const [name, token] of Object.entries(tokens)) {
    if (!included.has(name)) {
      result[name] = token
    }
  }
  return result
}

function buildDefaultLayerBlocks(
  tokens: BundleDataItem['tokens'],
  baseModifierInputs: Record<string, string>,
  resolver: ResolverDocument,
): DefaultLayerBlock[] {
  const blocks: DefaultLayerBlock[] = []
  const included = new Set<string>()
  const baseInputs = normalizeModifierInputs(baseModifierInputs)

  const addBlock = (key: string, blockTokens: BundleDataItem['tokens'], description?: string) => {
    if (Object.keys(blockTokens).length === 0) {
      return
    }
    for (const k of Object.keys(blockTokens)) {
      included.add(k)
    }
    blocks.push({ key, description, tokens: blockTokens })
  }

  for (const item of resolver.resolutionOrder) {
    const ref = (item as { $ref?: unknown }).$ref
    if (typeof ref !== 'string') {
      continue
    }

    if (ref.startsWith('#/sets/')) {
      const setName = ref.slice('#/sets/'.length)
      addBlock(
        `Set: ${setName}`,
        collectSetTokens(tokens, setName, included),
        resolver.sets?.[setName]?.description,
      )
      continue
    }

    if (ref.startsWith('#/modifiers/')) {
      const modifierName = ref.slice('#/modifiers/'.length)
      const modifier = resolver.modifiers?.[modifierName]
      const selectedContext = baseInputs[modifierName.toLowerCase()]
      if (!modifier || !selectedContext) {
        continue
      }

      const expectedSource = `${modifierName}-${selectedContext}`.toLowerCase()
      addBlock(
        `Modifier: ${modifierName}=${selectedContext} (default)`,
        collectModifierTokens(tokens, expectedSource, included),
        modifier.description,
      )
    }
  }

  addBlock('Unattributed', collectRemainder(tokens, included))
  return blocks
}

/** Find a permutation that differs from the base in exactly one modifier dimension */
function findSingleDiffPermutation(
  bundleData: BundleDataItem[],
  modifierName: string,
  context: string,
  baseInputs: Record<string, string>,
): BundleDataItem | undefined {
  const normalizedModifier = modifierName.toLowerCase()
  const normalizedContext = context.toLowerCase()

  return bundleData.find((item) => {
    if (item.isBase) {
      return false
    }
    const inputs = normalizeModifierInputs(item.modifierInputs)
    if (inputs[normalizedModifier] !== normalizedContext) {
      return false
    }
    return Object.entries(baseInputs).every(([k, v]) => k === normalizedModifier || inputs[k] === v)
  })
}

function orderBundleData(
  bundleData: BundleDataItem[],
  resolver: ResolverDocument,
  baseItem: BundleDataItem,
): BundleDataItem[] {
  const modifiers = resolver.modifiers
  if (!modifiers) {
    return bundleData
  }

  const baseInputs = normalizeModifierInputs(baseItem.modifierInputs)
  const orderedModifierNames = getOrderedModifierNames(resolver)
  if (orderedModifierNames.length === 0) {
    return bundleData
  }

  const firstModifierDef = modifiers[orderedModifierNames[0] ?? '']
  if (!firstModifierDef) {
    return bundleData
  }

  const includedKeys = new Set<string>()
  const ordered: BundleDataItem[] = []

  const pushUnique = (item: BundleDataItem | undefined) => {
    if (!item) {
      return
    }
    const key = stableInputsKey(item.modifierInputs)
    if (includedKeys.has(key)) {
      return
    }
    includedKeys.add(key)
    ordered.push(item)
  }

  pushUnique(baseItem)

  for (const modifierName of orderedModifierNames) {
    const modifierDef = modifiers[modifierName]
    if (!modifierDef) {
      continue
    }

    const defaultValue = baseInputs[modifierName.toLowerCase()] ?? ''
    for (const ctx of Object.keys(modifierDef.contexts)) {
      if (defaultValue === ctx.toLowerCase()) {
        continue
      }
      pushUnique(findSingleDiffPermutation(bundleData, modifierName, ctx, baseInputs))
    }
  }

  return ordered.length > 0 ? ordered : bundleData
}

function getOrderedModifierNames(resolver: ResolverDocument): string[] {
  const modifiers = resolver.modifiers ?? {}
  const seen = new Set<string>()
  const ordered: string[] = []

  for (const item of resolver.resolutionOrder) {
    const ref = (item as { $ref?: unknown }).$ref
    if (typeof ref !== 'string') {
      continue
    }
    if (!ref.startsWith('#/modifiers/')) {
      continue
    }
    const name = ref.slice('#/modifiers/'.length)
    if (seen.has(name)) {
      continue
    }
    if (!(name in modifiers)) {
      continue
    }
    ordered.push(name)
    seen.add(name)
  }

  for (const name of Object.keys(modifiers)) {
    if (seen.has(name)) {
      continue
    }
    ordered.push(name)
    seen.add(name)
  }

  return ordered
}

function stableInputsKey(modifierInputs: Record<string, string>): string {
  const normalized = normalizeModifierInputs(modifierInputs)
  return Object.keys(normalized)
    .sort()
    .map((k) => `${k}=${normalized[k]}`)
    .join('|')
}
