import type { ModifierInputs } from 'dispersa'

export type Rgba = {
  r: number
  g: number
  b: number
  a: number
}

export const parseRgba = (value: unknown): Rgba | null => {
  if (typeof value === 'string') {
    return parseHexColor(value)
  }

  if (!value || typeof value !== 'object') {
    return null
  }

  return parseDtcgColorObject(value as Record<string, unknown>)
}

const parseDtcgColorObject = (value: Record<string, unknown>): Rgba | null => {
  if (value.colorSpace !== 'srgb') {
    return null
  }

  const components = value.components
  if (!Array.isArray(components) || components.length < 3) {
    return null
  }

  const [r, g, b] = components
  if (typeof r !== 'number' || typeof g !== 'number' || typeof b !== 'number') {
    return null
  }

  const alpha = typeof value.alpha === 'number' ? value.alpha : 1
  return {
    r: clamp01(r),
    g: clamp01(g),
    b: clamp01(b),
    a: clamp01(alpha),
  }
}

const parseHexColor = (value: string): Rgba | null => {
  const trimmed = value.trim()
  const hex = trimmed.startsWith('#') ? trimmed.slice(1) : trimmed
  if (hex.length !== 6 && hex.length !== 8) {
    return null
  }

  const number = Number.parseInt(hex, 16)
  if (Number.isNaN(number)) {
    return null
  }

  const hasAlpha = hex.length === 8
  const r = (number >> (hasAlpha ? 24 : 16)) & 0xff
  const g = (number >> (hasAlpha ? 16 : 8)) & 0xff
  const b = (number >> (hasAlpha ? 8 : 0)) & 0xff
  const a = hasAlpha ? number & 0xff : 0xff

  return {
    r: r / 255,
    g: g / 255,
    b: b / 255,
    a: a / 255,
  }
}

export const clamp01 = (value: number): number => {
  if (value < 0) return 0
  if (value > 1) return 1
  return value
}

export const formatNumber = (value: number): string => {
  const rounded = Math.round(value * 10000) / 10000
  return rounded.toString()
}

export const resolveOutputFile = (
  outputFile: string | ((modifierInputs: ModifierInputs) => string) | undefined,
  modifierInputs: ModifierInputs,
  fallbackFile: string,
): string => {
  if (typeof outputFile === 'function') {
    return outputFile(modifierInputs)
  }

  return interpolateFileName(outputFile ?? fallbackFile, modifierInputs)
}

const interpolateFileName = (pattern: string, modifierInputs: ModifierInputs): string => {
  if (!/\{.+?\}/.test(pattern)) {
    return pattern
  }

  let result = pattern
  for (const [key, value] of Object.entries(modifierInputs) as [string, string][]) {
    result = result.replace(new RegExp(`\\{${key}\\}`, 'g'), value)
  }
  return result
}

export const formatPermutationLabel = (
  modifierInputs: ModifierInputs,
  defaults: Record<string, string>,
): string => {
  const entries = Object.entries(modifierInputs)
  if (entries.length === 0) return 'base'

  return entries
    .map(([key, value]) => {
      const isDefault = defaults[key] === value
      return isDefault ? `${key}:${value}` : `${key}:${value}*`
    })
    .join(', ')
}

export const getThemeContext = (
  modifierInputs: ModifierInputs,
  defaults: Record<string, string>,
): string => {
  if (modifierInputs.theme) return modifierInputs.theme
  return defaults.theme ?? 'light'
}
