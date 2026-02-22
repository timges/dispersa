/**
 * @license MIT
 * Copyright (c) 2025-present Dispersa
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

/**
 * Test helpers for lint testing
 */

import type {
  AnyLintRule,
  LintPlugin,
  LintRuleContext,
  LintReportDescriptor,
} from '../../../src/lint/types'
import type {
  InternalResolvedToken,
  InternalResolvedTokens,
  ResolvedToken,
} from '../../../src/tokens/types'

/**
 * Create a mock resolved token for testing
 */
export function createMockToken(
  name: string,
  options: {
    type?: string
    value?: unknown
    description?: string
    deprecated?: boolean | string
    originalValue?: unknown
    isAlias?: boolean
  } = {},
): InternalResolvedToken {
  const path = name.split('.')
  return {
    $type: options.type as ResolvedToken['$type'],
    $value: options.value as ResolvedToken['$value'],
    $description: options.description,
    $deprecated: options.deprecated,
    path,
    name,
    originalValue: (options.originalValue ?? options.value) as ResolvedToken['originalValue'],
    _isAlias: options.isAlias,
  }
}

/**
 * Create a collection of mock tokens
 */
export function createMockTokens(
  tokens: Record<string, Partial<Parameters<typeof createMockToken>[1] & { value?: unknown }>>,
): InternalResolvedTokens {
  const result: InternalResolvedTokens = {}
  for (const [name, options] of Object.entries(tokens)) {
    result[name] = createMockToken(name, options)
  }
  return result
}

/**
 * Create a simple test rule
 */
export function createTestRule(
  name: string,
  fn: (context: LintRuleContext<string, Record<string, never>>) => void,
): AnyLintRule {
  return {
    meta: {
      name,
      description: `Test rule: ${name}`,
      messages: {
        TEST_ERROR: "Test error for '{{name}}'",
        TEST_WARNING: "Test warning for '{{name}}'",
      },
    },
    create: fn,
  }
}

/**
 * Create a test plugin with custom rules
 */
export function createTestPlugin(rules: Record<string, AnyLintRule>): LintPlugin {
  return {
    meta: {
      name: 'test-plugin',
    },
    rules,
  }
}

/**
 * Collect all reports from a rule execution
 */
export async function collectReports(
  rule: AnyLintRule,
  tokens: InternalResolvedTokens,
  options: Record<string, unknown> = {},
): Promise<
  Array<{ tokenName: string; messageId: string; data?: Record<string, string | number> }>
> {
  const reports: Array<{
    tokenName: string
    messageId: string
    data?: Record<string, string | number>
  }> = []

  const context: LintRuleContext<string, Record<string, unknown>> = {
    id: `test/${rule.meta.name}`,
    options: { ...rule.defaultOptions, ...options },
    tokens,
    report: (descriptor: LintReportDescriptor<string>) => {
      reports.push({
        tokenName: descriptor.token.name,
        messageId: descriptor.messageId,
        data: descriptor.data,
      })
    },
  }

  await rule.create(context)

  return reports
}
