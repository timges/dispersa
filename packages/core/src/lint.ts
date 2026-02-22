/**
 * @license MIT
 * Copyright (c) 2025-present Dispersa
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

/**
 * @fileoverview Subpath entry for dispersa/lint
 *
 * This is the public entry point when importing from 'dispersa/lint'.
 *
 * @example
 * ```typescript
 * import { LintRunner, dispersaPlugin, recommendedConfig } from 'dispersa/lint'
 *
 * const runner = new LintRunner(recommendedConfig)
 * const result = await runner.run(tokens)
 * ```
 */

export * from './lint/index'
