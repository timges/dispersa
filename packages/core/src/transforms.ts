/**
 * @license
 * Copyright (c) 2025 Dispersa Contributors
 * SPDX-License-Identifier: MIT
 */

/**
 * @fileoverview Transforms subpath export
 * Import transforms from: dispersa/transforms
 */

// ============================================================================
// TRANSFORM TYPE
// ============================================================================

export type { Transform } from '@processing/processors/transforms/types'

// ============================================================================
// COLOR TRANSFORMS
// ============================================================================

export {
  colorToHex,
  colorToHsl,
  colorToRgb,
} from '@processing/processors/transforms/built-in/color-transforms'

// ============================================================================
// MODERN COLOR TRANSFORMS
// ============================================================================

export {
  colorToColorFunction,
  colorToHwb,
  colorToLab,
  colorToLch,
  colorToOklab,
  colorToOklch,
} from '@processing/processors/transforms/built-in/color-transforms'

// ============================================================================
// DIMENSION TRANSFORMS
// ============================================================================

export {
  dimensionToPx,
  dimensionToRem,
  dimensionToUnitless,
} from '@processing/processors/transforms/built-in/dimension-transforms'

// ============================================================================
// NAME TRANSFORMS
// ============================================================================

export {
  nameCamelCase,
  nameConstantCase,
  nameCssVar,
  nameKebabCase,
  namePascalCase,
  namePrefix,
  nameSnakeCase,
  nameSuffix,
} from '@processing/processors/transforms/built-in/name-transforms'

// ============================================================================
// OTHER TRANSFORMS
// ============================================================================

export {
  durationToMs,
  durationToSeconds,
  fontWeightToNumber,
} from '@processing/processors/transforms/built-in/other-transforms'
