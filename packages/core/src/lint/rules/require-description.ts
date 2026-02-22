/**
 * @license MIT
 * Copyright (c) 2025-present Dispersa
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

/**
 * @fileoverview Rule: require-description
 *
 * Requires tokens to have descriptions.
 */

import { createRule } from '@lint/create-rule'
import { matchesGlob } from '@lint/utils'

export const RequireDescriptionMessages = {
  MISSING_DESCRIPTION: 'MISSING_DESCRIPTION',
  TOO_SHORT: 'TOO_SHORT',
} as const

export type RequireDescriptionOptions = {
  /** Minimum length for description. Default: 1 */
  minLength?: number
  /** Token name patterns to ignore (glob patterns) */
  ignore?: string[]
}

export const requireDescription = createRule<
  (typeof RequireDescriptionMessages)[keyof typeof RequireDescriptionMessages],
  RequireDescriptionOptions
>({
  meta: {
    name: 'require-description',
    description: 'Require tokens to have descriptions',
    messages: {
      MISSING_DESCRIPTION: "Token '{{name}}' is missing a description",
      TOO_SHORT: "Token '{{name}}' description is too short ({{length}} chars, min {{minLength}})",
    },
  },
  defaultOptions: { minLength: 1 },
  create({ tokens, options, report }) {
    const minLength = options.minLength ?? 1
    const ignore = options.ignore ?? []

    for (const token of Object.values(tokens)) {
      // Skip ignored tokens
      if (ignore.length > 0 && matchesGlob(token.name, ignore)) {
        continue
      }

      if (!token.$description) {
        report({
          token,
          messageId: 'MISSING_DESCRIPTION',
          data: { name: token.name },
        })
      } else if (token.$description.length < minLength) {
        report({
          token,
          messageId: 'TOO_SHORT',
          data: {
            name: token.name,
            length: token.$description.length,
            minLength,
          },
        })
      }
    }
  },
})
