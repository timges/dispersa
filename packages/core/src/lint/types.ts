/**
 * @license MIT
 * Copyright (c) 2025-present Dispersa
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

/**
 * @fileoverview Core type definitions for the Dispersa linting system
 *
 * Inspired by ESLint and Terrazzo, this system provides a plugin-based
 * architecture for validating design tokens against semantic rules.
 */

import type { TokenType, InternalResolvedTokens, ResolvedToken } from '@tokens/types'

// ============================================================================
// SEVERITY
// ============================================================================

/**
 * Lint rule severity levels
 *
 * - `'off'` - Rule is disabled
 * - `'warn'` - Rule issues warnings but doesn't fail the build
 * - `'error'` - Rule issues errors and fails the build (if failOnError is true)
 */
export type Severity = 'off' | 'warn' | 'error'

// ============================================================================
// RULE TYPES
// ============================================================================

/**
 * Metadata describing a lint rule
 *
 * @template MessageIds - Union type of message IDs this rule can produce
 */
export type LintRuleMeta<MessageIds extends string = string> = {
  /** Short name of the rule (e.g., 'require-description') */
  name: string

  /** Human-readable description of what the rule checks */
  description: string

  /** Optional URL to documentation for this rule */
  url?: string

  /** Map of message IDs to message templates (supports {{placeholder}} interpolation) */
  messages: Record<MessageIds, string>

  /** Token types this rule applies to. Default: 'all' */
  appliesTo?: TokenType[] | 'all'
}

/**
 * Context object passed to rule's create() function
 *
 * Provides access to tokens, configuration, and the report function.
 *
 * @template MessageIds - Union type of message IDs this rule can produce
 * @template Options - Rule-specific options type
 */
export type LintRuleContext<
  MessageIds extends string = string,
  Options extends Record<string, unknown> = Record<string, never>,
> = {
  /** Fully qualified rule ID (e.g., 'dispersa/require-description') */
  id: string

  /** Merged options (defaultOptions + user config) */
  options: Options

  /** All resolved tokens to validate */
  tokens: InternalResolvedTokens

  /**
   * Report a lint issue
   *
   * @param descriptor - Issue descriptor with token, message ID, and optional data
   */
  report(descriptor: LintReportDescriptor<MessageIds>): void
}

/**
 * Descriptor for reporting a lint issue
 *
 * @template MessageIds - Union type of message IDs this rule can produce
 */
export type LintReportDescriptor<MessageIds extends string = string> = {
  /** The token that has the issue */
  token: ResolvedToken

  /** ID of the message to use from rule's meta.messages */
  messageId: MessageIds

  /** Data to interpolate into the message (replaces {{key}} placeholders) */
  data?: Record<string, string | number>
}

/**
 * A lint rule definition
 *
 * Rules are created using the `createRule()` factory function for type safety.
 *
 * @template MessageIds - Union type of message IDs this rule can produce
 * @template Options - Rule-specific options type
 *
 * @example
 * ```typescript
 * const myRule: LintRule<'MISSING_VALUE', { required: boolean }> = {
 *   meta: {
 *     name: 'require-value',
 *     description: 'Require tokens to have values',
 *     messages: {
 *       MISSING_VALUE: "Token '{{name}}' is missing a value",
 *     },
 *   },
 *   defaultOptions: { required: true },
 *   create({ tokens, report, options }) {
 *     for (const token of Object.values(tokens)) {
 *       if (options.required && !token.$value) {
 *         report({ token, messageId: 'MISSING_VALUE', data: { name: token.name } })
 *       }
 *     }
 *   },
 * }
 * ```
 */
export type LintRule<
  MessageIds extends string = string,
  Options extends Record<string, unknown> = Record<string, never>,
> = {
  /** Rule metadata */
  meta: LintRuleMeta<MessageIds>

  /** Default options merged with user config */
  defaultOptions?: Options

  /**
   * Factory function that creates the rule's validation logic
   *
   * Called once per lint run with the context object.
   *
   * @param context - Rule context with tokens, options, and report function
   */
  create(context: LintRuleContext<MessageIds, Options>): void | Promise<void>
}

// ============================================================================
// PLUGIN TYPES
// ============================================================================

/**
 * Base rule type without generic parameters for use in plugin definitions
 */
export type AnyLintRule = LintRule<string, Record<string, unknown>>

/**
 * A lint plugin that provides rules and configurations
 *
 * @example
 * ```typescript
 * const myPlugin: LintPlugin = {
 *   meta: {
 *     name: 'my-lint-plugin',
 *     version: '1.0.0',
 *   },
 *   rules: {
 *     'my-rule': myRule,
 *   },
 *   configs: {
 *     recommended: {
 *       plugins: { my: myPlugin },
 *       rules: {
 *         'my/my-rule': 'warn',
 *       },
 *     },
 *   },
 * }
 * ```
 */
