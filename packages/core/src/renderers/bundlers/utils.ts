/**
 * @fileoverview Shared utilities for bundlers
 */

import { ResolverLoader } from '@adapters/filesystem/resolver-loader'
import type { ModifierInputs, ResolvedTokens } from '@config/index'
import type { ResolverDocument } from '@lib/resolution/resolution.types'
import type { InternalResolvedTokens } from '@lib/tokens/types'
import type { MediaQueryFunction, SelectorFunction } from '@renderers/types'
import { stripInternalTokenMetadata } from '@shared/utils/token-utils'

function sanitizeDataAttributeName(value: string): string {
  // Attribute names are more constrained than token/modifier names.
  // Use a conservative whitelist to avoid generating invalid selectors.
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}

function escapeCssString(value: string): string {
  // Minimal escaping for use inside double-quoted CSS strings.
  // Prevents breaking out of the attribute selector value.
  return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\r?\n/g, ' ')
}

export function normalizeModifierInputs(inputs: Record<string, string>): Record<string, string> {
  const normalized: Record<string, string> = {}
  for (const [key, value] of Object.entries(inputs)) {
    normalized[key.toLowerCase()] = value.toLowerCase()
  }
  return normalized
}

export function buildStablePermutationKey(
  modifierInputs: Record<string, string>,
  dimensions: string[],
): string {
  return dimensions.map((dimension) => `${dimension}=${modifierInputs[dimension] ?? ''}`).join('|')
}

/**
 * Resolve a CSS selector (either string or function) to a string
 *
 * Handles both static string selectors and dynamic function-based selectors.
 * Falls back to default behavior if no selector is provided:
 * - Base permutation: ':root'
 * - Modifier permutation: '[data-{modifierName}="{context}"]'
 *
 * @param selector - Selector as string or function
 * @param modifierName - Name of the modifier (e.g., 'theme')
 * @param context - Context value of the modifier (e.g., 'dark')
 * @param isBase - Whether this is the base permutation
 * @param allModifierInputs - All modifier inputs for this permutation
 * @returns Resolved CSS selector string
 */
export function resolveSelector(
  selector: string | SelectorFunction | undefined,
  modifierName: string,
  context: string,
  isBase: boolean,
  allModifierInputs: Record<string, string>,
): string {
  if (typeof selector === 'function') {
    return selector(modifierName, context, isBase, allModifierInputs)
  }
  if (typeof selector === 'string') {
    return selector
  }
  // Default behavior
  if (isBase) {
    return ':root'
  }

  const attrName = sanitizeDataAttributeName(modifierName)
  const attrValue = escapeCssString(context)
  return `[data-${attrName}="${attrValue}"]`
}

/**
 * Resolve a media query (either string or function) to a string
 *
 * Handles both static string media queries and dynamic function-based media queries.
 * Returns empty string if no media query is provided.
 *
 * @param mediaQuery - Media query as string or function
 * @param modifierName - Name of the modifier (e.g., 'breakpoint')
 * @param context - Context value of the modifier (e.g., 'mobile')
 * @param isBase - Whether this is the base permutation
 * @param allModifierInputs - All modifier inputs for this permutation
 * @returns Resolved media query string or empty string
 */
export function resolveMediaQuery(
  mediaQuery: string | MediaQueryFunction | undefined,
  modifierName: string,
  context: string,
  isBase: boolean,
  allModifierInputs: Record<string, string>,
): string {
  if (typeof mediaQuery === 'function') {
    return mediaQuery(modifierName, context, isBase, allModifierInputs)
  }
  if (typeof mediaQuery === 'string') {
    return mediaQuery
  }
  // No default for media queries
  return ''
}

/**
 * Strip internal metadata from tokens before formatting
 * Removes all properties starting with underscore (_)
 */
export function stripInternalMetadata(tokens: InternalResolvedTokens): ResolvedTokens {
  return stripInternalTokenMetadata(tokens)
}

/**
 * Generate a clean key/label for a permutation
 *
 * For base permutation: returns "base"
 * For single-dimension diff: returns "modifier-value" (e.g., "theme-dark", "brand-partner-a")
 * For multi-dimension diff (fallback): returns full key (e.g., "primary-web-comfortable-dark-standard")
 */
