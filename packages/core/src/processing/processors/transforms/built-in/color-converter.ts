/**
 * @fileoverview Color format conversion utilities for DTCG 2025.10
 * Uses culori for accurate color science and conversions
 */

import type { ColorComponent, ColorSpace, ColorValueObject } from '@tokens/types'
import {
  formatHex,
  formatHex8,
  type Color as CuloriColor,
  type Rgb,
  type Lrgb,
  type Hsl,
  type Hwb,
  type Lab,
  type Lch,
  type Oklab,
  type Oklch,
  type P3,
  type A98,
  type Prophoto,
  type Rec2020,
  type Xyz65,
  type Xyz50,
} from 'culori'

/**
 * Check if a color value is in DTCG object format
 */
export function isColorObject(value: unknown): value is ColorValueObject {
  return (
    typeof value === 'object' && value !== null && 'colorSpace' in value && 'components' in value
  )
}

/**
 * Convert a color component value to culori format
 * The "none" keyword becomes undefined (culori's representation of missing channels)
 */
function componentToCulori(component: ColorComponent): number | undefined {
  return component === 'none' ? undefined : component
}

/**
 * Convert DTCG color object to culori color object
 * Handles all 14 DTCG color spaces and the "none" keyword
 */
export function dtcgObjectToCulori(color: ColorValueObject): CuloriColor {
  const [c1, c2, c3] = color.components.map(componentToCulori)
  const alpha = color.alpha !== undefined ? componentToCulori(color.alpha) : undefined

  // Normalize color space (case-insensitive, handle aliases)
  const colorSpace = color.colorSpace.toLowerCase() as Lowercase<ColorSpace>

  // Map DTCG color spaces to culori color objects with proper property names
  switch (colorSpace) {
    // RGB-based color spaces (components are R, G, B in 0-1 range)
    case 'srgb':
      return { mode: 'rgb', r: c1, g: c2, b: c3, alpha } as Rgb

    case 'srgb-linear':
      return { mode: 'lrgb', r: c1, g: c2, b: c3, alpha } as Lrgb

    case 'display-p3':
      return { mode: 'p3', r: c1, g: c2, b: c3, alpha } as P3

    case 'a98-rgb':
      return { mode: 'a98', r: c1, g: c2, b: c3, alpha } as A98

    case 'prophoto-rgb':
      return { mode: 'prophoto', r: c1, g: c2, b: c3, alpha } as Prophoto

    case 'rec2020':
      return { mode: 'rec2020', r: c1, g: c2, b: c3, alpha } as Rec2020

    // Cylindrical color spaces (Hue, Saturation/Whiteness, Lightness/Blackness)
    case 'hsl':
      return { mode: 'hsl', h: c1, s: c2, l: c3, alpha } as Hsl

    case 'hwb':
      return { mode: 'hwb', h: c1, w: c2, b: c3, alpha } as Hwb

    // Lab color spaces (Lightness, a/b or Chroma/Hue)
    case 'lab':
      return { mode: 'lab', l: c1, a: c2, b: c3, alpha } as Lab

    case 'lch':
      return { mode: 'lch', l: c1, c: c2, h: c3, alpha } as Lch

    case 'oklab':
      return { mode: 'oklab', l: c1, a: c2, b: c3, alpha } as Oklab

    case 'oklch':
      return { mode: 'oklch', l: c1, c: c2, h: c3, alpha } as Oklch

    // XYZ color spaces
    case 'xyz-d65':
      return { mode: 'xyz65', x: c1, y: c2, z: c3, alpha } as Xyz65

    case 'xyz-d50':
      return { mode: 'xyz50', x: c1, y: c2, z: c3, alpha } as Xyz50

    // Fallback to sRGB if color space is not recognized
    default:
      return { mode: 'rgb', r: c1, g: c2, b: c3, alpha } as Rgb
  }
}

/**
 * Convert DTCG color object to hex string
 */
export function colorObjectToHex(color: ColorValueObject): string {
  const culoriColor = dtcgObjectToCulori(color)
  const alpha = color.alpha ?? 1

  if (alpha < 1) {
    return formatHex8(culoriColor)
  }

  return formatHex(culoriColor)
}
