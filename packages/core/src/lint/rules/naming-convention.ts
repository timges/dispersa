/**
 * @license MIT
 * Copyright (c) 2025-present Dispersa
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

/**
 * @fileoverview Rule: naming-convention
 *
 * Enforces consistent token naming conventions.
 */

import { createRule } from '@lint/create-rule'
import { matchesGlob } from '@lint/utils'

export const NamingConventionMessages = {
  INVALID_FORMAT: 'INVALID_FORMAT',
  INVALID_SEGMENT: 'INVALID_SEGMENT',
} as const

export type NamingConventionOptions = {
  /**
   * Naming format to enforce
   * - 'kebab-case': color-brand-primary, red-500, blue-600
   * - 'camelCase': colorBrandPrimary
   * - 'PascalCase': ColorBrandPrimary
   * - 'snake_case': color_brand_primary
   * - 'screaming-snake': COLOR_BRAND_PRIMARY
   */
  format?: 'kebab-case' | 'camelCase' | 'PascalCase' | 'snake_case' | 'screaming-snake'
  /** Token name patterns to ignore (glob patterns) */
  ignore?: string[]
  /** Custom regex pattern to validate against */
  pattern?: string
  /**
   * Allow purely numeric path segments (e.g., spacing.0, spacing.1)
   * Common in design system scales. Default: true
   */
  allowNumericSegments?: boolean
}

const PATTERNS: Record<string, RegExp> = {
  'kebab-case': /^([a-z][a-z0-9]*)(-[a-z0-9]+)*$/,
  camelCase: /^[a-z][a-zA-Z0-9]*$/,
  PascalCase: /^[A-Z][a-zA-Z0-9]*$/,
  snake_case: /^([a-z][a-z0-9]*)(_[a-z0-9]+)*$/,
  'screaming-snake': /^([A-Z][A-Z0-9]*)(_[A-Z0-9]+)*$/,
}

const DEFAULT_PATTERN = /^[a-z][a-z0-9]*(-[a-z][a-z0-9]*)*$/

export const namingConvention = createRule<
  (typeof NamingConventionMessages)[keyof typeof NamingConventionMessages],
  NamingConventionOptions
>({
  meta: {
    name: 'naming-convention',
    description: 'Enforce consistent token naming conventions',
    messages: {
      INVALID_FORMAT: "Token '{{name}}' does not match '{{format}}' format",
      INVALID_SEGMENT:
        "Segment '{{segment}}' in token '{{name}}' does not match '{{format}}' format",
    },
  },
  defaultOptions: { format: 'kebab-case', allowNumericSegments: true },
  create({ tokens, options, report }) {
    const format = options.format ?? 'kebab-case'
    const ignore = options.ignore ?? []
    const customPattern = options.pattern
    const allowNumericSegments = options.allowNumericSegments ?? true

    // Use custom pattern if provided, otherwise use built-in format
    let segmentPattern: RegExp
    if (customPattern) {
      segmentPattern = new RegExp(customPattern)
    } else {
      segmentPattern = PATTERNS[format] ?? DEFAULT_PATTERN
    }

    // Pattern for pure numeric segments (common in design systems: spacing.0, spacing.1)
    const numericPattern = /^\d+$/

    for (const token of Object.values(tokens)) {
      // Skip ignored tokens
      if (ignore.length > 0 && matchesGlob(token.name, ignore)) {
        continue
      }

      // Check each path segment
      const segments = token.path
      let hasError = false

      for (const segment of segments) {
        // Allow pure numeric segments if option is enabled
        if (allowNumericSegments && numericPattern.test(segment)) {
          continue
        }

        if (!segmentPattern.test(segment)) {
          report({
            token,
            messageId: 'INVALID_SEGMENT',
            data: { name: token.name, segment, format: customPattern ?? format },
          })
          hasError = true
          break
        }
      }

      // If no segment errors, also check full name for custom patterns
      if (!hasError && customPattern && !segmentPattern.test(token.name)) {
        report({
          token,
          messageId: 'INVALID_FORMAT',
          data: { name: token.name, format: customPattern },
        })
      }
    }
  },
})
