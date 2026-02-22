/**
 * @license MIT
 * Copyright (c) 2025-present Dispersa
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { describe, expect, it } from 'vitest'

import { noDuplicateValues } from '../../../../src/lint/rules/no-duplicate-values'
import { collectReports, createMockTokens } from '../lint-test-helpers'

describe('no-duplicate-values rule', () => {
  const red = { colorSpace: 'srgb', components: [1, 0, 0] }
  const green = { colorSpace: 'srgb', components: [0, 1, 0] }

  describe('duplicate detection', () => {
    it('should report tokens with duplicate values', async () => {
      const tokens = createMockTokens({
        'color.primary': { type: 'color', value: red },
        'color.accent': { type: 'color', value: red },
      })

      const reports = await collectReports(noDuplicateValues, tokens)

      expect(reports).toHaveLength(1)
      expect(reports[0]?.tokenName).toBe('color.accent')
    })

    it('should not report tokens with unique values', async () => {
      const tokens = createMockTokens({
        'color.primary': { type: 'color', value: red },
        'color.secondary': { type: 'color', value: green },
      })

      const reports = await collectReports(noDuplicateValues, tokens)

      expect(reports).toHaveLength(0)
    })

    it('should skip alias tokens', async () => {
      const tokens = createMockTokens({
        'color.base': { type: 'color', value: red },
        'color.alias': {
          type: 'color',
          value: red,
          originalValue: '{color.base}',
          isAlias: true,
        },
      })

      const reports = await collectReports(noDuplicateValues, tokens)

      expect(reports).toHaveLength(0)
    })
  })

  describe('multiple duplicates', () => {
    it('should report all duplicates', async () => {
      const tokens = createMockTokens({
        'color.a': { type: 'color', value: red },
        'color.b': { type: 'color', value: red },
        'color.c': { type: 'color', value: red },
      })

      const reports = await collectReports(noDuplicateValues, tokens)

      expect(reports).toHaveLength(2)
    })
  })

  describe('types option', () => {
    it('should filter by token type', async () => {
      const tokens = createMockTokens({
        'color.primary': { type: 'color', value: red },
        'color.secondary': { type: 'color', value: red },
        'spacing.sm': { type: 'dimension', value: { value: 8, unit: 'px' } },
        'spacing.md': { type: 'dimension', value: { value: 8, unit: 'px' } },
      })

      const reports = await collectReports(noDuplicateValues, tokens, {
        types: ['color'],
      })

      expect(reports).toHaveLength(1)
      expect(reports[0]?.tokenName).toBe('color.secondary')
    })
  })

  describe('ignore option', () => {
    it('should ignore tokens matching patterns', async () => {
      const tokens = createMockTokens({
        'color.primary': { type: 'color', value: red },
        'color.accent': { type: 'color', value: red },
      })

      const reports = await collectReports(noDuplicateValues, tokens, {
        ignore: ['color.accent'],
      })

      expect(reports).toHaveLength(0)
    })
  })

  describe('complex values', () => {
    it('should detect duplicate object values', async () => {
      const shadowValue = {
        color: { colorSpace: 'srgb', components: [0, 0, 0] },
        offsetX: { value: 0, unit: 'px' },
        offsetY: { value: 4, unit: 'px' },
        blur: { value: 8, unit: 'px' },
        spread: { value: 0, unit: 'px' },
      }
      const tokens = createMockTokens({
        'shadow.card': {
          type: 'shadow',
          value: shadowValue,
        },
        'shadow.panel': {
          type: 'shadow',
          value: shadowValue,
        },
      })

      const reports = await collectReports(noDuplicateValues, tokens)

      expect(reports).toHaveLength(1)
    })
  })
})
