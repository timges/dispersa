/**
 * @license MIT
 * Copyright (c) 2025-present Dispersa
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { describe, expect, it } from 'vitest'

import { createRule } from '../../../src/lint/create-rule'

describe('createRule', () => {
  it('should create a rule with correct shape', () => {
    const rule = createRule<'TEST_ERROR'>({
      meta: {
        name: 'test-rule',
        description: 'A test rule',
        messages: {
          TEST_ERROR: "Token '{{name}}' has an error",
        },
      },
      create: () => {},
    })

    expect(rule.meta.name).toBe('test-rule')
    expect(rule.meta.description).toBe('A test rule')
    expect(rule.meta.messages.TEST_ERROR).toBe("Token '{{name}}' has an error")
    expect(typeof rule.create).toBe('function')
  })

  it('should preserve default options', () => {
    const rule = createRule<'TEST', { threshold: number }>({
      meta: {
        name: 'threshold-rule',
        description: 'A rule with threshold',
        messages: { TEST: 'Test' },
      },
      defaultOptions: { threshold: 10 },
      create: () => {},
    })

    expect(rule.defaultOptions).toEqual({ threshold: 10 })
    expect(rule.defaultOptions?.threshold).toBe(10)
  })

  it('should work without default options', () => {
    const rule = createRule<'TEST'>({
      meta: {
        name: 'simple-rule',
        description: 'A simple rule',
        messages: { TEST: 'Test' },
      },
      create: () => {},
    })

    expect(rule.defaultOptions).toBeUndefined()
  })

  it('should preserve appliesTo setting', () => {
    const rule = createRule<'TEST'>({
      meta: {
        name: 'color-only-rule',
        description: 'Only for colors',
        messages: { TEST: 'Test' },
        appliesTo: ['color'],
      },
      create: () => {},
    })

    expect(rule.meta.appliesTo).toEqual(['color'])
  })

  it('should preserve URL in meta', () => {
    const rule = createRule<'TEST'>({
      meta: {
        name: 'documented-rule',
        description: 'A documented rule',
        url: 'https://example.com/rules/documented-rule',
        messages: { TEST: 'Test' },
      },
      create: () => {},
    })

    expect(rule.meta.url).toBe('https://example.com/rules/documented-rule')
  })
})
