/**
 * @license MIT
 * Copyright (c) 2025-present Dispersa
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { describe, expect, it } from 'vitest'

import { noGoingBack } from '../../../../src/lint/rules/no-going-back'
import { collectReports, createMockTokens } from '../lint-test-helpers'

describe('no-going-back rule', () => {
  const blue = { colorSpace: 'srgb', components: [0, 0, 1] }
  const red = { colorSpace: 'srgb', components: [1, 0, 0] }

  describe('default layers', () => {
    it('should report semantic tokens referencing component tokens', async () => {
      const tokens = createMockTokens({
        'color.base.blue': { type: 'color', value: blue },
        'color.component.button.bg': {
          type: 'color',
          value: blue,
          originalValue: '{color.base.blue}',
          isAlias: true,
        },
        'color.semantic.primary': {
          type: 'color',
          value: blue,
          originalValue: '{color.component.button.bg}',
          isAlias: true,
        },
      })

      const reports = await collectReports(noGoingBack, tokens)

      expect(reports).toHaveLength(1)
      expect(reports[0]?.tokenName).toBe('color.semantic.primary')
      expect(reports[0]?.messageId).toBe('LAYER_VIOLATION')
    })

    it('should not report base tokens referencing nothing', async () => {
      const tokens = createMockTokens({
        'color.base.primary': { type: 'color', value: red },
      })

      const reports = await collectReports(noGoingBack, tokens)

      expect(reports).toHaveLength(0)
    })

    it('should not report semantic tokens referencing base tokens', async () => {
      const tokens = createMockTokens({
        'color.base.blue': { type: 'color', value: blue },
        'color.semantic.primary': {
          type: 'color',
          value: blue,
          originalValue: '{color.base.blue}',
          isAlias: true,
        },
      })

      const reports = await collectReports(noGoingBack, tokens)

      expect(reports).toHaveLength(0)
    })
  })

  describe('custom layers', () => {
    it('should respect custom layer configuration', async () => {
      const tokens = createMockTokens({
        'tokens.primitive.blue': { type: 'color', value: blue },
        'tokens.global.primary': {
          type: 'color',
          value: blue,
          originalValue: '{tokens.primitive.blue}',
          isAlias: true,
        },
      })

      const reports = await collectReports(noGoingBack, tokens, {
        layers: { primitive: 0, global: 1 },
      })

      expect(reports).toHaveLength(0)
    })
  })

  describe('layerIndex option', () => {
    it('should use custom layer index', async () => {
      const tokens = createMockTokens({
        'brandA.color.base': { type: 'color', value: blue },
        'brandB.color.semantic': {
          type: 'color',
          value: blue,
          originalValue: '{brandA.color.base}',
          isAlias: true,
        },
      })

      const reports = await collectReports(noGoingBack, tokens, {
        layerIndex: 0,
      })

      expect(reports).toHaveLength(0)
    })
  })

  describe('ignore option', () => {
    it('should ignore tokens matching patterns', async () => {
      const tokens = createMockTokens({
        'color.base.blue': { type: 'color', value: blue },
        'color.component.button.bg': {
          type: 'color',
          value: blue,
          originalValue: '{color.base.blue}',
          isAlias: true,
        },
        'color.semantic.special': {
          type: 'color',
          value: blue,
          originalValue: '{color.component.button.bg}',
          isAlias: true,
        },
      })

      const reports = await collectReports(noGoingBack, tokens, {
        ignore: ['color.semantic.special'],
      })

      expect(reports).toHaveLength(0)
    })
  })

  describe('unknown layers', () => {
    it('should skip tokens with unknown layers', async () => {
      const tokens = createMockTokens({
        'color.unknown.primary': { type: 'color', value: red },
        'color.other.secondary': {
          type: 'color',
          value: red,
          originalValue: '{color.unknown.primary}',
          isAlias: true,
        },
      })

      const reports = await collectReports(noGoingBack, tokens)

      expect(reports).toHaveLength(0)
    })
  })
})
