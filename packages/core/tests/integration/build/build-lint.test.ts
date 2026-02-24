/**
 * @license MIT
 * Copyright (c) 2025-present Dispersa
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { rm } from 'node:fs/promises'

import { afterEach, describe, expect, it } from 'vitest'

import { build, BuildConfig, json, lint } from '../../../src/index'
import { recommendedConfig } from '../../../src/lint'
import { getFixturePath } from '../../utils/test-helpers'

describe('Lint Integration', () => {
  const resolverPath = getFixturePath('tokens.resolver.json')
  const testBuildPath = '/tmp/test-build-lint-' + Date.now()

  afterEach(async () => {
    await rm(testBuildPath, { recursive: true, force: true })
  })

  describe('lint() standalone method', () => {
    it('returns lint result with issues', async () => {
      const result = await lint({
        resolver: resolverPath,
        plugins: { dispersa: recommendedConfig.plugins?.dispersa },
        rules: {
          'dispersa/require-description': 'warn',
        },
      })

      expect(result).toBeDefined()
      expect(result.issues).toBeDefined()
      expect(result.warningCount).toBeGreaterThan(0)
    })

    it('throws LintError when failOnError is true and errors exist', async () => {
      await expect(
        lint({
          resolver: resolverPath,
          plugins: { dispersa: recommendedConfig.plugins?.dispersa },
          rules: {
            'dispersa/require-description': 'error',
          },
        }),
      ).rejects.toThrow()
    })

    it('returns result without throwing when failOnError is false', async () => {
      const result = await lint({
        resolver: resolverPath,
        plugins: { dispersa: recommendedConfig.plugins?.dispersa },
        rules: {
          'dispersa/require-description': 'error',
        },
        failOnError: false,
      })

      expect(result).toBeDefined()
      expect(result.errorCount).toBeGreaterThan(0)
    })

    it('applies modifier inputs to token resolution before linting', async () => {
      const result = await lint({
        resolver: resolverPath,
        modifierInputs: { theme: 'light', scale: 'mobile' },
        plugins: { dispersa: recommendedConfig.plugins?.dispersa },
        rules: {
          'dispersa/naming-convention': ['warn', { format: 'kebab-case' }],
        },
      })

      expect(result).toBeDefined()
    })
  })

  describe('build() with lint config', () => {
    it('succeeds when lint warnings exist (severity: warn)', async () => {
      const config: BuildConfig = {
        resolver: resolverPath,
        buildPath: testBuildPath,
        outputs: [
          json({
            name: 'json',
            preset: 'standalone',
            structure: 'flat',
            file: 'tokens.json',
          }),
        ],
        lint: {
          enabled: true,
          plugins: { dispersa: recommendedConfig.plugins?.dispersa },
          rules: {
            'dispersa/require-description': 'warn',
          },
        },
      }

      const result = await build(config)

      expect(result.success).toBe(true)
      expect(result.errors).toBeUndefined()
    })

    it('fails build when lint errors exist and failOnError is true (default)', async () => {
      const config: BuildConfig = {
        resolver: resolverPath,
        buildPath: testBuildPath,
        outputs: [
          json({
            name: 'json',
            preset: 'standalone',
            structure: 'flat',
            file: 'tokens.json',
          }),
        ],
        lint: {
          enabled: true,
          plugins: { dispersa: recommendedConfig.plugins?.dispersa },
          rules: {
            'dispersa/require-description': 'error',
          },
        },
      }

      const result = await build(config)

      expect(result.success).toBe(false)
      expect(result.errors).toBeDefined()
      expect(result.errors!.length).toBeGreaterThan(0)
    })

    it('succeeds when lint errors exist and failOnError is false', async () => {
      const config: BuildConfig = {
        resolver: resolverPath,
        buildPath: testBuildPath,
        outputs: [
          json({
            name: 'json',
            preset: 'standalone',
            structure: 'flat',
            file: 'tokens.json',
          }),
        ],
        lint: {
          enabled: true,
          failOnError: false,
          plugins: { dispersa: recommendedConfig.plugins?.dispersa },
          rules: {
            'dispersa/require-description': 'error',
          },
        },
      }

      const result = await build(config)

      expect(result.success).toBe(true)
      expect(result.errors).toBeUndefined()
    })

    it('succeeds when linting is disabled', async () => {
      const config: BuildConfig = {
        resolver: resolverPath,
        buildPath: testBuildPath,
        outputs: [
          json({
            name: 'json',
            preset: 'standalone',
            structure: 'flat',
            file: 'tokens.json',
          }),
        ],
        lint: {
          enabled: false,
        },
      }

      const result = await build(config)

      expect(result.success).toBe(true)
    })
  })
})
