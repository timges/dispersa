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

export type { Transform } from '@processing/transforms/types'

// ============================================================================
// COLOR TRANSFORMS
// ============================================================================

export {
  colorToHex,
  colorToHsl,
  colorToRgb,
} from '@processing/transforms/built-in/color-transforms'

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
} from '@processing/transforms/built-in/color-transforms'

// ============================================================================
// DIMENSION TRANSFORMS
// ============================================================================

export {
  dimensionToPx,
  dimensionToRem,
  dimensionToUnitless,
} from '@processing/transforms/built-in/dimension-transforms'

// ============================================================================
// NAME TRANSFORMS
// ============================================================================

export {
  nameCamelCase,
  nameConstantCase,
  nameKebabCase,
  namePascalCase,
  namePrefix,
  nameSnakeCase,
  nameSuffix,
} from '@processing/transforms/built-in/name-transforms'

// ============================================================================
// OTHER TRANSFORMS
// ============================================================================

export {
  durationToMs,
  durationToSeconds,
  fontWeightToNumber,
} from '@processing/transforms/built-in/other-transforms'
