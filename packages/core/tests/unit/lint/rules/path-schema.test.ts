/**
 * @license MIT
 * Copyright (c) 2025-present Dispersa
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { describe, expect, it } from 'vitest'

import { pathSchema } from '../../../../src/lint/rules/path-schema'
import { collectReports, createMockTokens } from '../lint-test-helpers'

describe('path-schema rule', () => {
  describe('path patterns', () => {
    it('should accept tokens matching patterns', async () => {
      const tokens = createMockTokens({
        'color.base.brand': { type: 'color' },
        'spacing.base.md': { type: 'dimension' },
      })

      const reports = await collectReports(pathSchema, tokens, {
        segments: {
          domain: { values: ['color', 'spacing'] },
          layer: { values: ['base', 'semantic'] },
        },
        paths: ['{domain}.{layer}.{name}'],
      })

      expect(reports).toHaveLength(0)
    })

    it('should report tokens not matching any pattern', async () => {
      const tokens = createMockTokens({
        'invalid.token': { type: 'color' },
      })

      const reports = await collectReports(pathSchema, tokens, {
        segments: {
          domain: { values: ['color', 'spacing'] },
        },
        paths: ['{domain}.*.*'],
      })

      expect(reports).toHaveLength(1)
      expect(reports[0]?.messageId).toBe('INVALID_PATH')
    })
  })

  describe('segment validation', () => {
    it('should validate segments against definitions', async () => {
      const tokens = createMockTokens({
        'color.base.primary': { type: 'color' },
        'typography.base.body': { type: 'typography' },
      })

      const reports = await collectReports(pathSchema, tokens, {
        segments: {
          domain: { values: ['color', 'spacing'] },
        },
        paths: ['{domain}.*.*'],
      })

      expect(reports).toHaveLength(1)
      expect(reports[0]?.tokenName).toBe('typography.base.body')
    })

    it('should accept regex-based segments', async () => {
      const tokens = createMockTokens({
        'color.base.brand-a': { type: 'color' },
        'color.base.brand-b': { type: 'color' },
      })

      const reports = await collectReports(pathSchema, tokens, {
        segments: {
          domain: { values: ['color'] },
          layer: { values: ['base', 'semantic'] },
          brand: { values: /^[a-z-]+$/ },
        },
        paths: ['{domain}.{layer}.{brand}'],
      })

      expect(reports).toHaveLength(0)
    })
  })

  describe('transitions', () => {
    it('should enforce valid transitions', async () => {
      const tokens = createMockTokens({
        'color.semantic.primary': { type: 'color' },
      })

      const reports = await collectReports(pathSchema, tokens, {
        transitions: [
          { from: 'color', to: ['base', 'semantic'] },
          { from: 'semantic', to: /^[a-z]+$/ },
        ],
      })

      expect(reports).toHaveLength(0)
    })

    it('should pass when multiple allow rules match via OR semantics', async () => {
      const tokens = createMockTokens({
        'color.base.primary': { type: 'color' },
        'color.semantic.primary': { type: 'color' },
      })

      const reports = await collectReports(pathSchema, tokens, {
        transitions: [
          { from: 'color', to: ['base'] },
          { from: 'color', to: ['semantic'] },
        ],
      })

      expect(reports).toHaveLength(0)
    })

    it('should report forbidden transitions', async () => {
      const tokens = createMockTokens({
        'color.semantic.component': { type: 'color' },
      })

      const reports = await collectReports(pathSchema, tokens, {
        transitions: [{ from: 'semantic', to: 'component', allow: false }],
      })

      expect(reports).toHaveLength(1)
      expect(reports[0]?.messageId).toBe('FORBIDDEN_TRANSITION')
    })
  })

  describe('strict mode', () => {
    it('should allow all paths when strict is false', async () => {
      const tokens = createMockTokens({
        'any.random.path': { type: 'color' },
      })

      const reports = await collectReports(pathSchema, tokens, {
        paths: ['{domain}.{layer}.{name}'],
        strict: false,
      })

      expect(reports).toHaveLength(0)
    })

    it('should enforce patterns when strict is true (default)', async () => {
      const tokens = createMockTokens({
        'any.random.path': { type: 'color' },
      })

      const reports = await collectReports(pathSchema, tokens, {
        segments: {
          domain: { values: ['color', 'spacing'] },
        },
        paths: ['{domain}.{layer}.{name}'],
        strict: true,
      })

      expect(reports).toHaveLength(1)
    })
  })

  describe('ignore option', () => {
    it('should ignore tokens matching patterns', async () => {
      const tokens = createMockTokens({
        'invalid.token': { type: 'color' },
        'color.base.brand': { type: 'color' },
      })

      const reports = await collectReports(pathSchema, tokens, {
        paths: ['{domain}.{layer}.{name}'],
        ignore: ['invalid.*'],
      })

      expect(reports).toHaveLength(0)
    })
  })

  describe('no config', () => {
    it('should return no issues when no patterns or transitions defined', async () => {
      const tokens = createMockTokens({
        'any.token': { type: 'color' },
      })

      const reports = await collectReports(pathSchema, tokens, {})

      expect(reports).toHaveLength(0)
    })
  })
})
