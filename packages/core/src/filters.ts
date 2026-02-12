/**
 * @license
 * Copyright (c) 2025 Dispersa Contributors
 * SPDX-License-Identifier: MIT
 */

/**
 * @fileoverview Filters subpath export
 * Import filters from: dispersa/filters
 */

// ============================================================================
// FILTER TYPE
// ============================================================================

export type { Filter } from '@processing/processors/filters/types'

// ============================================================================
// BUILT-IN FILTERS
// ============================================================================

export { byPath, byType, isAlias, isBase } from '@processing/processors/filters/built-in'
