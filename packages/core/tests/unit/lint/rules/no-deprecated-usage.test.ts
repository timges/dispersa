/**
 * @license MIT
 * Copyright (c) 2025-present Dispersa
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { describe, expect, it } from 'vitest'

import { noDeprecatedUsage } from '../../../../src/lint/rules/no-deprecated-usage'
import { collectReports, createMockTokens } from '../lint-test-helpers'

describe('no-deprecated-usage rule', () => {
  const red = { colorSpace: 'srgb', components: [1, 0, 0] }

  describe('deprecated token references', () => {
    it('should report references to deprecated tokens', async () => {
      const tokens = createMockTokens({
        'color.legacy': { type: 'color', value: red, deprecated: true },
        'color.new': {
          type: 'color',
          value: red,
          originalValue: '{color.legacy}',
          isAlias: true,
        },
      })

      const reports = await collectReports(noDeprecatedUsage, tokens)

      expect(reports).toHaveLength(1)
      expect(reports[0]?.tokenName).toBe('color.new')
      expect(reports[0]?.messageId).toBe('REFERENCES_DEPRECATED')
    })

    it('should not report references to non-deprecated tokens', async () => {
      const tokens = createMockTokens({
        'color.base': { type: 'color', value: red },
        'color.alias': {
          type: 'color',
          value: red,
          originalValue: '{color.base}',
          isAlias: true,
        },
      })

      const reports = await collectReports(noDeprecatedUsage, tokens)

      expect(reports).toHaveLength(0)
    })

    it('should not report deprecated tokens themselves', async () => {
      const tokens = createMockTokens({
        'color.legacy': { type: 'color', value: red, deprecated: true },
      })

      const reports = await collectReports(noDeprecatedUsage, tokens)

      expect(reports).toHaveLength(0)
    })
  })

  describe('deprecation reason', () => {
    it('should include deprecation reason in message', async () => {
      const tokens = createMockTokens({
        'color.old': { type: 'color', value: red, deprecated: 'Use color.new instead' },
        'color.alias': {
          type: 'color',
          value: red,
          originalValue: '{color.old}',
          isAlias: true,
        },
      })

      const reports = await collectReports(noDeprecatedUsage, tokens)

      expect(reports[0]?.data?.reason).toContain('Use color.new instead')
    })

    it('should handle boolean deprecated flag', async () => {
      const tokens = createMockTokens({
        'color.old': { type: 'color', value: red, deprecated: true },
        'color.alias': {
          type: 'color',
          value: red,
          originalValue: '{color.old}',
          isAlias: true,
        },
      })

      const reports = await collectReports(noDeprecatedUsage, tokens)

      expect(reports).toHaveLength(1)
    })
  })

  describe('composite values', () => {
    it('should detect references in composite values', async () => {
      const tokens = createMockTokens({
        'color.old': { type: 'color', value: red, deprecated: true },
        'shadow.card': {
          type: 'shadow',
          value: { color: red },
          originalValue: '{color.old} 0 4px 8px',
          isAlias: true,
        },
      })

      const reports = await collectReports(noDeprecatedUsage, tokens)

      expect(reports).toHaveLength(1)
    })
  })

  describe('ignore option', () => {
    it('should ignore tokens matching patterns', async () => {
      const tokens = createMockTokens({
        'color.old': { type: 'color', value: red, deprecated: true },
        'color.legacy': {
          type: 'color',
          value: red,
          originalValue: '{color.old}',
          isAlias: true,
        },
        'color.new': {
          type: 'color',
          value: red,
          originalValue: '{color.old}',
          isAlias: true,
        },
      })

      const reports = await collectReports(noDeprecatedUsage, tokens, {
        ignore: ['color.legacy'],
      })

      expect(reports).toHaveLength(1)
      expect(reports[0]?.tokenName).toBe('color.new')
    })
  })

  describe('edge cases', () => {
    it('should return no issues when no deprecated tokens exist', async () => {
      const tokens = createMockTokens({
        'color.base': { type: 'color', value: red },
        'color.alias': {
          type: 'color',
          value: red,
          originalValue: '{color.base}',
          isAlias: true,
        },
      })

      const reports = await collectReports(noDeprecatedUsage, tokens)

      expect(reports).toHaveLength(0)
    })
  })
})
