/**
 * @fileoverview Dimension format conversion utilities for DTCG 2025.10
 * Handles dimension object format { value: number, unit: string }
 */

import type { DimensionValue } from '@lib/tokens/types'
import { DEFAULT_BASE_FONT_SIZE_PX } from '@shared/constants'
/**
 * Check if a value is in dimension object format
 */
export function isDimensionObject(value: unknown): value is DimensionValue {
  return typeof value === 'object' && value !== null && 'value' in value && 'unit' in value
}

/**
 * Convert DTCG dimension object to CSS string
 */
export function dimensionObjectToString(dimension: DimensionValue): string {
  return `${dimension.value}${dimension.unit}`
}

/**
 * Convert a DTCG dimension object between units (px, rem).
 *
 * Converts via px as an intermediate: rem -> px -> target.
 * Returns the original value unchanged for unsupported unit combinations.
 *
 * @param value - Source dimension object
 * @param toUnit - Target CSS unit
 * @param baseFontSize - Base font size in px used for rem conversions
 */
export function convertDimension(
  value: DimensionValue,
  toUnit: DimensionValue['unit'],
  baseFontSize = DEFAULT_BASE_FONT_SIZE_PX,
): DimensionValue {
  const fromUnit = value.unit
  let numValue = value.value

  // Convert to px first (as intermediate)
  if (fromUnit === 'rem') {
    numValue = numValue * baseFontSize
  } else if (fromUnit !== 'px' && fromUnit !== toUnit) {
    // If not px, rem, or em, and not already target unit, return as-is
    return value
  }

  // Convert from px to target unit
  if (toUnit === 'rem') {
    numValue = numValue / baseFontSize
  } else if (toUnit !== 'px') {
    // Can't convert to other units, return original
    return value
  }

  return {
    value: numValue,
    unit: toUnit,
  }
}
