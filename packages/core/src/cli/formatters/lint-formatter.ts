/**
 * @license MIT
 * Copyright (c) 2025-present Dispersa
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

/**
 * @fileoverview Lint output formatter interface and utilities
 */

import type { LintIssue, LintResult, LintFormatter } from '@lint/types'

/**
 * Format lint results as JSON
 */
export const formatLintJson: LintFormatter = (result: LintResult): string => {
  return JSON.stringify(result, null, 2)
}

/**
 * Format lint results in a human-readable stylish format
 */
export const formatLintStylish: LintFormatter = (result: LintResult): string => {
  const lines: string[] = []

  if (result.issues.length === 0) {
    return '✓ No lint issues found'
  }

  // Group issues by token
  const byToken = new Map<string, LintIssue[]>()
  for (const issue of result.issues) {
    const existing = byToken.get(issue.tokenName) ?? []
    existing.push(issue)
    byToken.set(issue.tokenName, existing)
  }

  // Output issues
  for (const [tokenName, issues] of byToken) {
    lines.push(``)
    lines.push(`  ${tokenName}`)
    for (const issue of issues) {
      const severity = issue.severity === 'error' ? '✖' : '⚠'
      const label = issue.severity === 'error' ? 'error' : 'warning'
      lines.push(`    ${severity} ${label}: ${issue.message} [${issue.ruleId}]`)
    }
  }

  // Summary
  lines.push(``)
  if (result.errorCount > 0 || result.warningCount > 0) {
    const parts: string[] = []
    if (result.errorCount > 0) {
      parts.push(`${result.errorCount} error${result.errorCount === 1 ? '' : 's'}`)
    }
    if (result.warningCount > 0) {
      parts.push(`${result.warningCount} warning${result.warningCount === 1 ? '' : 's'}`)
    }
    lines.push(`✖ ${parts.join(', ')}`)
  }

  return lines.join('\n')
}

/**
 * Format lint results for CI output (compact, parseable)
 */
export const formatLintCompact: LintFormatter = (result: LintResult): string => {
  const lines: string[] = []

  for (const issue of result.issues) {
    const severity = issue.severity.toUpperCase()
    lines.push(`${severity}: ${issue.ruleId} - ${issue.message} (token: ${issue.tokenName})`)
  }

  if (result.errorCount > 0 || result.warningCount > 0) {
    lines.push(`SUMMARY: ${result.errorCount} errors, ${result.warningCount} warnings`)
  }

  return lines.join('\n')
}
