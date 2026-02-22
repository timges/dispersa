/**
 * @license MIT
 * Copyright (c) 2025-present Dispersa
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

/**
 * @fileoverview Lint runner that executes rules in parallel against tokens
 *
 * The lint runner is responsible for:
 * - Loading plugins and resolving rule configurations
 * - Executing rules in parallel for performance
 * - Collecting and aggregating lint issues
 * - Interpolating message templates with data
 */

import type { InternalResolvedTokens, TokenType } from '@tokens/types'

import { PluginLoader } from './plugin-loader'
import type {
  LintConfig,
  LintIssue,
  LintPlugin,
  LintResult,
  AnyLintRule,
  ResolvedLintConfig,
  ResolvedRuleConfig,
  RuleConfig,
  LintRuleContext,
  LintReportDescriptor,
} from './types'

export type LintRunnerOptions = LintConfig & {
  /** Callback for runner warnings (e.g. unknown rule). Defaults to console.warn. */
  onWarn?: (message: string) => void
}

/**
 * Executes lint rules against a set of tokens
 *
 * @example
 * ```typescript
 * const config: LintConfig = {
 *   plugins: {
 *     dispersa: dispersaPlugin,
 *   },
 *   rules: {
 *     'dispersa/require-description': 'warn',
 *     'dispersa/naming-convention': ['error', { format: 'kebab-case' }],
 *   },
 * }
 *
 * const runner = new LintRunner(config)
 * const result = await runner.run(tokens)
 *
 * console.log(`Found ${result.errorCount} errors, ${result.warningCount} warnings`)
 * ```
 */
export class LintRunner {
  private config: LintRunnerOptions
  private pluginLoader: PluginLoader
  private resolvedConfig: ResolvedLintConfig | null = null
  private warn: (message: string) => void

  constructor(config: LintRunnerOptions) {
    this.config = config
    this.pluginLoader = new PluginLoader()
    this.warn = config.onWarn ?? console.warn
  }

  /**
   * Run all configured rules against the provided tokens
   *
   * Rules are executed in parallel for performance. Issues are collected
   * and returned with counts by severity.
   *
   * @param tokens - Resolved tokens to lint
   * @returns Lint result with issues and counts
   */
  async run(tokens: InternalResolvedTokens): Promise<LintResult> {
    this.resolvedConfig ??= await this.resolveConfig()

    const { rules, plugins } = this.resolvedConfig
    const issues: LintIssue[] = []

    if (Object.keys(rules).length === 0) {
      return { issues: [], errorCount: 0, warningCount: 0 }
    }

    const rulePromises = Object.entries(rules).map(async ([ruleId, ruleConfig]) => {
      const { severity, options } = ruleConfig

      const rule = this.resolveRule(ruleId, plugins)
      if (!rule) {
        this.warn(`[lint] Unknown rule '${ruleId}' - no plugin provides this rule`)
        return []
      }

      const reports: LintReportDescriptor<string>[] = []
      const applicableTokens = this.filterTokensByAppliesTo(tokens, rule.meta.appliesTo)
      const mergedOptions = rule.defaultOptions ? { ...rule.defaultOptions, ...options } : options

      const context: LintRuleContext<string, Record<string, unknown>> = {
        id: ruleId,
        options: mergedOptions,
        tokens: applicableTokens,
        report: (descriptor) => {
          reports.push(descriptor)
        },
      }

      try {
        await rule.create(context)
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        return [
          {
            ruleId: 'lint/rule-error',
            severity: 'error' as const,
            message: `Rule '${ruleId}' failed: ${message}`,
            tokenName: '(rule execution)',
            tokenPath: [],
          },
        ]
      }

      return reports.map((report) => {
        const messageTemplate = rule.meta.messages[report.messageId]
        const message = messageTemplate
          ? this.interpolateMessage(messageTemplate, report.data)
          : report.messageId

        return {
          ruleId,
          severity,
          message,
          tokenName: report.token.name,
          tokenPath: report.token.path,
        }
      })
    })

    const allIssues = await Promise.all(rulePromises)
    issues.push(...allIssues.flat())

    const errorCount = issues.filter((i) => i.severity === 'error').length
    const warningCount = issues.filter((i) => i.severity === 'warn').length

    return { issues, errorCount, warningCount }
  }

  /**
   * Resolve configuration: load plugins, parse rule configs
   */
  private async resolveConfig(): Promise<ResolvedLintConfig> {
    const { plugins: pluginSources = {}, rules: ruleConfigs = {} } = this.config

    const plugins = await this.pluginLoader.loadAll(pluginSources)

    const rules: Record<string, ResolvedRuleConfig> = {}

    for (const [ruleId, config] of Object.entries(ruleConfigs)) {
      const resolved = this.resolveRuleConfig(config)
      if (resolved) {
        rules[ruleId] = resolved
      }
    }

    return {
      enabled: true,
      failOnError: this.config.failOnError ?? true,
      plugins,
      rules,
    }
  }

  private filterTokensByAppliesTo(
    tokens: InternalResolvedTokens,
    appliesTo: TokenType[] | 'all' | undefined,
  ): InternalResolvedTokens {
    if (!appliesTo || appliesTo === 'all') {
      return tokens
    }

    const filtered: InternalResolvedTokens = {}
    for (const [name, token] of Object.entries(tokens)) {
      if (token.$type && appliesTo.includes(token.$type)) {
        filtered[name] = token
      }
    }
    return filtered
  }

  /**
   * Parse rule configuration into resolved format
   */
  private resolveRuleConfig(config: RuleConfig): ResolvedRuleConfig | null {
    // Shorthand: severity only
    if (typeof config === 'string') {
      if (config === 'off') {
        return null
      }
      return { severity: config, options: {} }
    }

    // Longhand: [severity, options]
    const [severity, options = {}] = config
    if (severity === 'off') {
      return null
    }

    return { severity, options }
  }

  /**
   * Resolve a rule from plugins by rule ID
   *
   * Rule IDs are formatted as 'namespace/rule-name'
   */
  private resolveRule(ruleId: string, plugins: Record<string, LintPlugin>): AnyLintRule | null {
    const separatorIndex = ruleId.indexOf('/')
    if (separatorIndex === -1) {
      return null
    }

    const namespace = ruleId.slice(0, separatorIndex)
    const ruleName = ruleId.slice(separatorIndex + 1)

    const plugin = plugins[namespace]
    if (!plugin) {
      return null
    }

    return plugin.rules[ruleName] ?? null
  }

  /**
   * Interpolate message template with data
   *
   * Replaces {{key}} placeholders with values from data
   */
  private interpolateMessage(template: string, data?: Record<string, string | number>): string {
    if (!data) {
      return template
    }

    return template.replace(/\{\{(\w+)\}\}/g, (_, key) => {
      const value = data[key]
      return value !== undefined ? String(value) : `{{${key}}}`
    })
  }

  /**
   * Clear the plugin cache
   */
  clearCache(): void {
    this.pluginLoader.clearCache()
    this.resolvedConfig = null
  }
}
