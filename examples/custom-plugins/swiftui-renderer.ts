import {
  outputTree,
  type ModifierInputs,
  type RenderContext,
  type Renderer,
  type ResolvedToken,
  type ResolvedTokens,
} from 'dispersa'

import { formatNumber, parseRgba, resolveOutputFile } from './utils.js'

type SwiftEntry = {
  name: string
  type: 'Color' | 'CGFloat' | 'Double' | 'TimeInterval' | 'String'
  value: string
}

type SwiftRendererOptions = {
  moduleName: string
  enums: {
    colors: string
    dimensions: string
    numbers: string
    durations: string
    fontFamilies: string
    fontWeights: string
  }
}

const defaultSwiftOptions: SwiftRendererOptions = {
  moduleName: 'DesignTokens',
  enums: {
    colors: 'Colors',
    dimensions: 'Dimensions',
    numbers: 'Numbers',
    durations: 'Durations',
    fontFamilies: 'FontFamilies',
    fontWeights: 'FontWeights',
  },
}

export const swiftUiRenderer = (options?: Partial<SwiftRendererOptions>): Renderer => {
  const resolved = {
    ...defaultSwiftOptions,
    ...options,
    enums: { ...defaultSwiftOptions.enums, ...options?.enums },
  }

  return {
    format: (context: RenderContext) => {
      const files: Record<string, string> = {}

      for (const { tokens, modifierInputs } of context.permutations) {
        const content = buildSwiftFile(tokens, resolved)
        const fileName = resolveOutputFile(
          context.output.file,
          modifierInputs,
          buildSwiftFallback(modifierInputs),
        )
        files[fileName] = content
      }

      return outputTree(files)
    },
  }
}

// --- Swift file generation ---

const buildSwiftFile = (tokens: ResolvedTokens, options: SwiftRendererOptions): string => {
  const groups = buildSwiftEntries(tokens, options.enums)
  const sections = Object.entries(groups).filter(([, entries]) => entries.length > 0)
  const lines: string[] = ['import SwiftUI', '', `enum ${options.moduleName} {`]

  for (const [enumName, entries] of sections) {
    lines.push(`  enum ${enumName} {`)
    lines.push(...renderSwiftEntries(entries, '    '))
    lines.push('  }', '')
  }

  lines.push('}')
  return lines.join('\n')
}

const buildSwiftEntries = (
  tokens: ResolvedTokens,
  enums: SwiftRendererOptions['enums'],
): Record<string, SwiftEntry[]> => ({
  [enums.colors]: buildSwiftColorEntries(tokens),
  [enums.dimensions]: buildSwiftDimensionEntries(tokens),
  [enums.numbers]: buildSwiftNumberEntries(tokens),
  [enums.durations]: buildSwiftDurationEntries(tokens),
  [enums.fontFamilies]: buildSwiftFontFamilyEntries(tokens),
  [enums.fontWeights]: buildSwiftFontWeightEntries(tokens),
})

const renderSwiftEntries = (entries: SwiftEntry[], indent: string): string[] =>
  entries.map((entry) => {
    const type = entry.type === 'Color' ? '' : `: ${entry.type}`
    return `${indent}static let ${entry.name}${type} = ${entry.value}`
  })

const buildSwiftColorEntries = (tokens: ResolvedTokens): SwiftEntry[] => {
  const entries: SwiftEntry[] = []

  for (const token of Object.values(tokens) as ResolvedToken[]) {
    if (token.$type !== 'color') continue
    const colorValue = toSwiftColorValue(token.$value)
    if (!colorValue) continue

    entries.push({ name: toSwiftIdentifier(token.name), type: 'Color', value: colorValue })
  }

  return entries
}

const buildSwiftDimensionEntries = (tokens: ResolvedTokens): SwiftEntry[] => {
  const entries: SwiftEntry[] = []

  for (const token of Object.values(tokens) as ResolvedToken[]) {
    if (token.$type !== 'dimension') continue
    const value = extractDimensionValue(token.$value)
    if (value == null) continue

    entries.push({
      name: toSwiftIdentifier(token.name),
      type: 'CGFloat',
      value: formatNumber(value),
    })
  }

  return entries
}

