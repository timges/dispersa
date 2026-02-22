/**
 * @license MIT
 * Copyright (c) 2025-present Dispersa
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

/**
 * @fileoverview Built-in lint rules and dispersa plugin
 */

import type { LintPlugin, LintConfig } from '@lint/types'

import type { NamingConventionOptions } from './naming-convention'
import { namingConvention } from './naming-convention'
import type { NoDeprecatedUsageOptions } from './no-deprecated-usage'
import { noDeprecatedUsage } from './no-deprecated-usage'
import type { NoDuplicateValuesOptions } from './no-duplicate-values'
import { noDuplicateValues } from './no-duplicate-values'
import type { PathSchemaConfig } from './path-schema'
import { pathSchema } from './path-schema'
import type { RequireDescriptionOptions } from './require-description'
import { requireDescription } from './require-description'

// Re-export rules for direct use
export { requireDescription } from './require-description'
export { namingConvention } from './naming-convention'
export { noDeprecatedUsage } from './no-deprecated-usage'
export { noDuplicateValues } from './no-duplicate-values'
export {
  pathSchema,
  type PathSchemaConfig,
  type SegmentDefinition,
  type TransitionRule,
} from './path-schema'

// Export option types for plugin authors
export type { RequireDescriptionOptions } from './require-description'
export type { NamingConventionOptions } from './naming-convention'
export type { NoDeprecatedUsageOptions } from './no-deprecated-usage'
export type { NoDuplicateValuesOptions } from './no-duplicate-values'

/**
 * Builds the dispersa plugin with its predefined configs.
 *
 * Uses a factory to encapsulate the self-referential setup:
 * configs reference the plugin, and the plugin carries configs.
 * The returned objects are fully formed -- no external mutation.
 */
function buildDispersaPlugin() {
  const rules = {
    'require-description': requireDescription,
    'naming-convention': namingConvention,
    'no-deprecated-usage': noDeprecatedUsage,
    'no-duplicate-values': noDuplicateValues,
    'path-schema': pathSchema,
  }

  const plugin: LintPlugin = { meta: { name: 'dispersa' }, rules, configs: {} }

  const recommended: LintConfig = {
    plugins: { dispersa: plugin },
    rules: {
      'dispersa/require-description': 'warn',
      'dispersa/naming-convention': ['error', { format: 'kebab-case' }],
      'dispersa/no-deprecated-usage': 'warn',
    },
  }

  const strict: LintConfig = {
    plugins: { dispersa: plugin },
    rules: {
      'dispersa/require-description': 'error',
      'dispersa/naming-convention': ['error', { format: 'kebab-case' }],
      'dispersa/no-deprecated-usage': 'error',
      'dispersa/no-duplicate-values': 'error',
    },
  }

  const minimal: LintConfig = {
    plugins: { dispersa: plugin },
    rules: {
      'dispersa/no-deprecated-usage': 'warn',
    },
  }

  plugin.configs = { recommended, strict, minimal }

  return { plugin, recommended, strict, minimal } as const
}

const {
  plugin: dispersaPlugin,
  recommended: recommendedConfig,
  strict: strictConfig,
  minimal: minimalConfig,
} = buildDispersaPlugin()

/**
 * Built-in Dispersa lint plugin
 *
 * Provides core lint rules for design token validation.
 *
 * @example
 * ```typescript
 * import { dispersaPlugin } from 'dispersa/lint'
 *
 * const config = {
 *   plugins: { dispersa: dispersaPlugin },
 *   rules: {
 *     'dispersa/require-description': 'warn',
 *     'dispersa/naming-convention': ['error', { format: 'kebab-case' }],
 *   },
 * }
 * ```
 */
export { dispersaPlugin }

/** Recommended lint configuration */
export { recommendedConfig }

/** Strict lint configuration */
export { strictConfig }

/** Minimal lint configuration */
export { minimalConfig }

// ============================================================================
// Declaration Merging: Register dispersa's built-in rules in the type registry
// ============================================================================

declare module '../types' {
  interface RulesRegistry {
    'dispersa/require-description': RequireDescriptionOptions
    'dispersa/naming-convention': NamingConventionOptions
    'dispersa/no-deprecated-usage': NoDeprecatedUsageOptions
    'dispersa/no-duplicate-values': NoDuplicateValuesOptions
    'dispersa/path-schema': PathSchemaConfig
  }
}
