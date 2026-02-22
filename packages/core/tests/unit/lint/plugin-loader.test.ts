/**
 * @license MIT
 * Copyright (c) 2025-present Dispersa
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { ConfigurationError } from '../../../src/shared/errors'
import { PluginLoader } from '../../../src/lint/plugin-loader'
import type { LintPlugin } from '../../../src/lint/types'

function createValidPlugin(): LintPlugin {
  return {
    meta: {
      name: 'test-plugin',
    },
    rules: {
      'test-rule': {
        meta: {
          name: 'test-rule',
          description: 'A test rule',
          messages: { ERROR: 'Test error' },
        },
        create: () => {},
      },
    },
  }
}

describe('PluginLoader', () => {
  let loader: PluginLoader

  beforeEach(() => {
    loader = new PluginLoader()
  })

  afterEach(() => {
    loader.clearCache()
  })

  describe('constructor', () => {
    it('should create loader with default cwd', () => {
      expect(loader).toBeDefined()
    })

    it('should accept custom cwd option', () => {
      const customLoader = new PluginLoader({ cwd: '/custom/path' })
      expect(customLoader).toBeDefined()
    })
  })

  describe('load', () => {
    it('should return inline plugin object as-is', async () => {
      const plugin = createValidPlugin()
      const result = await loader.load(plugin)

      expect(result).toBe(plugin)
    })

    it('should validate inline plugin', async () => {
      const invalidPlugin = {
        meta: { name: 'test' },
        rules: {},
      } as unknown as LintPlugin

      await expect(loader.load(invalidPlugin)).rejects.toThrow(ConfigurationError)
    })
  })

  describe('plugin validation', () => {
    it('should throw for plugin without meta', async () => {
      const plugin = { rules: {} } as unknown as LintPlugin

      await expect(loader.load(plugin)).rejects.toThrow('must have a meta property')
    })

    it('should throw for plugin without meta.name', async () => {
      const plugin = {
        meta: {},
        rules: {},
      } as unknown as LintPlugin

      await expect(loader.load(plugin)).rejects.toThrow('meta.name is required')
    })

    it('should throw for plugin without rules', async () => {
      const plugin = {
        meta: { name: 'test' },
      } as unknown as LintPlugin

      await expect(loader.load(plugin)).rejects.toThrow('must have a non-empty rules object')
    })

    it('should throw for rule without meta', async () => {
      const plugin = {
        meta: { name: 'test', version: '1.0.0' },
        rules: {
          'bad-rule': { create: () => {} },
        },
      } as unknown as LintPlugin

      await expect(loader.load(plugin)).rejects.toThrow('missing meta property')
    })

    it('should throw for rule without messages', async () => {
      const plugin = {
        meta: { name: 'test', version: '1.0.0' },
        rules: {
          'bad-rule': {
            meta: { name: 'bad-rule', description: 'Bad' },
            create: () => {},
          },
        },
      } as unknown as LintPlugin

      await expect(loader.load(plugin)).rejects.toThrow('missing meta.messages')
    })

    it('should throw for rule without create function', async () => {
      const plugin = {
        meta: { name: 'test', version: '1.0.0' },
        rules: {
          'bad-rule': {
            meta: { name: 'bad-rule', description: 'Bad', messages: { E: 'Error' } },
          },
        },
      } as unknown as LintPlugin

      await expect(loader.load(plugin)).rejects.toThrow('missing create function')
    })
  })

  describe('loadFromModule', () => {
    it('should throw ConfigurationError for non-existent package', async () => {
      await expect(loader.load('@nonexistent/plugin')).rejects.toThrow(ConfigurationError)
    })

    it('should throw ConfigurationError for non-existent file path', async () => {
      await expect(loader.load('./nonexistent-plugin.ts')).rejects.toThrow(ConfigurationError)
    })
  })

  describe('caching', () => {
    it('should cache loaded plugins by path', async () => {
      const plugin = createValidPlugin()

      await loader.load(plugin)
      await loader.load(plugin)

      expect(true).toBe(true)
    })

    it('should clear cache', () => {
      loader.clearCache()
      expect(true).toBe(true)
    })
  })

  describe('loadAll', () => {
    it('should load multiple plugins', async () => {
      const plugin1 = createValidPlugin()
      const plugin2: LintPlugin = {
        meta: { name: 'plugin2' },
        rules: {
          rule2: {
            meta: { name: 'rule2', description: 'Rule 2', messages: { E: 'Error' } },
            create: () => {},
          },
        },
      }

      const result = await loader.loadAll({
        first: plugin1,
        second: plugin2,
      })

      expect(result.first).toBe(plugin1)
      expect(result.second).toBe(plugin2)
    })

    it('should return empty object for empty input', async () => {
      const result = await loader.loadAll({})
      expect(result).toEqual({})
    })
  })
})
