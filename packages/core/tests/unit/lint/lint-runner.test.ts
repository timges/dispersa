/**
 * @license MIT
 * Copyright (c) 2025-present Dispersa
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { beforeEach, describe, expect, it } from 'vitest'

import { LintRunner } from '../../../src/lint/lint-runner'
import type { AnyLintRule } from '../../../src/lint/types'
import type { InternalResolvedToken } from '../../../src/tokens/types'
import { createMockTokens, createTestPlugin, createTestRule } from './lint-test-helpers'

describe('LintRunner', () => {
  let runner: LintRunner

  describe('constructor', () => {
    it('should create runner with empty config', () => {
      runner = new LintRunner({})
      expect(runner).toBeDefined()
    })

    it('should create runner with plugins and rules', () => {
      const plugin = createTestPlugin({
        'test-rule': {
          meta: {
            name: 'test-rule',
            description: 'Test rule',
            messages: { TEST: 'Test' },
          },
          create: () => {},
        },
      })

      runner = new LintRunner({
        plugins: { test: plugin },
        rules: { 'test/test-rule': 'warn' },
      })

      expect(runner).toBeDefined()
    })
  })

  describe('run', () => {
    beforeEach(() => {
      runner = new LintRunner({})
    })

    it('should return empty result when no rules configured', async () => {
      const tokens = createMockTokens({
        'color.primary': { type: 'color' },
      })

      const result = await runner.run(tokens)

      expect(result.issues).toEqual([])
      expect(result.errorCount).toBe(0)
      expect(result.warningCount).toBe(0)
    })

    it('should skip rules with severity "off"', async () => {
      const plugin = createTestPlugin({
        'always-fail': {
          meta: {
            name: 'always-fail',
            description: 'Always reports an error',
            messages: { FAIL: 'Always fails' },
          },
          create: (context) => {
            for (const token of Object.values(context.tokens) as InternalResolvedToken[]) {
              context.report({ token, messageId: 'FAIL' })
            }
          },
        },
      })

      runner = new LintRunner({
        plugins: { test: plugin },
        rules: { 'test/always-fail': 'off' },
      })

      const tokens = createMockTokens({
        'color.primary': { type: 'color' },
      })

      const result = await runner.run(tokens)

      expect(result.issues).toHaveLength(0)
    })

    it('should run single rule and collect issues', async () => {
      const plugin = createTestPlugin({
        'check-type': {
          meta: {
            name: 'check-type',
            description: 'Check token type',
            messages: { NO_TYPE: "Token '{{name}}' has no type" },
          },
          create: (context) => {
            for (const token of Object.values(context.tokens) as InternalResolvedToken[]) {
              if (!token.$type) {
                context.report({ token, messageId: 'NO_TYPE', data: { name: token.name } })
              }
            }
          },
        },
      })

      runner = new LintRunner({
        plugins: { test: plugin },
        rules: { 'test/check-type': 'error' },
      })

      const tokens = createMockTokens({
        'color.primary': { type: 'color' },
        'spacing.base': {}, // no type
      })

      const result = await runner.run(tokens)

      expect(result.issues).toHaveLength(1)
      expect(result.issues[0]?.tokenName).toBe('spacing.base')
      expect(result.issues[0]?.severity).toBe('error')
      expect(result.errorCount).toBe(1)
      expect(result.warningCount).toBe(0)
    })

    it('should run multiple rules in parallel', async () => {
      const plugin = createTestPlugin({
        'rule-a': {
          meta: {
            name: 'rule-a',
            description: 'Rule A',
            messages: { ISSUE: "Token '{{name}}' has issue A" },
          },
          create: (context) => {
            for (const token of Object.values(context.tokens) as InternalResolvedToken[]) {
              context.report({ token, messageId: 'ISSUE', data: { name: token.name } })
            }
          },
        },
        'rule-b': {
          meta: {
            name: 'rule-b',
            description: 'Rule B',
            messages: { ISSUE: "Token '{{name}}' has issue B" },
          },
          create: (context) => {
            for (const token of Object.values(context.tokens) as InternalResolvedToken[]) {
              context.report({ token, messageId: 'ISSUE', data: { name: token.name } })
            }
          },
        },
      })

      runner = new LintRunner({
        plugins: { test: plugin },
        rules: {
          'test/rule-a': 'error',
          'test/rule-b': 'warn',
        },
      })

      const tokens = createMockTokens({
        'color.primary': { type: 'color' },
      })

      const result = await runner.run(tokens)

      expect(result.issues).toHaveLength(2)
      expect(result.errorCount).toBe(1) // rule-a
      expect(result.warningCount).toBe(1) // rule-b
    })

    it('should merge default options with user options', async () => {
      const plugin = createTestPlugin({
        'min-length': {
          meta: {
            name: 'min-length',
            description: 'Check minimum value length',
            messages: { TOO_SHORT: "Token '{{name}}' value is too short (min {{min}})" },
          },
          defaultOptions: { min: 5 },
          create: (context) => {
            const options = context.options as { min: number }
            for (const token of Object.values(context.tokens) as InternalResolvedToken[]) {
              const value = String(token.$value)
              if (value.length < options.min) {
                context.report({
                  token,
                  messageId: 'TOO_SHORT',
                  data: { name: token.name, min: options.min },
                })
              }
            }
          },
        } as AnyLintRule,
      })

      runner = new LintRunner({
        plugins: { test: plugin },
        rules: { 'test/min-length': ['error', { min: 50 }] },
      })

      const tokens = createMockTokens({
        'color.short': { type: 'color', value: { colorSpace: 'srgb', components: [0, 0, 0] } },
        'color.long': {
          type: 'color',
          value: { colorSpace: 'srgb-linear', components: [1, 1, 1] },
        },
      })

      const result = await runner.run(tokens)

      // Both should fail with min: 50 (stringified objects are short)
      expect(result.issues).toHaveLength(2)
    })

    it('should interpolate messages with data', async () => {
      const plugin = createTestPlugin({
        'custom-message': {
          meta: {
            name: 'custom-message',
            description: 'Custom message test',
            messages: {
              CUSTOM: "Token '{{name}}' of type '{{type}}' has colorSpace '{{colorSpace}}'",
            },
          },
          create: (context) => {
            for (const token of Object.values(context.tokens) as InternalResolvedToken[]) {
              const value = token.$value as { colorSpace: string }
              context.report({
                token,
                messageId: 'CUSTOM',
                data: {
                  name: token.name,
                  type: token.$type ?? 'unknown',
                  colorSpace: value?.colorSpace ?? 'unknown',
                },
              })
            }
          },
        },
      })

      runner = new LintRunner({
        plugins: { test: plugin },
        rules: { 'test/custom-message': 'error' },
      })

      const tokens = createMockTokens({
        'color.primary': { type: 'color', value: { colorSpace: 'srgb', components: [1, 0, 0] } },
      })

      const result = await runner.run(tokens)

      expect(result.issues[0]?.message).toBe(
        "Token 'color.primary' of type 'color' has colorSpace 'srgb'",
      )
    })

    it('should handle warnings', async () => {
      const plugin = createTestPlugin({
        'warn-rule': {
          meta: {
            name: 'warn-rule',
            description: 'Warning rule',
            messages: { WARN: 'This is a warning' },
          },
          create: (context) => {
            for (const token of Object.values(context.tokens) as InternalResolvedToken[]) {
              context.report({ token, messageId: 'WARN' })
            }
          },
        },
      })

      runner = new LintRunner({
        plugins: { test: plugin },
        rules: { 'test/warn-rule': 'warn' },
      })

      const tokens = createMockTokens({
        'color.primary': { type: 'color' },
      })

      const result = await runner.run(tokens)

      expect(result.issues).toHaveLength(1)
      expect(result.issues[0]?.severity).toBe('warn')
      expect(result.warningCount).toBe(1)
      expect(result.errorCount).toBe(0)
    })

    it('should ignore unknown rules', async () => {
      runner = new LintRunner({
        plugins: {},
        rules: { 'unknown/rule': 'error' },
      })

      const tokens = createMockTokens({
        'color.primary': { type: 'color' },
      })

      const result = await runner.run(tokens)

      expect(result.issues).toHaveLength(0)
    })

    it('should ignore unknown plugin namespace', async () => {
      runner = new LintRunner({
        plugins: {
          test: createTestPlugin({
            'dummy-rule': createTestRule('dummy-rule', () => {}),
          }),
        },
        rules: { 'other/rule': 'error' },
      })

      const tokens = createMockTokens({
        'color.primary': { type: 'color' },
      })

      const result = await runner.run(tokens)

      expect(result.issues).toHaveLength(0)
    })
  })

  describe('clearCache', () => {
    it('should clear plugin cache', () => {
      runner = new LintRunner({})
      runner.clearCache()
      // No error means success
      expect(true).toBe(true)
    })
  })
})
