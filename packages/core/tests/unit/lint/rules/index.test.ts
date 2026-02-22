/**
 * @license MIT
 * Copyright (c) 2025-present Dispersa
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { describe, expect, it } from 'vitest'

import {
  dispersaPlugin,
  recommendedConfig,
  strictConfig,
  minimalConfig,
  requireDescription,
  namingConvention,
  noDeprecatedUsage,
  noDuplicateValues,
  noGoingBack,
  pathSchema,
} from '../../../../src/lint/rules'

describe('lint/rules', () => {
  describe('dispersaPlugin', () => {
    it('should have correct meta', () => {
      expect(dispersaPlugin.meta.name).toBe('dispersa')
    })

    it('should have all 6 built-in rules', () => {
      expect(dispersaPlugin.rules).toBeDefined()
      expect(dispersaPlugin.rules['require-description']).toBe(requireDescription)
      expect(dispersaPlugin.rules['naming-convention']).toBe(namingConvention)
      expect(dispersaPlugin.rules['no-deprecated-usage']).toBe(noDeprecatedUsage)
      expect(dispersaPlugin.rules['no-duplicate-values']).toBe(noDuplicateValues)
      expect(dispersaPlugin.rules['no-going-back']).toBe(noGoingBack)
      expect(dispersaPlugin.rules['path-schema']).toBe(pathSchema)
    })

    it('should have configs attached', () => {
      expect(dispersaPlugin.configs).toBeDefined()
      expect(dispersaPlugin.configs?.recommended).toBe(recommendedConfig)
      expect(dispersaPlugin.configs?.strict).toBe(strictConfig)
      expect(dispersaPlugin.configs?.minimal).toBe(minimalConfig)
    })
  })

  describe('recommendedConfig', () => {
    it('should have dispersa plugin', () => {
      expect(recommendedConfig.plugins?.dispersa).toBe(dispersaPlugin)
    })

    it('should have 3 rules enabled', () => {
      expect(recommendedConfig.rules).toBeDefined()
      expect(Object.keys(recommendedConfig.rules ?? {})).toHaveLength(3)
    })

    it('should set require-description to warn', () => {
      expect(recommendedConfig.rules?.['dispersa/require-description']).toBe('warn')
    })

    it('should set naming-convention with kebab-case options', () => {
      expect(recommendedConfig.rules?.['dispersa/naming-convention']).toEqual([
        'warn',
        { format: 'kebab-case' },
      ])
    })

    it('should set no-deprecated-usage to warn', () => {
      expect(recommendedConfig.rules?.['dispersa/no-deprecated-usage']).toBe('warn')
    })
  })

  describe('strictConfig', () => {
    it('should have dispersa plugin', () => {
      expect(strictConfig.plugins?.dispersa).toBe(dispersaPlugin)
    })

    it('should have 5 rules enabled', () => {
      expect(strictConfig.rules).toBeDefined()
      expect(Object.keys(strictConfig.rules ?? {})).toHaveLength(5)
    })

    it('should set all rules to error', () => {
      expect(strictConfig.rules?.['dispersa/require-description']).toBe('error')
      expect(strictConfig.rules?.['dispersa/naming-convention']).toEqual([
        'error',
        { format: 'kebab-case' },
      ])
      expect(strictConfig.rules?.['dispersa/no-deprecated-usage']).toBe('error')
      expect(strictConfig.rules?.['dispersa/no-duplicate-values']).toBe('error')
      expect(strictConfig.rules?.['dispersa/no-going-back']).toBe('error')
    })
  })

  describe('minimalConfig', () => {
    it('should have dispersa plugin', () => {
      expect(minimalConfig.plugins?.dispersa).toBe(dispersaPlugin)
    })

    it('should have only 1 rule enabled', () => {
      expect(minimalConfig.rules).toBeDefined()
      expect(Object.keys(minimalConfig.rules ?? {})).toHaveLength(1)
    })

    it('should set no-deprecated-usage to warn', () => {
      expect(minimalConfig.rules?.['dispersa/no-deprecated-usage']).toBe('warn')
    })
  })

  describe('rule exports', () => {
    it('should export requireDescription rule', () => {
      expect(requireDescription).toBeDefined()
      expect(requireDescription.meta.name).toBe('require-description')
      expect(typeof requireDescription.create).toBe('function')
    })

    it('should export namingConvention rule', () => {
      expect(namingConvention).toBeDefined()
      expect(namingConvention.meta.name).toBe('naming-convention')
      expect(typeof namingConvention.create).toBe('function')
    })

    it('should export noDeprecatedUsage rule', () => {
      expect(noDeprecatedUsage).toBeDefined()
      expect(noDeprecatedUsage.meta.name).toBe('no-deprecated-usage')
      expect(typeof noDeprecatedUsage.create).toBe('function')
    })

    it('should export noDuplicateValues rule', () => {
      expect(noDuplicateValues).toBeDefined()
      expect(noDuplicateValues.meta.name).toBe('no-duplicate-values')
      expect(typeof noDuplicateValues.create).toBe('function')
    })

    it('should export noGoingBack rule', () => {
      expect(noGoingBack).toBeDefined()
      expect(noGoingBack.meta.name).toBe('no-going-back')
      expect(typeof noGoingBack.create).toBe('function')
    })

    it('should export pathSchema rule', () => {
      expect(pathSchema).toBeDefined()
      expect(pathSchema.meta.name).toBe('path-schema')
      expect(typeof pathSchema.create).toBe('function')
    })
  })
})
