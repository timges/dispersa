/**
 * @license MIT
 * Copyright (c) 2025-present Dispersa Contributors
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

/**
 * @fileoverview Tailwind CSS v4 bundler for multi-theme output
 *
 * Bundles multiple permutations into a single Tailwind @theme file.
 * The base permutation tokens are included in @theme to define the utility
 * vocabulary. Non-base permutations (e.g., dark mode) are appended as plain
 * CSS custom property overrides with configurable selectors/media queries.
 */

import type { TailwindRendererOptions } from '@renderers/tailwind'
import type { MediaQueryFunction, SelectorFunction } from '@renderers/types'
import { BasePermutationError } from '@shared/errors/index'
import type { ResolvedTokens } from '@tokens/types'

import type { BundleDataItem } from './types'
import {
  countModifierDifferences,
  getExpectedSource,
  normalizeModifierInputs,
  parseModifierSource,
  resolveMediaQuery,
  resolveSelector,
  stripInternalMetadata,
} from './utils'

type ResolvedTailwindOptions = {
  preset: 'bundle' | 'standalone'
  includeImport: boolean
  namespace: string
  minify: boolean
  selector?: string | SelectorFunction
  mediaQuery?: string | MediaQueryFunction
  variantDeclarations: string[]
}

/**
 * Bundle tokens as a Tailwind v4 @theme CSS file with modifier overrides
 *
 * Strategy:
 * - Base permutation tokens go into @theme (defines the Tailwind utility vocabulary)
 * - Non-base permutations are appended as plain CSS custom property overrides
 *   using configurable selectors/media queries, consistent with the CSS renderer
 */
export async function bundleAsTailwind(
  bundleData: BundleDataItem[],
  options: ResolvedTailwindOptions | TailwindRendererOptions,
  formatThemeTokens: (tokens: ResolvedTokens, options: ResolvedTailwindOptions) => Promise<string>,
  formatOverrideBlock: (
    tokens: ResolvedTokens,
    selector: string,
    mediaQuery: string,
    minify: boolean,
  ) => Promise<string>,
): Promise<string> {
  const baseItem = bundleData.find((item) => item.isBase)
  if (!baseItem) {
    throw new BasePermutationError('Base permutation not found in bundle data')
  }

  const resolvedOpts = resolveOptions(options)
  const cssBlocks: string[] = []

  // Collect @custom-variant declarations from non-base permutations
  const variantDeclarations = collectVariantDeclarations(bundleData, baseItem, resolvedOpts)
  const themeOpts: ResolvedTailwindOptions = { ...resolvedOpts, variantDeclarations }

  // Base permutation: format as @theme block
  const baseTokens = stripInternalMetadata(baseItem.tokens)
  const themeBlock = await formatThemeTokens(baseTokens, themeOpts)
  cssBlocks.push(themeBlock)

  // Non-base permutations: format as plain CSS override blocks
  for (const item of bundleData) {
    if (item.isBase) {
      continue
    }

    const block = await formatModifierOverride(item, baseItem, resolvedOpts, formatOverrideBlock)
    if (block) {
      cssBlocks.push(block)
    }
  }

  return cssBlocks.join('\n')
}

async function formatModifierOverride(
  { tokens, modifierInputs }: BundleDataItem,
  baseItem: BundleDataItem,
  options: ResolvedTailwindOptions,
  formatOverrideBlock: (
    tokens: ResolvedTokens,
    selector: string,
    mediaQuery: string,
    minify: boolean,
  ) => Promise<string>,
): Promise<string | undefined> {
  // Skip permutations where multiple modifiers differ from base
  const differenceCount = countModifierDifferences(modifierInputs, baseItem.modifierInputs)
  if (differenceCount > 1) {
    return undefined
  }

  // Include tokens whose resolved value differs from the base permutation.
  // Source-based filtering alone misses alias tokens that change indirectly
  // (e.g., background-base references gray.25 which changes in dark mode).
  // Since the Tailwind renderer resolves all references to final values,
  // every token with a changed value must appear in the override block.
  const tokensToInclude = filterTokensByValueChange(tokens, baseItem.tokens)

  if (Object.keys(tokensToInclude).length === 0) {
    return undefined
  }

  const expectedSource = getExpectedSource(modifierInputs, baseItem.modifierInputs)

  const [modifier, context] = parseModifierSource(expectedSource)
  const cleanTokens = stripInternalMetadata(tokensToInclude)

  const selector = resolveSelector(
    options.selector,
    modifier,
    context,
    false,
    normalizeModifierInputs(modifierInputs),
  )
  const mediaQuery = resolveMediaQuery(
    options.mediaQuery,
    modifier,
    context,
    false,
    normalizeModifierInputs(modifierInputs),
  )

  const css = await formatOverrideBlock(cleanTokens, selector, mediaQuery, options.minify)
  return `/* Modifier: ${modifier}=${context} */\n${css}`
}

/**
 * Filter tokens to those whose resolved value differs from the base permutation.
 *
 * Unlike source-based filtering, this catches alias tokens that change
 * indirectly through reference resolution (e.g., background-base references
 * gray.25 which has a different value in dark mode).
 */
function filterTokensByValueChange(
  currentTokens: ResolvedTokens,
  baseTokens: ResolvedTokens,
): ResolvedTokens {
  const changed: ResolvedTokens = {}

  for (const [name, token] of Object.entries(currentTokens)) {
    const baseToken = baseTokens[name]
    if (!baseToken) {
      changed[name] = token
      continue
    }
    if (JSON.stringify(token.$value) !== JSON.stringify(baseToken.$value)) {
      changed[name] = token
    }
  }

  return changed
}

/**
 * Derive @custom-variant declarations from non-base permutations.
 *
 * For each non-base permutation that differs by a single modifier,
 * builds a Tailwind v4 @custom-variant line using the resolved selector
 * or media query. Variant names follow the {modifier}-{context} format
 * (e.g. "theme-dark") to avoid collisions across modifier dimensions.
 */
function collectVariantDeclarations(
  bundleData: BundleDataItem[],
  baseItem: BundleDataItem,
  options: ResolvedTailwindOptions,
): string[] {
  const declarations: string[] = []

  for (const item of bundleData) {
    if (item.isBase) {
      continue
    }

    const differenceCount = countModifierDifferences(item.modifierInputs, baseItem.modifierInputs)
    if (differenceCount > 1) {
      continue
    }

    const expectedSource = getExpectedSource(item.modifierInputs, baseItem.modifierInputs)
    const [modifier, context] = parseModifierSource(expectedSource)
    const variantName = `${modifier}-${context}`
    const normalized = normalizeModifierInputs(item.modifierInputs)

    const mediaQuery = resolveMediaQuery(options.mediaQuery, modifier, context, false, normalized)
    if (mediaQuery !== '') {
      declarations.push(`@custom-variant ${variantName} (@media ${mediaQuery});`)
      continue
    }

    const selector = resolveSelector(options.selector, modifier, context, false, normalized)
    declarations.push(`@custom-variant ${variantName} (&:where(${selector}, ${selector} *));`)
  }

  return declarations
}

function resolveOptions(
  options: ResolvedTailwindOptions | TailwindRendererOptions,
): ResolvedTailwindOptions {
  return {
    preset: options.preset ?? 'bundle',
    includeImport: options.includeImport ?? true,
    namespace: options.namespace ?? '',
    minify: options.minify ?? false,
    selector: options.selector,
    mediaQuery: options.mediaQuery,
    variantDeclarations: [],
  }
}
