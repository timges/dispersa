/**
 * @license MIT
 * Copyright (c) 2025-present Dispersa
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { describe, expect, it } from 'vitest'

import { requireDescription } from '../../../../src/lint/rules/require-description'
import { collectReports, createMockTokens } from '../lint-test-helpers'

describe('require-description rule', () => {
  describe('missing descriptions', () => {
    it('should report tokens without description', async () => {
      const tokens = createMockTokens({
        'color.primary': { type: 'color' },
        'color.secondary': { type: 'color' },
      })

      const reports = await collectReports(requireDescription, tokens)

      expect(reports).toHaveLength(2)
      expect(reports.map((r) => r.tokenName)).toContain('color.primary')
      expect(reports.map((r) => r.tokenName)).toContain('color.secondary')
      expect(reports.every((r) => r.messageId === 'MISSING_DESCRIPTION')).toBe(true)
    })

    it('should not report tokens with description', async () => {
      const tokens = createMockTokens({
        'color.primary': { type: 'color', description: 'Primary brand color' },
        'color.secondary': { type: 'color' },
      })

      const reports = await collectReports(requireDescription, tokens)

      expect(reports).toHaveLength(1)
      expect(reports[0]?.tokenName).toBe('color.secondary')
    })
  })

  describe('minLength option', () => {
    it('should use default minLength of 1', async () => {
      const tokens = createMockTokens({
        'color.empty': { type: 'color', description: '' },
        'color.valid': { type: 'color', description: 'A color' },
      })

      const reports = await collectReports(requireDescription, tokens)

      expect(reports).toHaveLength(1)
      expect(reports[0]?.tokenName).toBe('color.empty')
    })

    it('should respect custom minLength', async () => {
      const tokens = createMockTokens({
        'color.short': { type: 'color', description: 'Hi' },
        'color.valid': { type: 'color', description: 'Primary brand color' },
        'color.none': { type: 'color' },
      })

      const reports = await collectReports(requireDescription, tokens, { minLength: 10 })

      expect(reports).toHaveLength(2)
      expect(reports.map((r) => r.tokenName)).toContain('color.short')
      expect(reports.map((r) => r.tokenName)).toContain('color.none')
      expect(
        reports.every((r) => r.messageId === 'TOO_SHORT' || r.messageId === 'MISSING_DESCRIPTION'),
      ).toBe(true)
    })
  })

  describe('ignore option', () => {
    it('should ignore tokens matching patterns', async () => {
      const tokens = createMockTokens({
        'color.primary': { type: 'color' },
        'color.secondary': { type: 'color' },
        'spacing.base': { type: 'dimension' },
      })

      const reports = await collectReports(requireDescription, tokens, {
        ignore: ['color.*'],
      })

      expect(reports).toHaveLength(1)
      expect(reports[0]?.tokenName).toBe('spacing.base')
    })

    it('should support multiple ignore patterns', async () => {
      const tokens = createMockTokens({
        'color.primary': { type: 'color' },
        'spacing.base': { type: 'dimension' },
        'typography.body': { type: 'typography' },
      })

      const reports = await collectReports(requireDescription, tokens, {
        ignore: ['color.*', 'spacing.*'],
      })

      expect(reports).toHaveLength(1)
      expect(reports[0]?.tokenName).toBe('typography.body')
    })
  })

  describe('message interpolation', () => {
    it('should include token name in message', async () => {
      const tokens = createMockTokens({
        'color.primary': { type: 'color' },
      })

      const reports = await collectReports(requireDescription, tokens)

      expect(reports[0]?.data?.name).toBe('color.primary')
    })

    it('should include length info for TOO_SHORT', async () => {
      const tokens = createMockTokens({
        'color.short': { type: 'color', description: 'Hi' },
      })

      const reports = await collectReports(requireDescription, tokens, { minLength: 10 })

      expect(reports[0]?.messageId).toBe('TOO_SHORT')
      expect(reports[0]?.data?.length).toBe(2)
      expect(reports[0]?.data?.minLength).toBe(10)
    })
  })
})
