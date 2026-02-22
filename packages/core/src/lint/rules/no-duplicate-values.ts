/**
 * @license MIT
 * Copyright (c) 2025-present Dispersa
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

/**
 * @fileoverview Rule: no-duplicate-values
 *
 * Detects tokens with duplicate values (excluding aliases).
 */

import { createRule } from '@lint/create-rule'
import { matchesGlob } from '@lint/utils'

export const NoDuplicateValuesMessages = {
  DUPLICATE_VALUE: 'DUPLICATE_VALUE',
} as const

export type NoDuplicateValuesOptions = {
  /** Token name patterns to ignore (glob patterns) */
  ignore?: string[]
  /** Only check specific token types */
  types?: string[]
}

function valueKey(value: unknown): string {
  if (value === null) {
    return 'null'
  }
  if (value === undefined) {
    return 'undefined'
  }
  if (typeof value === 'object') {
    return JSON.stringify(sortKeys(value))
  }
  return String(value)
}

function sortKeys(obj: unknown): unknown {
  if (Array.isArray(obj)) {
    return obj.map(sortKeys)
  }
  if (typeof obj === 'object' && obj !== null) {
    const sorted: Record<string, unknown> = {}
    for (const key of Object.keys(obj).sort()) {
      sorted[key] = sortKeys((obj as Record<string, unknown>)[key])
    }
    return sorted
  }
  return obj
}

export const noDuplicateValues = createRule<
  (typeof NoDuplicateValuesMessages)[keyof typeof NoDuplicateValuesMessages],
  NoDuplicateValuesOptions
>({
  meta: {
    name: 'no-duplicate-values',
    description: 'Detect tokens with duplicate values (excluding aliases)',
    messages: {
      DUPLICATE_VALUE:
        "Token '{{name}}' has the same value as '{{duplicate}}'. Consider using an alias instead.",
    },
  },
  defaultOptions: {},
  create({ tokens, options, report }) {
    const ignore = options.ignore ?? []
    const types = options.types

    const valueMap = new Map<string, (typeof tokens)[string][]>()

    for (const token of Object.values(tokens)) {
      if (ignore.length > 0 && matchesGlob(token.name, ignore)) {
        continue
      }

      if (token._isAlias) {
        continue
      }

      if (types && types.length > 0 && !types.includes(token.$type ?? '')) {
        continue
      }

      const key = valueKey(token.$value)
      const existing = valueMap.get(key)
      if (existing) {
        existing.push(token)
      } else {
        valueMap.set(key, [token])
      }
    }

    for (const tokenList of valueMap.values()) {
      if (tokenList.length > 1) {
        const first = tokenList[0]
        if (!first) {
          continue
        }

        for (let i = 1; i < tokenList.length; i++) {
          const current = tokenList[i]
          if (current) {
            report({
              token: current,
              messageId: 'DUPLICATE_VALUE',
              data: { name: current.name, duplicate: first.name },
            })
          }
        }
      }
    }
  },
})
