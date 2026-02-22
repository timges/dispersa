/**
 * @license MIT
 * Copyright (c) 2025-present Dispersa
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

/**
 * @fileoverview Utility for extracting token references from values
 *
 * Used by rules that need to detect references to other tokens,
 * such as no-deprecated-usage and no-going-back.
 */

const ALIAS_PATTERN = /\{([^}]+)\}/g

/**
 * Extract all token references from a value
 *
 * Recursively traverses objects and arrays to find all references
 * in the form `{token.name}`.
 *
 * @param value - Value to extract references from
 * @returns Array of referenced token names
 *
 * @example
 * ```typescript
 * extractReferences('{color.primary}') // ['color.primary']
 * extractReferences('{color.base.primary}') // ['color.base.primary']
 * extractReferences('border: {border.width} solid {color.border}') // ['border.width', 'color.border']
 * extractReferences({ value: '{spacing.md}', nested: { ref: '{spacing.lg}' } }) // ['spacing.md', 'spacing.lg']
 * ```
 */
export function extractReferences(value: unknown): string[] {
  const refs: string[] = []

  if (typeof value === 'string') {
    let match
    ALIAS_PATTERN.lastIndex = 0
    while ((match = ALIAS_PATTERN.exec(value)) !== null) {
      if (match[1]) {
        refs.push(match[1])
      }
    }
  } else if (Array.isArray(value)) {
    for (const item of value) {
      refs.push(...extractReferences(item))
    }
  } else if (typeof value === 'object' && value !== null) {
    for (const v of Object.values(value as Record<string, unknown>)) {
      refs.push(...extractReferences(v))
    }
  }

  return refs
}