export type LintPlugin = {
  /** Plugin metadata */
  meta: {
    /** Package name (e.g., '@dispersa/lint-plugin-a11y') */
    name: string

    /** Semantic version (optional, for debugging/metadata) */
    version?: string
  }

  /** Rules provided by this plugin */
  rules: Record<string, AnyLintRule>

  /** Predefined configurations */
  configs?: Record<string, LintConfig>
}

// ============================================================================
// CONFIGURATION TYPES
// ============================================================================

/**
 * Rule configuration - either severity only or severity with options
 *
 * @example
 * ```typescript
 * // Severity only
 * 'error'
 *
 * // Severity with options
 * ['error', { format: 'kebab-case' }]
 * ```
 */
export type RuleConfig = Severity | [Severity, Record<string, unknown>]

/**
 * Resolved rule configuration with parsed severity and options
 */
export type ResolvedRuleConfig = {
  severity: Exclude<Severity, 'off'>
  options: Record<string, unknown>
}

// ============================================================================
// RULES REGISTRY (Declaration Merging)
// ============================================================================

/**
 * Registry for lint rule options types.
 *
 * Built-in dispersa rules are registered via declaration merging in `./rules/index.ts`.
 * Plugin authors can augment this interface to add their own rule types:
 *
 * @example
 * ```typescript
 * // In your plugin file
 * declare module 'dispersa/lint' {
 *   interface RulesRegistry {
 *     'my-plugin/my-rule': MyRuleOptions
 *   }
 * }
 * ```
 */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface RulesRegistry {}

/**
 * Type-safe configuration for a single rule from the registry.
 *
 * @template K - The rule ID key from RulesRegistry
 */
export type RuleConfigFor<K extends keyof RulesRegistry> = Severity | [Severity, RulesRegistry[K]]

/**
 * Typed rules configuration with intellisense for all registered rules.
 *
 * Provides autocomplete for rule IDs and their option types.
 * Also allows arbitrary string keys for unregistered rules.
 */
export type TypedRulesConfig = {
  [K in keyof RulesRegistry]?: RuleConfigFor<K>
} & Record<string, RuleConfig>

// ============================================================================
// CONFIGURATION TYPES
// ============================================================================

/**
 * Lint configuration
 *
 * @template Rules - Rules configuration type (defaults to TypedRulesConfig for intellisense)
 *
 * @example
 * ```typescript
 * const config: LintConfig = {
 *   plugins: {
 *     dispersa: dispersaPlugin,
 *     a11y: '@dispersa/lint-plugin-a11y', // Load by string
 *   },
 *   rules: {
 *     'dispersa/require-description': 'warn',
 *     'dispersa/naming-convention': ['error', { format: 'kebab-case' }],
 *     'a11y/min-contrast': ['error', { level: 'AA' }],
 *   },
 * }
 * ```
 */
export type LintConfig<Rules extends Record<string, RuleConfig> = TypedRulesConfig> = {
  /** Plugins to load (by object or module path string) */
  plugins?: Record<string, LintPlugin | string>

  /** Rule configurations */
  rules?: Rules

  /** Fail build on lint errors (default: true) */
  failOnError?: boolean
}

/**
 * Configuration for lint within BuildConfig
 *
 * Extends {@link LintConfig} with an `enabled` toggle for opt-in build integration.
 *
 * @template Rules - Rules configuration type (defaults to TypedRulesConfig for intellisense)
 */
export type LintBuildConfig<Rules extends Record<string, RuleConfig> = TypedRulesConfig> =
  LintConfig<Rules> & {
    /** Enable linting (default: false, opt-in) */
    enabled?: boolean
  }

/**
 * Resolved lint configuration with all plugins loaded
 */
export type ResolvedLintConfig = {
  /** Whether linting is enabled */
  enabled: boolean

  /** Fail build on errors */
  failOnError: boolean

  /** Loaded plugins indexed by namespace */
  plugins: Record<string, LintPlugin>

  /** Resolved rule configurations */
  rules: Record<string, ResolvedRuleConfig>
}

// ============================================================================
// RESULT TYPES
// ============================================================================

/**
 * A single lint issue
 */
export type LintIssue = {
  /** Fully qualified rule ID (e.g., 'dispersa/require-description') */
  ruleId: string

  /** Issue severity */
  severity: Exclude<Severity, 'off'>

  /** Human-readable message */
  message: string

  /** Token name (e.g., 'color.brand.primary') */
  tokenName: string

  /** Token path segments (e.g., ['color', 'brand', 'primary']) */
  tokenPath: string[]
}

/**
 * Result of a lint run
 */
export type LintResult = {
  /** All issues found */
  issues: LintIssue[]

  /** Count of error-severity issues */
  errorCount: number

  /** Count of warning-severity issues */
  warningCount: number
}

// ============================================================================
// FORMATTER TYPES
// ============================================================================

/**
 * Output format for lint results
 */
export type LintOutputFormat = 'json' | 'stylish' | 'compact'

/**
 * Formatter function that converts lint result to output string
 */
export type LintFormatter = (result: LintResult) => string
