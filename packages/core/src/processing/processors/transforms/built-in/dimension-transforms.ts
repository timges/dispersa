/**
 * @fileoverview Built-in dimension value transforms
 * Handles DTCG 2025.10 object format { value: number, unit: string }
 * and converts to string format for output
 */

import { DEFAULT_BASE_FONT_SIZE_PX } from '@shared/constants'
import type { DimensionValue, ResolvedToken } from '@tokens/types'

import type { Transform } from '../types'

import { convertDimension, dimensionObjectToString, isDimensionObject } from './dimension-converter'
/**
 * Convert dimension to px string format
 */
export function dimensionToPx(): Transform {
  return {
    matcher: (token: ResolvedToken) => token.$type === 'dimension',
    transform: (token: ResolvedToken) => {
      const value = token.$value

      // If already a string, return as-is
      if (typeof value === 'string') {
        return token
      }

      // Convert dimension object to px
      if (isDimensionObject(value)) {
        const converted = convertDimension(value as DimensionValue, 'px', DEFAULT_BASE_FONT_SIZE_PX)
        return { ...token, $value: dimensionObjectToString(converted) }
      }

      return token
    },
  }
}

/**
 * Convert dimension to rem string format
 */
export function dimensionToRem(): Transform {
  return {
    matcher: (token: ResolvedToken) => token.$type === 'dimension',
    transform: (token: ResolvedToken) => {
      const value = token.$value

      // If already a string, return as-is
      if (typeof value === 'string') {
        return token
      }

      // Convert dimension object to rem
      if (isDimensionObject(value)) {
        const converted = convertDimension(
          value as DimensionValue,
          'rem',
          DEFAULT_BASE_FONT_SIZE_PX,
        )
        return { ...token, $value: dimensionObjectToString(converted) }
      }

      return token
    },
  }
}

/**
 * Unitless dimension (extract numeric value)
 */
export function dimensionToUnitless(): Transform {
  return {
    matcher: (token: ResolvedToken) => token.$type === 'dimension',
    transform: (token: ResolvedToken) => {
      const value = token.$value

      // If already a string, parse out the number
      if (typeof value === 'string') {
        const num = parseFloat(value)
        return { ...token, $value: isNaN(num) ? value : num }
      }

      // Extract value from dimension object
      if (isDimensionObject(value)) {
        return { ...token, $value: (value as DimensionValue).value }
      }

      return token
    },
  }
}