export function generatePermutationKey(
  modifierInputs: Record<string, string>,
  resolver: ResolverDocument,
  isBase: boolean,
): string {
  if (isBase) {
    return 'base'
  }

  const metadata = buildMetadata(resolver)
  const normalizedInputs = normalizeModifierInputs(modifierInputs)
  const defaults = metadata.defaults

  // Find which modifier differs
  const differences: Array<{ name: string; value: string }> = []
  for (const dimension of metadata.dimensions) {
    const value = normalizedInputs[dimension]
    if (value !== undefined && value !== defaults[dimension]) {
      differences.push({ name: dimension, value })
    }
  }

  // If exactly one modifier differs, use clean format
  if (differences.length === 1 && differences[0]) {
    const diff = differences[0]
    return `${diff.name}-${diff.value}`
  }

  // Fallback: use full key (shouldn't happen with single-dimension permutations)
  return buildStablePermutationKey(normalizedInputs, metadata.dimensions)
}

export function buildInMemoryOutputKey(params: {
  outputName: string
  extension: string
  modifierInputs: Record<string, string>
  resolver: ResolverDocument
  defaults: Record<string, string>
}): string {
  const { outputName, extension, modifierInputs, resolver, defaults } = params
  const normalizedInputs = normalizeModifierInputs(modifierInputs)
  const normalizedDefaults = normalizeModifierInputs(defaults)
  const isBase = Object.entries(normalizedDefaults).every(
    ([key, value]) => normalizedInputs[key] === value,
  )
  const permutationKey = generatePermutationKey(modifierInputs, resolver, isBase)
  return `${outputName}-${permutationKey}.${extension}`
}

/**
 * Build metadata for bundle formats
 */
export function buildMetadata(resolver: ResolverDocument): {
  dimensions: string[]
  defaults: Record<string, string>
} {
  const metadata: {
    dimensions: string[]
    defaults: Record<string, string>
  } = {
    dimensions: [],
    defaults: {},
  }

  if (resolver.modifiers) {
    for (const [name, modifier] of Object.entries(resolver.modifiers)) {
      const normalizedName = name.toLowerCase()
      const defaultContext = modifier.default ?? Object.keys(modifier.contexts)[0] ?? ''
      metadata.dimensions.push(normalizedName)
      metadata.defaults[normalizedName] = defaultContext.toLowerCase()
    }
  }

  return metadata
}

/**
 * Resolve a resolver input to a ResolverDocument
 *
 * Handles both string paths (loaded from filesystem) and inline ResolverDocument objects.
 * This eliminates duplicate resolver loading logic across renderers.
 *
 * @param input - Either a file path string or an inline ResolverDocument object
 * @returns Resolved ResolverDocument ready for use
 */
export async function resolveResolverDocument(
  input: string | ResolverDocument,
): Promise<ResolverDocument> {
  if (typeof input === 'string') {
    const loader = new ResolverLoader({})
    return await loader.loadDocument(input)
  }
  return input
}

/**
 * Count how many modifiers differ between two inputs
 */
export function countModifierDifferences(
  currentInputs: Record<string, string>,
  baseInputs: Record<string, string>,
): number {
  const normalizedCurrent = normalizeModifierInputs(currentInputs)
  const normalizedBase = normalizeModifierInputs(baseInputs)
  let count = 0
  for (const [key, value] of Object.entries(normalizedCurrent)) {
    if (value !== normalizedBase[key]) {
      count++
    }
  }
  return count
}

/**
 * Determine which modifier source this permutation represents
 * Returns source tag like "theme-dark" or "platform-mobile"
 */
export function getExpectedSource(
  currentInputs: Record<string, string>,
  baseInputs: Record<string, string>,
): string {
  const normalizedCurrent = normalizeModifierInputs(currentInputs)
  const normalizedBase = normalizeModifierInputs(baseInputs)
  // Find which modifier differs
  for (const [key, value] of Object.entries(normalizedCurrent)) {
    if (value !== normalizedBase[key]) {
      return `${key}-${value}`
    }
  }
  return 'base'
}

/**
 * Extract modifier name and context from an expected source string
 * For example: "theme-dark" returns ["theme", "dark"]
 */
export function parseModifierSource(source: string): [modifierName: string, context: string] {
  const dashIndex = source.indexOf('-')
  if (dashIndex === -1) {
    return [source, '']
  }
  return [source.slice(0, dashIndex), source.slice(dashIndex + 1)]
}

