/**
 * @license MIT
 * Copyright (c) 2025-present Dispersa
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { describe, expect, it } from 'vitest'

import { namingConvention } from '../../../../src/lint/rules/naming-convention'
import { collectReports, createMockTokens } from '../lint-test-helpers'

describe('naming-convention rule', () => {
  describe('kebab-case (default)', () => {
    it('should accept valid kebab-case names', async () => {
      const tokens = createMockTokens({
        'color-brand-primary': { type: 'color' },
        'spacing-base-sm': { type: 'dimension' },
      })

      const reports = await collectReports(namingConvention, tokens)

      expect(reports).toHaveLength(0)
    })

    it('should accept kebab-case with numeric suffixes', async () => {
      const tokens = createMockTokens({
        'color-red-500': { type: 'color' },
        'color-blue-600': { type: 'color' },
        'color-gray-100': { type: 'color' },
        'border-radius-4': { type: 'dimension' },
      })

      const reports = await collectReports(namingConvention, tokens)

      expect(reports).toHaveLength(0)
    })

    it('should reject invalid kebab-case names', async () => {
      const tokens = createMockTokens({
        colorBrandPrimary: { type: 'color' },
        COLOR_PRIMARY: { type: 'color' },
      })

      const reports = await collectReports(namingConvention, tokens)

      expect(reports).toHaveLength(2)
    })

    it('should reject camelCase in kebab-case mode', async () => {
      const tokens = createMockTokens({
        fontSize: { type: 'dimension' },
        textMuted: { type: 'color' },
      })

      const reports = await collectReports(namingConvention, tokens)

      expect(reports).toHaveLength(2)
    })

    it('should reject snake_case in kebab-case mode', async () => {
      const tokens = createMockTokens({
        color_primary: { type: 'color' },
        font_size: { type: 'dimension' },
      })

      const reports = await collectReports(namingConvention, tokens)

      expect(reports).toHaveLength(2)
    })
  })

  describe('numeric segments', () => {
    it('should accept pure numeric path segments by default', async () => {
      const tokens = createMockTokens({
        'spacing.0': { type: 'dimension' },
        'spacing.1': { type: 'dimension' },
        'spacing.12': { type: 'dimension' },
        'opacity.50': { type: 'number' },
      })

      const reports = await collectReports(namingConvention, tokens)

      expect(reports).toHaveLength(0)
    })

    it('should reject pure numeric segments when allowNumericSegments is false', async () => {
      const tokens = createMockTokens({
        'spacing.0': { type: 'dimension' },
      })

      const reports = await collectReports(namingConvention, tokens, {
        allowNumericSegments: false,
      })

      expect(reports).toHaveLength(1)
      expect(reports[0]?.messageId).toBe('INVALID_SEGMENT')
      expect(reports[0]?.data?.segment).toBe('0')
    })
  })

  describe('camelCase', () => {
    it('should accept valid camelCase names', async () => {
      const tokens = createMockTokens({
        colorBrandPrimary: { type: 'color' },
        spacingBaseSm: { type: 'dimension' },
      })

      const reports = await collectReports(namingConvention, tokens, {
        format: 'camelCase',
      })

      expect(reports).toHaveLength(0)
    })

    it('should reject invalid camelCase names', async () => {
      const tokens = createMockTokens({
        'color-brand-primary': { type: 'color' },
        ColorPrimary: { type: 'color' },
      })

      const reports = await collectReports(namingConvention, tokens, {
        format: 'camelCase',
      })

      expect(reports).toHaveLength(2)
    })
  })

  describe('PascalCase', () => {
    it('should accept valid PascalCase names', async () => {
      const tokens = createMockTokens({
        ColorBrandPrimary: { type: 'color' },
        SpacingBaseSm: { type: 'dimension' },
      })

      const reports = await collectReports(namingConvention, tokens, {
        format: 'PascalCase',
      })

      expect(reports).toHaveLength(0)
    })
  })

  describe('snake_case', () => {
    it('should accept valid snake_case names', async () => {
      const tokens = createMockTokens({
        color_brand_primary: { type: 'color' },
        spacing_base_sm: { type: 'dimension' },
      })

      const reports = await collectReports(namingConvention, tokens, {
        format: 'snake_case',
      })

      expect(reports).toHaveLength(0)
    })

    it('should accept snake_case with numeric suffixes', async () => {
      const tokens = createMockTokens({
        color_red_500: { type: 'color' },
        color_blue_600: { type: 'color' },
      })

      const reports = await collectReports(namingConvention, tokens, {
        format: 'snake_case',
      })

      expect(reports).toHaveLength(0)
    })
  })

  describe('screaming-snake', () => {
    it('should accept valid SCREAMING_SNAKE names', async () => {
      const tokens = createMockTokens({
        COLOR_BRAND_PRIMARY: { type: 'color' },
        SPACING_BASE_SM: { type: 'dimension' },
      })

      const reports = await collectReports(namingConvention, tokens, {
        format: 'screaming-snake',
      })

      expect(reports).toHaveLength(0)
    })

    it('should accept screaming-snake with numeric suffixes', async () => {
      const tokens = createMockTokens({
        COLOR_RED_500: { type: 'color' },
        COLOR_BLUE_600: { type: 'color' },
      })

      const reports = await collectReports(namingConvention, tokens, {
        format: 'screaming-snake',
      })

      expect(reports).toHaveLength(0)
    })
  })

  describe('custom pattern', () => {
    it('should accept tokens matching custom pattern', async () => {
      const tokens = createMockTokens({
        color_brand_primary: { type: 'color' },
        spacing_base_sm: { type: 'dimension' },
      })

      const reports = await collectReports(namingConvention, tokens, {
        pattern: '^[a-z]+(_[a-z]+)*$',
      })

      expect(reports).toHaveLength(0)
    })

    it('should reject tokens not matching custom pattern', async () => {
      const tokens = createMockTokens({
        'color-brand-primary': { type: 'color' },
      })

      const reports = await collectReports(namingConvention, tokens, {
        pattern: '^[a-z]+(_[a-z]+)*$',
      })

      expect(reports).toHaveLength(1)
    })
  })

  describe('ignore option', () => {
    it('should ignore tokens matching patterns', async () => {
      const tokens = createMockTokens({
        ColorPrimary: { type: 'color' },
        'spacing.INVALID': { type: 'dimension' },
      })

      const reports = await collectReports(namingConvention, tokens, {
        ignore: ['Color*'],
      })

      expect(reports).toHaveLength(1)
      expect(reports[0]?.tokenName).toBe('spacing.INVALID')
    })
  })

  describe('segment validation', () => {
    it('should validate each path segment', async () => {
      const tokens = createMockTokens({
        'color.Brand-Primary': { type: 'color' },
      })

      const reports = await collectReports(namingConvention, tokens)

      expect(reports).toHaveLength(1)
      expect(reports[0]?.messageId).toBe('INVALID_SEGMENT')
      expect(reports[0]?.data?.segment).toBe('Brand-Primary')
    })
  })
})
