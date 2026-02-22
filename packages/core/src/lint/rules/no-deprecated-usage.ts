/**
 * @license MIT
 * Copyright (c) 2025-present Dispersa
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

/**
 * @fileoverview Rule: no-deprecated-usage
 *
 * Warns when tokens reference deprecated tokens.
 */

import { createRule } from '@lint/create-rule'
import { extractReferences, matchesGlob } from '@lint/utils'

export const NoDeprecatedUsageMessages = {
  REFERENCES_DEPRECATED: 'REFERENCES_DEPRECATED',
} as const

export type NoDeprecatedUsageOptions = {
  /** Token name patterns to ignore (glob patterns) */
  ignore?: string[]
}

export const noDeprecatedUsage = createRule<
  (typeof NoDeprecatedUsageMessages)[keyof typeof NoDeprecatedUsageMessages],
  NoDeprecatedUsageOptions
>({
  meta: {
    name: 'no-deprecated-usage',
    description: 'Disallow references to deprecated tokens',
    messages: {
      REFERENCES_DEPRECATED: "Token '{{name}}' references deprecated token '{{ref}}'. {{reason}}",
    },
  },
  defaultOptions: {},
  create({ tokens, options, report }) {
    const ignore = options.ignore ?? []

    // Build set of deprecated tokens
    const deprecatedTokens = new Map<string, string | true>()
    for (const token of Object.values(tokens)) {
      if (token.$deprecated) {
        const reason = typeof token.$deprecated === 'string' ? token.$deprecated : ''
        deprecatedTokens.set(token.name, reason || true)
      }
    }

    // If no deprecated tokens, nothing to check
    if (deprecatedTokens.size === 0) {
      return
    }

    for (const token of Object.values(tokens)) {
      // Skip ignored tokens
      if (ignore.length > 0 && matchesGlob(token.name, ignore)) {
        continue
      }

      // Skip deprecated tokens themselves
      if (deprecatedTokens.has(token.name)) {
        continue
      }

      // Extract references from original value
      const refs = extractReferences(token.originalValue)

      for (const ref of refs) {
        const deprecation = deprecatedTokens.get(ref)
        if (deprecation) {
          const reason = deprecation === true ? '' : `(${deprecation})`
          report({
            token,
            messageId: 'REFERENCES_DEPRECATED',
            data: { name: token.name, ref, reason },
          })
        }
      }
    }
  },
})
