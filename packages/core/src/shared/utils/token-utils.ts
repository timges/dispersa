/**
 * @fileoverview Token utility functions
 */

import type { InternalResolvedTokens, ResolvedToken, ResolvedTokens } from '@tokens/types'

/**
 * Format deprecation message for a token
 *
 * Generates a standardized deprecation message that can be used in comments,
 * descriptions, or warnings. Handles both boolean and string deprecation values.
 *
 * @param token - Token with optional deprecation information
 * @param description - Optional existing description to prepend deprecation info to
 * @param format - Output format: 'comment' for CSS comments, 'bracket' for [DEPRECATED] prefix
 * @returns Formatted deprecation message or description with deprecation prefix
 *
 * @example
 * ```typescript
 * // CSS comment format
 * formatDeprecationMessage(token, '', 'comment')
 * // Returns: "DEPRECATED: Use new-token instead"
 *
 * // Bracket format
 * formatDeprecationMessage(token, 'Primary color', 'bracket')
 * // Returns: "[DEPRECATED: Use new-token instead] Primary color"
 * ```
 */
export function formatDeprecationMessage(
  token: ResolvedToken,
  description: string = '',
  format: 'comment' | 'bracket' = 'bracket',
): string {
  if (token.$deprecated == null || token.$deprecated === false) {
    return description
  }

  const deprecationMsg = typeof token.$deprecated === 'string' ? token.$deprecated : ''

  if (format === 'comment') {
    const msg = deprecationMsg ? ` ${deprecationMsg}` : ''
    return `DEPRECATED${msg}`
  }

  const msg = deprecationMsg ? `: ${deprecationMsg}` : ''
  const prefix = `[DEPRECATED${msg}]`
  return description ? `${prefix} ${description}` : prefix
}

/**
 * Strip internal metadata from tokens before public output
 */
export function stripInternalTokenMetadata(tokens: InternalResolvedTokens): ResolvedTokens {
  const cleaned: ResolvedTokens = {}

  for (const [name, token] of Object.entries(tokens)) {
    const { _isAlias: _alias, _sourceModifier: _source, _sourceSet: _sourceSet, ...rest } = token
    cleaned[name] = rest
  }

  return cleaned
}

/**
 * Get sorted token entries for deterministic output ordering
 */
export function getSortedTokenEntries(
  tokens: ResolvedTokens,
): Array<[name: string, token: ResolvedToken]> {
  return Object.entries(tokens).sort(([nameA], [nameB]) => nameA.localeCompare(nameB))
}

/**
 * Build a nested object from resolved tokens using their path hierarchy.
 *
 * Shared between JSON and JS renderers that need to convert flat tokens
 * into nested structures matching the original token group hierarchy.
 *
 * @param tokens - Flat resolved tokens map
 * @param extractValue - Callback to extract the leaf value from each token
 * @returns Nested object mirroring the token path structure
 */
export function buildNestedTokenObject(
  tokens: ResolvedTokens,
  extractValue: (token: ResolvedToken) => unknown,
): Record<string, unknown> {
  const result: Record<string, unknown> = {}
  for (const [, token] of getSortedTokenEntries(tokens)) {
    setNestedValue(result, token.path, extractValue(token))
  }
  return result
}

function setNestedValue(root: Record<string, unknown>, path: string[], value: unknown): void {
  let current = root

  for (let i = 0; i < path.length - 1; i++) {
    const part = path[i]
    if (part == null) {
      continue
    }
    if (!(part in current)) {
      current[part] = {}
    }
    current = current[part] as Record<string, unknown>
  }

  const lastPart = path[path.length - 1]
  if (lastPart != null) {
    current[lastPart] = value
  }
}

/**
 * Check if a value looks like a DTCG token (has `$value` or `$ref` property).
 *
 * This is the base structural check shared by parsers, validators, and resolvers.
 * Individual modules may wrap this in a type-guard to narrow to their own token types.
 */
export function isTokenLike(value: unknown): boolean {
  return typeof value === 'object' && value !== null && ('$value' in value || '$ref' in value)
}

/**
 * Extract a pure alias reference name from a string value.
 *
 * Returns the inner token name for "{token.name}" inputs and undefined otherwise.
 */
export function getPureAliasReferenceName(value: unknown): string | undefined {
  if (typeof value !== 'string') {
    return undefined
  }
  const match = /^\{([^}]+)\}$/.exec(value)
  return match?.[1]?.trim()
}
