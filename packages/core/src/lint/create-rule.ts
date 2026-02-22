/**
 * @license MIT
 * Copyright (c) 2025-present Dispersa
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

/**
 * @fileoverview Factory function for creating type-safe lint rules
 *
 * Use `createRule()` to define rules with full TypeScript inference
 * for message IDs and options.
 */

import type { LintRule } from './types'

/**
 * Factory function for creating type-safe lint rules
 *
 * This function provides no runtime behavior - it simply returns the rule
 * as-is. Its purpose is to provide type inference and autocomplete for
 * message IDs and options.
 *
 * @template MessageIds - Union type of message IDs this rule can produce
 * @template Options - Rule-specific options type
 *
 * @param rule - The rule definition
 * @returns The same rule definition with full type inference
 *
 * @example
 * ```typescript
 * import { createRule } from 'dispersa/lint'
 *
 * export const requireDescription = createRule<
 *   'MISSING_DESCRIPTION' | 'TOO_SHORT',
 *   { minLength?: number }
 * >({
 *   meta: {
 *     name: 'require-description',
 *     description: 'Require tokens to have descriptions',
 *     messages: {
 *       MISSING_DESCRIPTION: "Token '{{name}}' is missing a description",
 *       TOO_SHORT: "Token '{{name}}' description is too short ({{length}} chars, min {{minLength}})",
 *     },
 *   },
 *   defaultOptions: { minLength: 10 },
 *   create({ tokens, report, options }) {
 *     for (const token of Object.values(tokens)) {
 *       if (!token.$description) {
 *         report({ token, messageId: 'MISSING_DESCRIPTION', data: { name: token.name } })
 *       } else if (token.$description.length < options.minLength) {
 *         report({
 *           token,
 *           messageId: 'TOO_SHORT',
 *           data: { name: token.name, length: token.$description.length, minLength: options.minLength },
 *         })
 *       }
 *     }
 *   },
 * })
 * ```
 */
export function createRule<
  MessageIds extends string,
  Options extends Record<string, unknown> = Record<string, never>,
>(rule: LintRule<MessageIds, Options>): LintRule<MessageIds, Options> {
  return rule
}

/**
 * Helper type for extracting options type from a rule
 *
 * @example
 * ```typescript
 * const myRule = createRule<'MSG', { format: string }>({ ... })
 * type MyOptions = RuleOptions<typeof myRule> // { format: string }
 * ```
 */
export type RuleOptions<T extends LintRule> = T extends LintRule<string, infer O> ? O : never

/**
 * Helper type for extracting message IDs from a rule
 *
 * @example
 * ```typescript
 * const myRule = createRule<'MSG1' | 'MSG2', { format: string }>({ ... })
 * type MyMessages = RuleMessages<typeof myRule> // 'MSG1' | 'MSG2'
 * ```
 */
export type RuleMessages<T extends LintRule> =
  T extends LintRule<infer M, Record<string, unknown>> ? M : never
