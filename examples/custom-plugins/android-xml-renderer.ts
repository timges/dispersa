import path from 'node:path'

import {
  outputTree,
  type RenderContext,
  type Renderer,
  type ResolvedToken,
  type ResolvedTokens,
} from 'dispersa'

import {
  type Rgba,
  clamp01,
  formatNumber,
  getThemeContext,
  parseRgba,
  resolveOutputFile,
} from './utils.js'

export const androidXmlRenderer = (): Renderer => ({
  format: (context: RenderContext) => {
    const files: Record<string, string> = {}
    const defaults = context.meta.defaults

    for (const { tokens, modifierInputs } of context.permutations) {
      const themeValue = getThemeContext(modifierInputs, defaults)
      const resourceBase = themeValue === 'dark' ? 'values-night' : 'values'
      const baseDir = resolveOutputFile(context.output.file, modifierInputs, 'android')
      const colorContent = buildAndroidColors(tokens)
      const dimenContent = buildAndroidDimens(tokens)

      if (colorContent) {
        files[path.posix.join(baseDir, resourceBase, 'colors.xml')] = colorContent
      }
      if (dimenContent) {
        files[path.posix.join(baseDir, resourceBase, 'dimens.xml')] = dimenContent
      }
    }

    return outputTree(files)
  },
})

// --- Android resource builders ---

const buildAndroidColors = (tokens: ResolvedTokens): string | null => {
  const entries = buildAndroidColorEntries(tokens)
  if (entries.length === 0) return null

  return [
    '<?xml version="1.0" encoding="utf-8"?>',
    '<resources>',
    ...entries.map((e) => `  <color name="${e.name}">${e.value}</color>`),
    '</resources>',
  ].join('\n')
}

const buildAndroidDimens = (tokens: ResolvedTokens): string | null => {
  const entries = buildAndroidDimenEntries(tokens)
  if (entries.length === 0) return null

  return [
    '<?xml version="1.0" encoding="utf-8"?>',
    '<resources>',
    ...entries.map((e) => `  <dimen name="${e.name}">${e.value}</dimen>`),
    '</resources>',
  ].join('\n')
}

const buildAndroidColorEntries = (
  tokens: ResolvedTokens,
): Array<{ name: string; value: string }> => {
  const entries: Array<{ name: string; value: string }> = []

  for (const token of Object.values(tokens) as ResolvedToken[]) {
    if (token.$type !== 'color') continue
    const rgba = parseRgba(token.$value)
    if (!rgba) continue

    entries.push({ name: toAndroidResourceName(token.name), value: rgbaToHex(rgba) })
  }

  return entries
}

const buildAndroidDimenEntries = (
  tokens: ResolvedTokens,
): Array<{ name: string; value: string }> => {
  const entries: Array<{ name: string; value: string }> = []

  for (const token of Object.values(tokens) as ResolvedToken[]) {
    if (token.$type !== 'dimension') continue

    const dimension = token.$value as { value?: number; unit?: string }
    if (typeof dimension?.value !== 'number') continue

    const unit = resolveAndroidUnit(dimension, token)
    entries.push({
      name: toAndroidResourceName(token.name),
      value: `${formatNumber(dimension.value)}${unit}`,
    })
  }

  return entries
}

const resolveAndroidUnit = (
  dimension: { value?: number; unit?: string },
  token: ResolvedToken,
): string => {
  const extensionUnit = extractAndroidExtensionUnit(token.$extensions)
  if (extensionUnit) return extensionUnit

  const unitMap: Record<string, string> = { px: 'dp', rem: 'sp', em: 'sp', pt: 'sp' }
  return unitMap[dimension.unit ?? ''] ?? 'dp'
}

const extractAndroidExtensionUnit = (extensions: unknown): string | null => {
  if (!extensions || typeof extensions !== 'object') return null

  const android = (extensions as { android?: unknown }).android
  if (!android || typeof android !== 'object') return null

  const unit = (android as { unit?: unknown }).unit
  return typeof unit === 'string' ? unit : null
}

const toAndroidResourceName = (name: string): string => {
  const cleaned = name.replace(/[^a-zA-Z0-9]+/g, '_').toLowerCase()
  return cleaned.startsWith('_') ? cleaned.slice(1) : cleaned
}

const rgbaToHex = (rgba: Rgba): string => {
  const toHex = (value: number): string => {
    const rounded = Math.round(clamp01(value) * 255)
    return rounded.toString(16).padStart(2, '0')
  }
  return `#${toHex(rgba.r)}${toHex(rgba.g)}${toHex(rgba.b)}${toHex(rgba.a)}`
}