const buildSwiftNumberEntries = (tokens: ResolvedTokens): SwiftEntry[] => {
  const entries: SwiftEntry[] = []

  for (const token of Object.values(tokens) as ResolvedToken[]) {
    if (token.$type !== 'number') continue
    if (typeof token.$value !== 'number') continue

    entries.push({
      name: toSwiftIdentifier(token.name),
      type: 'Double',
      value: formatNumber(token.$value),
    })
  }

  return entries
}

const buildSwiftDurationEntries = (tokens: ResolvedTokens): SwiftEntry[] => {
  const entries: SwiftEntry[] = []

  for (const token of Object.values(tokens) as ResolvedToken[]) {
    if (token.$type !== 'duration') continue
    const duration = parseDurationSeconds(token.$value)
    if (duration == null) continue

    entries.push({
      name: toSwiftIdentifier(token.name),
      type: 'TimeInterval',
      value: formatNumber(duration),
    })
  }

  return entries
}

const buildSwiftFontFamilyEntries = (tokens: ResolvedTokens): SwiftEntry[] => {
  const entries: SwiftEntry[] = []

  for (const token of Object.values(tokens) as ResolvedToken[]) {
    if (token.$type !== 'fontFamily') continue
    const value = extractFontFamilyValue(token.$value)
    if (!value) continue

    entries.push({
      name: toSwiftIdentifier(token.name),
      type: 'String',
      value: JSON.stringify(value),
    })
  }

  return entries
}

const buildSwiftFontWeightEntries = (tokens: ResolvedTokens): SwiftEntry[] => {
  const entries: SwiftEntry[] = []

  for (const token of Object.values(tokens) as ResolvedToken[]) {
    if (token.$type !== 'fontWeight') continue
    const weightValue = toNumericValue(token.$value)
    if (weightValue == null) continue

    entries.push({
      name: toSwiftIdentifier(token.name),
      type: 'Double',
      value: formatNumber(weightValue),
    })
  }

  return entries
}

// --- Value extraction helpers ---

const toSwiftColorValue = (value: unknown): string | null => {
  const rgba = parseRgba(value)
  if (!rgba) return null

  const { r, g, b, a } = rgba
  return `Color(.sRGB, red: ${formatNumber(r)}, green: ${formatNumber(g)}, blue: ${formatNumber(b)}, opacity: ${formatNumber(a)})`
}

const toSwiftIdentifier = (name: string): string => {
  const parts = name.split(/[^a-zA-Z0-9]+/).filter(Boolean)
  const [first, ...rest] = parts
  const head = first ? first.toLowerCase() : 'token'
  const tail = rest.map((part) => part.charAt(0).toUpperCase() + part.slice(1))
  const combined = [head, ...tail].join('')

  return /^\d/.test(combined) ? `token${combined}` : combined
}

const extractDimensionValue = (value: unknown): number | null => {
  if (!value || typeof value !== 'object') return null
  const dimension = value as { value?: unknown }
  return typeof dimension.value === 'number' ? dimension.value : null
}

const extractFontFamilyValue = (value: unknown): string | null => {
  if (typeof value === 'string') return value
  if (Array.isArray(value)) {
    const first = value.find((item) => typeof item === 'string')
    return typeof first === 'string' ? first : null
  }
  return null
}

const parseDurationSeconds = (value: unknown): number | null => {
  if (typeof value !== 'string') return null

  const match = value.trim().match(/^(\d+(\.\d+)?)(ms|s)$/)
  if (!match) return null

  const numberValue = Number.parseFloat(match[1] ?? '')
  if (Number.isNaN(numberValue)) return null

  return match[3] === 'ms' ? numberValue / 1000 : numberValue
}

const toNumericValue = (value: unknown): number | null => {
  if (typeof value === 'number') return value
  if (typeof value === 'string') {
    const parsed = Number.parseFloat(value)
    return Number.isNaN(parsed) ? null : parsed
  }
  return null
}

const buildSwiftFallback = (modifierInputs: ModifierInputs): string => {
  const suffix = Object.entries(modifierInputs)
    .map(([key, value]) => `${key}-${value}`)
    .join('-')
  return `swift/tokens${suffix ? `-${suffix}` : ''}.swift`
}
