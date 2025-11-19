/**
 * @license
 * Copyright (c) 2025 Token Forge Contributors
 * SPDX-License-Identifier: MIT
 */

/**
 * @fileoverview Utilities subpath export
 * Import utilities from: @token-forge/core/utils
 */

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

export { readJSONFile } from '@adapters/filesystem/file-utils'
export { formatTokenPath, joinPath } from '@shared/utils/path-utils'
export { createErrorWithCause, getErrorMessage } from '@shared/utils/error-utils'

// ============================================================================
// UTILITY CLASSES
// ============================================================================

export { CaseInsensitiveMap } from '@shared/utils/case-insensitive-map'

// ============================================================================
// CONSTANTS
// ============================================================================

export { DEFAULT_BASE_FONT_SIZE_PX, DEFAULT_MAX_ALIAS_DEPTH } from '@shared/constants'
