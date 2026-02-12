/**
 * @fileoverview Utilities for applying transforms and filters to tokens
 */

import type { Filter } from '@processing/processors/filters/types'
import type { Transform } from '@processing/processors/transforms/types'
import type { ResolvedTokens } from '@tokens/types'

/**
 * Apply a list of transforms to tokens
 *
 * @param tokens - Tokens to transform
 * @param transformList - List of transform objects to apply
 * @returns Transformed tokens
 */
export function applyTransforms(
  tokens: ResolvedTokens,
  transformList: Transform[],
): ResolvedTokens {
  const result: ResolvedTokens = {}

  for (const [name, token] of Object.entries(tokens)) {
    let transformed = token

    for (const transform of transformList) {
      // Apply transform if matcher passes (or no matcher)
      if (transform.matcher == null || transform.matcher(transformed)) {
        transformed = transform.transform(transformed)
      }
    }

    result[name] = transformed
  }

  return result
}

/**
 * Apply a list of filters to tokens
 *
 * @param tokens - Tokens to filter
 * @param filterList - List of filter objects to apply
 * @returns Filtered tokens (only tokens that pass all filters)
 */
export function applyFilters(tokens: ResolvedTokens, filterList: Filter[]): ResolvedTokens {
  const result: ResolvedTokens = {}

  for (const [name, token] of Object.entries(tokens)) {
    let shouldInclude = true

    for (const filter of filterList) {
      // If any filter excludes the token, skip it
      if (!filter.filter(token)) {
        shouldInclude = false
        break
      }
    }

    if (shouldInclude) {
      result[name] = token
    }
  }

  return result
}
