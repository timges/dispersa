/**
 * @license
 * Copyright (c) 2025 Dispersa Contributors
 * SPDX-License-Identifier: MIT
 */

/**
 * @fileoverview Preprocessors subpath export
 * Import preprocessors from: dispersa/preprocessors
 */

// ============================================================================
// PREPROCESSOR TYPE
// ============================================================================

export type { Preprocessor } from '@processing/processors/preprocessors/types'

// ============================================================================
// BUILT-IN PREPROCESSORS
// ============================================================================

// No built-in preprocessors currently - users can create custom ones inline.
// Runtime marker to prevent an empty chunk warning during build.
export const preprocessors = [] as const
