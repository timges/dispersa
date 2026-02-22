/**
 * @license MIT
 * Copyright (c) 2025-present Dispersa
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { describe, expect, it } from 'vitest'

import {
  formatLintJson,
  formatLintStylish,
  formatLintCompact,
} from '../../../src/cli/formatters/lint-formatter'
import type { LintIssue, LintResult } from '../../../src/lint/types'

function createIssue(overrides: Partial<LintIssue> = {}): LintIssue {
  return {
    ruleId: 'dispersa/test-rule',
    severity: 'error',
    message: 'Test error message',
    tokenName: 'color.primary',
    tokenPath: ['color', 'primary'],
    ...overrides,
  }
}

function createResult(overrides: Partial<LintResult> = {}): LintResult {
  return {
    issues: [],
    errorCount: 0,
    warningCount: 0,
    ...overrides,
  }
}

describe('lint-formatter', () => {
  describe('formatLintJson', () => {
    it('should format empty result as JSON', () => {
      const result = createResult()
      const output = formatLintJson(result)

      expect(output).toContain('"issues": []')
      expect(output).toContain('"errorCount": 0')
      expect(output).toContain('"warningCount": 0')
    })

    it('should format result with issues as JSON', () => {
      const result = createResult({
        issues: [createIssue()],
        errorCount: 1,
      })
      const output = formatLintJson(result)

      expect(output).toContain('"ruleId": "dispersa/test-rule"')
      expect(output).toContain('"severity": "error"')
      expect(output).toContain('"message": "Test error message"')
      expect(output).toContain('"tokenName": "color.primary"')
    })

    it('should produce valid JSON', () => {
      const result = createResult({
        issues: [createIssue(), createIssue({ severity: 'warn', tokenName: 'spacing.md' })],
        errorCount: 1,
        warningCount: 1,
      })
      const output = formatLintJson(result)

      expect(() => JSON.parse(output)).not.toThrow()
    })
  })

  describe('formatLintStylish', () => {
    it('should format empty result with success message', () => {
      const result = createResult()
      const output = formatLintStylish(result)

      expect(output).toBe('✓ No lint issues found')
    })

    it('should format single error', () => {
      const result = createResult({
        issues: [createIssue()],
        errorCount: 1,
      })
      const output = formatLintStylish(result)

      expect(output).toContain('color.primary')
      expect(output).toContain('✖ error:')
      expect(output).toContain('Test error message')
      expect(output).toContain('[dispersa/test-rule]')
      expect(output).toContain('1 error')
    })

    it('should format single warning', () => {
      const result = createResult({
        issues: [createIssue({ severity: 'warn' })],
        warningCount: 1,
      })
      const output = formatLintStylish(result)

      expect(output).toContain('⚠ warning:')
      expect(output).toContain('1 warning')
    })

    it('should group issues by token', () => {
      const result = createResult({
        issues: [
          createIssue({ message: 'Error 1' }),
          createIssue({ message: 'Error 2' }),
          createIssue({ tokenName: 'spacing.md', message: 'Error 3' }),
        ],
        errorCount: 3,
      })
      const output = formatLintStylish(result)

      const primaryIndex = output.indexOf('color.primary')
      const spacingIndex = output.indexOf('spacing.md')

      expect(primaryIndex).toBeGreaterThan(-1)
      expect(spacingIndex).toBeGreaterThan(-1)
      expect(output).toContain('Error 1')
      expect(output).toContain('Error 2')
      expect(output).toContain('Error 3')
    })

    it('should show both errors and warnings in summary', () => {
      const result = createResult({
        issues: [createIssue({ severity: 'error' }), createIssue({ severity: 'warn' })],
        errorCount: 1,
        warningCount: 1,
      })
      const output = formatLintStylish(result)

      expect(output).toContain('1 error')
      expect(output).toContain('1 warning')
    })

    it('should pluralize correctly', () => {
      const result = createResult({
        issues: [
          createIssue({ severity: 'error' }),
          createIssue({ severity: 'error', tokenName: 'other.token' }),
          createIssue({ severity: 'warn' }),
          createIssue({ severity: 'warn', tokenName: 'another.token' }),
        ],
        errorCount: 2,
        warningCount: 2,
      })
      const output = formatLintStylish(result)

      expect(output).toContain('2 errors')
      expect(output).toContain('2 warnings')
    })

    it('should show token path', () => {
      const result = createResult({
        issues: [
          createIssue({
            tokenName: 'color.brand.primary',
            tokenPath: ['color', 'brand', 'primary'],
          }),
        ],
        errorCount: 1,
      })
      const output = formatLintStylish(result)

      expect(output).toContain('color.brand.primary')
    })
  })

  describe('formatLintCompact', () => {
    it('should return empty string for empty result', () => {
      const result = createResult()
      const output = formatLintCompact(result)

      expect(output).toBe('')
    })

    it('should format single error', () => {
      const result = createResult({
        issues: [createIssue()],
        errorCount: 1,
      })
      const output = formatLintCompact(result)

      expect(output).toContain('ERROR:')
      expect(output).toContain('dispersa/test-rule')
      expect(output).toContain('Test error message')
      expect(output).toContain('token: color.primary')
    })

    it('should format warning with WARN prefix', () => {
      const result = createResult({
        issues: [createIssue({ severity: 'warn' })],
        warningCount: 1,
      })
      const output = formatLintCompact(result)

      expect(output).toContain('WARN:')
    })

    it('should include summary line', () => {
      const result = createResult({
        issues: [createIssue()],
        errorCount: 1,
      })
      const output = formatLintCompact(result)

      expect(output).toContain('SUMMARY: 1 errors, 0 warnings')
    })

    it('should format multiple issues on separate lines', () => {
      const result = createResult({
        issues: [createIssue(), createIssue({ tokenName: 'spacing.md' })],
        errorCount: 2,
      })
      const output = formatLintCompact(result)

      const lines = output.split('\n')
      expect(lines).toHaveLength(3) // 2 issues + 1 summary
    })

    it('should be parseable (one issue per line)', () => {
      const result = createResult({
        issues: [createIssue(), createIssue({ severity: 'warn', tokenName: 'spacing.md' })],
        errorCount: 1,
        warningCount: 1,
      })
      const output = formatLintCompact(result)

      for (const line of output.split('\n')) {
        if (line.startsWith('SUMMARY:')) continue
        expect(line).toMatch(/^(ERROR|WARN): /)
      }
    })
  })
})
