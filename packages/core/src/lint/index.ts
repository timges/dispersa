/**
 * @license MIT
 * Copyright (c) 2025-present Dispersa
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

/**
 * @fileoverview Public API for Dispersa linting system
 *
 * @example Basic usage
 * ```typescript
 * import { LintRunner, dispersaPlugin } from 'dispersa/lint'
 *
 * const runner = new LintRunner({
 *   plugins: { dispersa: dispersaPlugin },
 *   rules: {
 *     'dispersa/require-description': 'warn',
 *     'dispersa/naming-convention': ['error', { format: 'kebab-case' }],
 *   },
 * })
 *
 * const result = await runner.run(tokens)
 * console.log(`Found ${result.errorCount} errors, ${result.warningCount} warnings`)
 * ```
 *
 * @example Using predefined configs
 * ```typescript
 * import { LintRunner, recommendedConfig } from 'dispersa/lint'
 *
 * const runner = new LintRunner(recommendedConfig)
 * const result = await runner.run(tokens)
 * ```
 *
 * @example Creating custom rules
 * ```typescript
 * import { createRule, type LintRule } from 'dispersa/lint'
 *
 * const myCustomRule = createRule<'NO_PRIMARY', { allowed: boolean }>({
 *   meta: {
 *     name: 'no-primary',
 *     description: 'Disallow "primary" in token names',
 *     messages: {
 *       NO_PRIMARY: "Token '{{name}}' contains 'primary'",
 *     },
 *   },
 *   defaultOptions: { allowed: false },
 *   create({ tokens, options, report }) {
 *     if (options.allowed) return
 *
 *     for (const token of Object.values(tokens)) {
 *       if (token.name.includes('primary')) {
 *         report({ token, messageId: 'NO_PRIMARY', data: { name: token.name } })
 *       }
 *     }
 *   },
 * })
 * ```
 */

// Core types
export type {
  Severity,
  LintRuleMeta,
  LintRuleContext,
  LintReportDescriptor,
  LintRule,
  AnyLintRule,
  LintPlugin,
  RuleConfig,
  ResolvedRuleConfig,
  LintConfig,
  LintBuildConfig,
  ResolvedLintConfig,
  LintIssue,
  LintResult,
  LintOutputFormat,
  LintFormatter,
  // Type-safe rule configuration types
  RulesRegistry,
  RuleConfigFor,
  TypedRulesConfig,
} from './types'

// Core classes and functions
export { createRule, type RuleOptions, type RuleMessages } from './create-rule'
export { LintRunner, type LintRunnerOptions } from './lint-runner'
export { PluginLoader, type PluginLoaderOptions } from './plugin-loader'

// Built-in rules
export {
  dispersaPlugin,
  recommendedConfig,
  strictConfig,
  minimalConfig,
  requireDescription,
  namingConvention,
  noDeprecatedUsage,
  noDuplicateValues,
  noGoingBack,
  pathSchema,
  type PathSchemaConfig,
  type SegmentDefinition,
  type TransitionRule,
  // Option types for plugin authors
  type RequireDescriptionOptions,
  type NamingConventionOptions,
  type NoDeprecatedUsageOptions,
  type NoDuplicateValuesOptions,
  type NoGoingBackOptions,
} from './rules'

// Formatters
export {
  formatLintJson,
  formatLintStylish,
  formatLintCompact,
} from '@cli/formatters/lint-formatter'
