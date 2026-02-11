/**
 * @fileoverview Built-in color value transforms with alpha channel support
 * Includes both standard (hex, rgb, hsl) and modern CSS Color Module Level 4 transforms
 * Uses culori for accurate color conversions
 *
 * Note: Transforms only handle DTCG object format. String values are alias references
 * that must be resolved before transforms run.
 */

import type { ColorValue, ResolvedToken } from '@lib/tokens/types'
import { formatCss } from 'culori'

import type { Transform } from '../types'

import { colorObjectToHex } from './color-converter'
import { colorObjectToHsl, colorObjectToRgb } from './color-format'
import {
  createColorTransform,
  createModernColorTransform,
  dtcgObjectToCulori,
} from './color-transform-factory'

// ============================================================================
// Standard Color Transforms (hex, rgb, hsl)
// ============================================================================

/**
 * Convert color to hex format (with alpha support via 8-digit hex)
 */
export function colorToHex(): Transform {
  return createColorTransform(colorObjectToHex)
}

/**
 * Convert color to rgb/rgba format (preserves alpha)
 */
export function colorToRgb(): Transform {
  return createColorTransform(colorObjectToRgb)
}

/**
 * Convert color to hsl/hsla format (preserves alpha)
 */
export function colorToHsl(): Transform {
  return createColorTransform(colorObjectToHsl)
}

// ============================================================================
// Modern CSS Color Module Level 4 Transforms
// ============================================================================

/**
 * Convert color to oklch format (perceptual color space)
 */
export function colorToOklch(): Transform {
  return createModernColorTransform('oklch')
}

/**
 * Convert color to oklab format (perceptual color space)
 */
export function colorToOklab(): Transform {
  return createModernColorTransform('oklab')
}

/**
 * Convert color to lch format (CIELAB lightness-chroma-hue)
 */
export function colorToLch(): Transform {
  return createModernColorTransform('lch')
}

/**
 * Convert color to lab format (CIELAB)
 */
export function colorToLab(): Transform {
  return createModernColorTransform('lab')
}

/**
 * Convert color to hwb format (hue-whiteness-blackness)
 */
export function colorToHwb(): Transform {
  return createModernColorTransform('hwb')
}

/**
 * Convert color to CSS color() function format
 * Uses the original color space and formats as CSS color() function
 */
export function colorToColorFunction(): Transform {
  return {
    matcher: (token: ResolvedToken) => token.$type === 'color',
    transform: (token: ResolvedToken) => {
      const value = token.$value as ColorValue

      try {
        const parsed = dtcgObjectToCulori(value)

        if (parsed === null) {
          return token
        }

        // Format as color() function (preserves original color space)
        const formatted = formatCss(parsed)

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
