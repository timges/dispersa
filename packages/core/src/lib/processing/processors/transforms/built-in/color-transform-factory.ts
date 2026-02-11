/**
 * @fileoverview Unified factory for creating color transforms
 * Handles both simple conversions and modern color space transformations
 */

import { ColorValue, ColorValueObject, ResolvedToken } from '@lib/tokens/types'
import { converter, formatCss, type Mode } from 'culori'

import { Transform } from '..'

import { dtcgObjectToCulori as convertDtcgToCulori, isColorObject } from './color-converter'

/**
 * Convert DTCG color value to culori color object
 * Returns null if value is not a ColorValueObject (e.g., unresolved alias reference)
 */
export function dtcgObjectToCulori(value: ColorValue) {
  if (!isColorObject(value)) {
    return null
  }
  return convertDtcgToCulori(value)
}

/**
 * Create a simple color transform with direct string conversion
 * Used for basic color formats (hex, rgb, hsl)
 *
 * @param converter - Function to convert color object to string
 * @returns Transform object
 *
 * @example
 * ```typescript
 * const hexTransform = createColorTransform('color:hex', colorObjectToHex)
 * ```
 */
export function createColorTransform(converter: (value: ColorValueObject) => string): Transform {
  return {
    matcher: (token: ResolvedToken) => token.$type === 'color',
    transform: (token: ResolvedToken) => {
      const value = token.$value as ColorValue

      if (!isColorObject(value)) {
        // String values should be alias references that get resolved before transforms
        return token
      }

      try {
        const converted = converter(value)
        return { ...token, $value: converted }
      } catch {
        // If conversion fails, return token unchanged
        return token
      }
    },
  }
}

/**
 * Create a modern color transform using culori converter
 * Used for CSS Color Module Level 4 color spaces (oklch, oklab, lch, lab, hwb)
 *
 * @param mode - Culori color mode to convert to
 * @returns Transform object
 *
 * @example
 * ```typescript
 * const oklchTransform = createModernColorTransform('color:oklch', 'oklch')
 * ```
 */
export function createModernColorTransform(mode: Mode): Transform {
  return {
    matcher: (token: ResolvedToken) => token.$type === 'color',
    transform: (token: ResolvedToken) => {
      const value = token.$value as ColorValue

      try {
        const parsed = dtcgObjectToCulori(value)

        if (parsed === null) {
          return token
        }

        // Convert to target color space
        const converted = converter(mode)(parsed)
        const formatted = formatCss(converted)

        if (formatted === '') {
          return token
        }

        return { ...token, $value: formatted }
      } catch {
        // Gracefully fall back to original token on unsupported color values
        return token
      }
    },
  }
}
