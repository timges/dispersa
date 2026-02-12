/**
 * @fileoverview Color format conversions that use culori's formatRgb / formatHsl
 * Split from color-converter to avoid pulling these into bundles that only need hex.
 */

import type { ColorValueObject } from '@tokens/types'
import { formatRgb, formatHsl } from 'culori'

import { dtcgObjectToCulori } from './color-converter'

/**
 * Convert DTCG color object to rgb/rgba string
 */
export function colorObjectToRgb(color: ColorValueObject): string {
  const culoriColor = dtcgObjectToCulori(color)
  return formatRgb(culoriColor)
}

/**
 * Convert DTCG color object to hsl/hsla string
 */
export function colorObjectToHsl(color: ColorValueObject): string {
  const culoriColor = dtcgObjectToCulori(color)
  return formatHsl(culoriColor)
}
