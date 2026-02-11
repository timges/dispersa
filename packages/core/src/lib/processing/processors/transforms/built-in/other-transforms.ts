/**
 * @fileoverview Other built-in value transforms
 */

import { ResolvedToken } from '@lib/tokens/types'

import type { Transform } from '../types'

/**
 * Convert font weight to numeric value
 */
export function fontWeightToNumber(): Transform {
  return {
    matcher: (token: ResolvedToken) => token.$type === 'fontWeight',
    transform: (token: ResolvedToken) => {
      const value = token.$value

      if (typeof value === 'number') {
        return token
      }

      if (typeof value === 'string') {
        const weightMap: Record<string, number> = {
          thin: 100,
          hairline: 100,
          'extra-light': 200,
          'ultra-light': 200,
          light: 300,
          normal: 400,
          regular: 400,
          medium: 500,
          'semi-bold': 600,
          'demi-bold': 600,
          bold: 700,
          'extra-bold': 800,
          'ultra-bold': 800,
          black: 900,
          heavy: 900,
          'extra-black': 950,
          'ultra-black': 950,
        }

        const weight = weightMap[value.toLowerCase()]
        if (weight !== undefined) {
          return { ...token, $value: weight }
        }
      }

      return token
    },
  }
}

type DurationUnit = 'ms' | 's'
type ParsedDuration = { value: number; unit: DurationUnit }

/** Parse a raw duration value (object or string form) into a normalized representation */
function parseDuration(rawValue: unknown): ParsedDuration | null {
  if (
    typeof rawValue === 'object' &&
    rawValue !== null &&
    'value' in rawValue &&
    'unit' in rawValue
  ) {
    const unit = (rawValue as { unit: string }).unit
    const numeric = Number((rawValue as { value: unknown }).value)
    if (Number.isFinite(numeric) && (unit === 'ms' || unit === 's')) {
      return { value: numeric, unit }
    }
    return null
  }

  const str = typeof rawValue === 'string' || typeof rawValue === 'number' ? String(rawValue) : ''
  if (str.endsWith('ms')) {
    const numeric = parseFloat(str)
    return Number.isFinite(numeric) ? { value: numeric, unit: 'ms' } : null
  }
  if (str.endsWith('s')) {
    const numeric = parseFloat(str)
    return Number.isFinite(numeric) ? { value: numeric, unit: 's' } : null
  }

  return null
}

/** Convert a parsed duration to the target unit */
function convertDurationUnit(parsed: ParsedDuration, target: DurationUnit): ParsedDuration {
  if (parsed.unit === target) {
    return parsed
  }
  return target === 'ms'
    ? { value: parsed.value * 1000, unit: 'ms' }
    : { value: parsed.value / 1000, unit: 's' }
}

/**
 * Convert duration to milliseconds
 */
export function durationToMs(): Transform {
  return {
    matcher: (token: ResolvedToken) => token.$type === 'duration',
    transform: (token: ResolvedToken) => {
      const parsed = parseDuration(token.$value)
      if (!parsed) {
        return token
      }
      const converted = convertDurationUnit(parsed, 'ms')
      return { ...token, $value: { value: converted.value, unit: converted.unit } }
    },
  }
}

/**
 * Convert duration to seconds
 */
export function durationToSeconds(): Transform {
  return {
    matcher: (token: ResolvedToken) => token.$type === 'duration',
    transform: (token: ResolvedToken) => {
      const parsed = parseDuration(token.$value)
      if (!parsed) {
        return token
      }
      const converted = convertDurationUnit(parsed, 's')
      return { ...token, $value: { value: converted.value, unit: converted.unit } }
    },
  }
}