/**
 * Filter tokens to only include those from a specific source
 */
export function filterTokensBySource(
  tokens: InternalResolvedTokens,
  expectedSource: string,
): InternalResolvedTokens {
  const filtered: InternalResolvedTokens = {}
  const expected = expectedSource.toLowerCase()

  for (const [name, token] of Object.entries(tokens)) {
    const source =
      typeof token._sourceModifier === 'string' ? token._sourceModifier.toLowerCase() : ''

    // Check if token has the expected source (case-insensitive)
    if (source !== '' && source === expected) {
      filtered[name] = token
    }
  }

  return filtered
}

/**
 * Interpolate pattern placeholders in a filename string
 *
 * Replaces {key} placeholders with values from modifierInputs.
 * For example, "tokens-{theme}-{platform}.css" with {theme: 'dark', output: 'mobile'}
 * becomes "tokens-dark-mobile.css".
 *
 * Also supports {modifierName} and {context} for modifier-specific files.
 *
 * @param pattern - Filename pattern with {key} placeholders
 * @param modifierInputs - Modifier values to interpolate
 * @param modifierName - Optional specific modifier name for {modifierName} placeholder
 * @param context - Optional specific context value for {context} placeholder
 * @returns Interpolated filename
 */
export function interpolatePattern(
  pattern: string,
  modifierInputs: ModifierInputs,
  modifierName?: string,
  context?: string,
): string {
  let result = pattern

  // Replace {modifierName} and {context} if provided
  if (modifierName !== undefined) {
    result = result.replace(/\{modifierName\}/g, modifierName)
  }
  if (context !== undefined) {
    result = result.replace(/\{context\}/g, context)
  }

  // Replace modifier input placeholders
  for (const [key, value] of Object.entries(modifierInputs)) {
    result = result.replace(new RegExp(`\\{${key}\\}`, 'g'), value)
  }
  return result
}

/**
 * Generate filename for standalone renderer
 *
 * Supports three modes:
 * 1. Pattern string with {key} placeholders: "tokens-{theme}-{platform}.css"
 * 2. Function that receives modifierInputs: (inputs) => `tokens-${inputs.theme}.css`
 * 3. Plain string: applies default pattern with all modifiers
 *
 * @param fileName - Filename configuration (string or function)
 * @param modifierInputs - Modifier values for this permutation
 * @param modifierName - Optional specific modifier name for {modifierName} placeholder
 * @param context - Optional specific context value for {context} placeholder
 * @returns Resolved filename
 */
export function resolveFileName(
  fileName: string | ((modifierInputs: ModifierInputs) => string),
  modifierInputs: ModifierInputs,
  modifierName?: string,
  context?: string,
): string {
  // Function-based filename
  if (typeof fileName === 'function') {
    return fileName(modifierInputs)
  }

  // Pattern-based filename: check if it contains {key} placeholders
  if (/\{.+?\}/.test(fileName)) {
    return interpolatePattern(fileName, modifierInputs, modifierName, context)
  }

  // Plain string: apply default pattern (backward compatible)
  // Extract file extension and base name
  const extMatch = fileName.match(/(\.[^.]+)$/)
  const extension = extMatch ? extMatch[1] : ''
  const baseName = extension ? fileName.slice(0, -extension.length) : fileName

  // If modifierName and context are provided (modifier mode), use only those
  if (modifierName !== undefined && context !== undefined) {
    return `${baseName}-${modifierName}-${context}${extension}`
  }

  // Build modifier suffix from all modifiers
  const modifierSuffix = Object.entries(modifierInputs)
    .sort(([keyA], [keyB]) => keyA.localeCompare(keyB))
    .map(([key, value]) => `${key}-${value}`)
    .join('-')

  // Construct filename with suffix before extension
  if (modifierSuffix) {
    return `${baseName}-${modifierSuffix}${extension}`
  }

  return fileName
}

/**
 * Resolve output path for a given permutation without writing to disk.
 */
export function resolveOutputPath(
  outputFileName: string | ((modifierInputs: ModifierInputs) => string),
  modifierInputs: ModifierInputs,
  modifierName?: string,
  context?: string,
): string {
  return resolveFileName(outputFileName, modifierInputs, modifierName, context)
}
