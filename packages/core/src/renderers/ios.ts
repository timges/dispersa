/**
 * @license MIT
 * Copyright (c) 2025-present Dispersa Contributors
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

/**
 * @fileoverview iOS/SwiftUI renderer for design tokens
 * Generates Swift code targeting SwiftUI (iOS 17+)
 */

import { isColorObject, dtcgObjectToCulori } from '@processing/transforms/built-in/color-converter'
import { isDimensionObject } from '@processing/transforms/built-in/dimension-converter'
import { isDurationObject } from '@processing/transforms/built-in/duration-converter'
import type {
  ColorValueObject,
  DimensionValue,
  DurationValue,
  GradientStop,
  ResolvedToken,
  ResolvedTokens,
} from '@tokens/types'
import { isBorderToken, isShadowToken, isTypographyToken } from '@tokens/types'
import { converter } from 'culori'

import {
  assertFileRequired,
  buildGeneratedFileHeader,
  buildInMemoryOutputKey,
  groupTokensByType,
  indentStr,
  resolveFileName,
  stripInternalMetadata,
  toSafeIdentifier,
} from './bundlers/utils'
import { outputTree } from './output-tree'
import type { RenderContext, RenderOutput, Renderer } from './types'

/**
 * Options for iOS/SwiftUI renderer
 */
export type IosRendererOptions = {
  preset?: 'standalone'
  accessLevel?: 'public' | 'internal'
  /**
   * Output structure:
   * - `'enum'` — nested enums inside a single root enum
   * - `'grouped'` — namespace enum with separate extensions per token group
   */
  structure?: 'enum' | 'grouped'
  enumName?: string
  /** Namespace enum name used in grouped mode (default: 'DesignTokens') */
  extensionNamespace?: string
  colorSpace?: 'sRGB' | 'displayP3'
  /**
   * Target Swift language version.
   * - `'5.9'` (default) — standard static let declarations
   * - `'6.0'` — adds `nonisolated(unsafe)` to static properties for
   *   Swift 6 strict concurrency compliance
   */
  swiftVersion?: '5.9' | '6.0'
  /** Number of spaces per indentation level (default 4) */
  indent?: number
  /** Add @frozen annotation to enums and structs for ABI stability (default false) */
  frozen?: boolean
}

const toSRGB = converter('rgb')
const toP3 = converter('p3')

const SWIFT_TYPE_GROUP_MAP: Record<string, string> = {
  color: 'Colors',
  dimension: 'Spacing',
  fontFamily: 'Fonts',
  fontWeight: 'FontWeights',
  duration: 'Durations',
  shadow: 'Shadows',
  typography: 'Typography',
  number: 'Numbers',
  cubicBezier: 'Animations',
  border: 'Borders',
  gradient: 'Gradients',
}

/**
 * Swift reserved keywords that require backtick-escaping when used as identifiers.
 */
const SWIFT_KEYWORDS = new Set([
  'associatedtype',
  'class',
  'deinit',
  'enum',
  'extension',
  'fileprivate',
  'func',
  'import',
  'init',
  'inout',
  'internal',
  'let',
  'open',
  'operator',
  'private',
  'protocol',
  'public',
  'rethrows',
  'static',
  'struct',
  'subscript',
  'typealias',
  'var',
  'break',
  'case',
  'continue',
  'default',
  'defer',
  'do',
  'else',
  'fallthrough',
  'for',
  'guard',
  'if',
  'in',
  'repeat',
  'return',
  'switch',
  'where',
  'while',
  'as',
  'catch',
  'false',
  'is',
  'nil',
  'super',
  'self',
  'Self',
  'throw',
  'throws',
  'true',
  'try',
  'Type',
  'Protocol',
])

export class IosRenderer implements Renderer<IosRendererOptions> {
  async format(context: RenderContext, options?: IosRendererOptions): Promise<RenderOutput> {
    const opts: Required<IosRendererOptions> = {
      preset: options?.preset ?? 'standalone',
      accessLevel: options?.accessLevel ?? 'public',
      structure: options?.structure ?? 'enum',
      enumName: options?.enumName ?? 'DesignTokens',
      extensionNamespace: options?.extensionNamespace ?? 'DesignTokens',
      colorSpace: options?.colorSpace ?? 'sRGB',
      swiftVersion: options?.swiftVersion ?? '5.9',
      indent: options?.indent ?? 4,
      frozen: options?.frozen ?? false,
    }

    return await this.formatStandalone(context, opts)
  }

  private formatTokens(tokens: ResolvedTokens, options: Required<IosRendererOptions>): string {
    const access = options.accessLevel
    const groups = groupTokensByType(tokens, SWIFT_TYPE_GROUP_MAP)
    const imports = this.collectImports(tokens)
    const staticPrefix = this.staticLetPrefix(options)
    const frozen = this.frozenPrefix(options)
    const lines: string[] = []

    lines.push(buildGeneratedFileHeader())
    lines.push('')
    for (const imp of imports) {
      lines.push(`import ${imp}`)
    }

    lines.push(...this.buildStructDefinitions(tokens, access, options))
    this.pushTokenLayout(lines, groups, options, access, staticPrefix, frozen)
    lines.push(...this.buildViewExtensions(tokens, access, options))
    if (options.structure !== 'grouped') {
      lines.push('')
    }

    return lines.join('\n')
  }

  private pushTokenLayout(
    lines: string[],
    groups: Array<{ name: string; tokens: ResolvedToken[] }>,
    options: Required<IosRendererOptions>,
    access: string,
    staticPrefix: string,
    frozen: string,
  ): void {
    const i1 = indentStr(options.indent, 1)
    const i2 = indentStr(options.indent, 2)

    if (options.structure === 'grouped') {
      this.pushGroupedLayout(lines, groups, options, access, i1, i2, staticPrefix, frozen)
      return
    }

    lines.push('')
    lines.push(`${frozen}${access} enum ${options.enumName} {`)

    for (const group of groups) {
      lines.push(`${i1}${frozen}${access} enum ${group.name} {`)
      this.pushTokenDeclarations(lines, group.tokens, options, access, i2, staticPrefix)
      lines.push(`${i1}}`)
      lines.push('')
    }

    lines.push('}')
  }

  private pushGroupedLayout(
    lines: string[],
    groups: Array<{ name: string; tokens: ResolvedToken[] }>,
    options: Required<IosRendererOptions>,
    access: string,
    i1: string,
    i2: string,
    staticPrefix: string,
    frozen: string,
  ): void {
    const namespace = options.extensionNamespace
    lines.push('')
    lines.push(`${frozen}${access} enum ${namespace} {}`)
    lines.push('')

    for (const group of groups) {
      lines.push(`${access} extension ${namespace} {`)
      lines.push(`${i1}${frozen}enum ${group.name} {`)
      this.pushTokenDeclarations(lines, group.tokens, options, access, i2, staticPrefix)
      lines.push(`${i1}}`)
      lines.push('}')
      lines.push('')
    }
  }

  private pushTokenDeclarations(
    lines: string[],
    tokens: ResolvedToken[],
    options: Required<IosRendererOptions>,
    access: string,
    indent: string,
    staticPrefix: string,
  ): void {
    for (const token of tokens) {
      const swiftName = this.buildQualifiedSwiftName(token)
      const swiftValue = this.formatSwiftValue(token, options)
      const typeAnnotation = this.getTypeAnnotation(token)
      const annotation = typeAnnotation ? `: ${typeAnnotation}` : ''
      const docComment = this.buildDocComment(token, indent)
      if (docComment) {
        lines.push(docComment)
      }
      lines.push(`${indent}${access} ${staticPrefix}${swiftName}${annotation} = ${swiftValue}`)
    }
  }

  private collectImports(tokens: ResolvedTokens): string[] {
    const imports = new Set<string>()
    imports.add('SwiftUI')

    for (const [, token] of Object.entries(tokens)) {
      if (token.$type === 'duration') {
        imports.add('Foundation')
      }
    }

    return Array.from(imports).sort()
  }

  /**
   * Builds a `///` doc comment from a token's `$description`, if present.
   */
  private buildDocComment(token: ResolvedToken, indent: string): string | undefined {
    if (!token.$description) {
      return undefined
    }

    return `${indent}/// ${token.$description}`
  }

  /**
   * Builds a qualified Swift name from a token's path, preserving parent
   * hierarchy segments to avoid duplicate identifiers.
   *
   * For example, `color.blue.400` in the `Colors` group becomes `blue400`
   * instead of just `_400`.
   */
  private buildQualifiedSwiftName(token: ResolvedToken): string {
    const path = token.path

    // The first segment is typically the token type (color, spacing, etc.)
    // which is already represented by the group enum. Strip it.
    const withoutTypePrefix = path.length > 1 ? path.slice(1) : path

    const joined = withoutTypePrefix.join('_')
    return toSafeIdentifier(joined, SWIFT_KEYWORDS, false)
  }

  private formatSwiftValue(token: ResolvedToken, options: Required<IosRendererOptions>): string {
    const { $type, $value: value } = token

    switch ($type) {
      case 'color':
        return this.formatColorValue(value, options)
      case 'dimension':
        return this.formatDimensionValue(value)
      case 'fontFamily':
        return this.formatFontFamilyValue(value)
      case 'fontWeight':
        return this.formatFontWeightValue(value)
      case 'duration':
        return this.formatDurationValue(value)
      case 'shadow':
        return this.formatShadowValue(value, options)
      case 'typography':
        return this.formatTypographyValue(value)
      case 'border':
        return this.formatBorderValue(value, options)
      case 'gradient':
        return this.formatGradientValue(value, options)
      case 'number':
        return String(value)
      case 'cubicBezier':
        if (Array.isArray(value) && value.length === 4) {
          return `UnitCurve.bezier(startControlPoint: UnitPoint(x: ${value[0]}, y: ${value[1]}), endControlPoint: UnitPoint(x: ${value[2]}, y: ${value[3]}))`
        }
        break
    }

    return this.formatSwiftPrimitive(value)
  }

  private formatSwiftPrimitive(value: unknown): string {
    if (typeof value === 'string') {
      return `"${this.escapeSwiftString(value)}"`
    }
    if (typeof value === 'number') {
      return String(value)
    }
    if (typeof value === 'boolean') {
      return value ? 'true' : 'false'
    }
    return `"${this.escapeSwiftString(String(value))}"`
  }

  private formatColorValue(value: unknown, options: Required<IosRendererOptions>): string {
    if (!isColorObject(value)) {
      return typeof value === 'string' ? `Color("${this.escapeSwiftString(value)}")` : 'Color.clear'
    }

    const colorObj = value as ColorValueObject
    const alpha = colorObj.alpha ?? 1

    if (options.colorSpace === 'displayP3') {
      const p3 = toP3(dtcgObjectToCulori(colorObj))
      const r = this.roundComponent(p3?.r ?? 0)
      const g = this.roundComponent(p3?.g ?? 0)
      const b = this.roundComponent(p3?.b ?? 0)
      return alpha < 1
        ? `Color(.displayP3, red: ${r}, green: ${g}, blue: ${b}, opacity: ${this.roundComponent(alpha)})`
        : `Color(.displayP3, red: ${r}, green: ${g}, blue: ${b})`
    }

    const rgb = toSRGB(dtcgObjectToCulori(colorObj))
    const r = this.roundComponent(rgb?.r ?? 0)
    const g = this.roundComponent(rgb?.g ?? 0)
    const b = this.roundComponent(rgb?.b ?? 0)

    return alpha < 1
      ? `Color(red: ${r}, green: ${g}, blue: ${b}, opacity: ${this.roundComponent(alpha)})`
      : `Color(red: ${r}, green: ${g}, blue: ${b})`
  }

  private formatDimensionValue(value: unknown): string {
    if (isDimensionObject(value)) {
      return this.dimensionToPoints(value as DimensionValue)
    }

    return String(value)
  }

  private formatFontFamilyValue(value: unknown): string {
    if (Array.isArray(value)) {
      const primary = value[0]
      return typeof primary === 'string' ? `"${this.escapeSwiftString(primary)}"` : '"system"'
    }

    return typeof value === 'string' ? `"${this.escapeSwiftString(value)}"` : '"system"'
  }

  private formatFontWeightValue(value: unknown): string {
    if (typeof value === 'number') {
      return this.numericFontWeight(value)
    }

    if (typeof value === 'string') {
      return this.namedFontWeight(value) ?? 'Font.Weight.regular'
    }

    return 'Font.Weight.regular'
  }

  private numericFontWeight(weight: number): string {
    if (weight <= 100) {
      return 'Font.Weight.ultraLight'
    }
    if (weight <= 200) {
      return 'Font.Weight.thin'
    }
    if (weight <= 300) {
      return 'Font.Weight.light'
    }
    if (weight <= 400) {
      return 'Font.Weight.regular'
    }
    if (weight <= 500) {
      return 'Font.Weight.medium'
    }
    if (weight <= 600) {
      return 'Font.Weight.semibold'
    }
    if (weight <= 700) {
      return 'Font.Weight.bold'
    }
    if (weight <= 800) {
      return 'Font.Weight.heavy'
    }
    return 'Font.Weight.black'
  }

  private namedFontWeight(name: string): string | undefined {
    const map: Record<string, string> = {
      thin: 'Font.Weight.thin',
      ultralight: 'Font.Weight.ultraLight',
      extralight: 'Font.Weight.ultraLight',
      light: 'Font.Weight.light',
      regular: 'Font.Weight.regular',
      normal: 'Font.Weight.regular',
      medium: 'Font.Weight.medium',
      semibold: 'Font.Weight.semibold',
      demibold: 'Font.Weight.semibold',
      bold: 'Font.Weight.bold',
      heavy: 'Font.Weight.heavy',
      extrabold: 'Font.Weight.heavy',
      black: 'Font.Weight.black',
      ultrabold: 'Font.Weight.black',
    }

    return map[name.toLowerCase()]
  }

  private formatDurationValue(value: unknown): string {
    if (isDurationObject(value)) {
      const dur = value as DurationValue
      const seconds = dur.unit === 'ms' ? dur.value / 1000 : dur.value
      return String(seconds)
    }

    return typeof value === 'number' ? String(value) : '0'
  }

  private formatShadowValue(value: unknown, options: Required<IosRendererOptions>): string {
    if (Array.isArray(value) && value.length > 0) {
      // Use the first shadow layer for SwiftUI
      return this.formatSingleShadow(value[0] as Record<string, unknown>, options)
    }

    if (typeof value === 'object' && value !== null) {
      return this.formatSingleShadow(value as Record<string, unknown>, options)
    }

    return 'ShadowStyle(color: .clear, radius: 0, x: 0, y: 0, spread: 0)'
  }

  private formatSingleShadow(
    shadow: Record<string, unknown>,
    options: Required<IosRendererOptions>,
  ): string {
    const color = isColorObject(shadow.color)
      ? this.formatColorValue(shadow.color, options)
      : 'Color.black.opacity(0.25)'

    const radius = isDimensionObject(shadow.blur)
      ? this.dimensionToCGFloat(shadow.blur as DimensionValue)
      : '8'

    const x = isDimensionObject(shadow.offsetX)
      ? this.dimensionToCGFloat(shadow.offsetX as DimensionValue)
      : '0'

    const y = isDimensionObject(shadow.offsetY)
      ? this.dimensionToCGFloat(shadow.offsetY as DimensionValue)
      : '0'

    const spread = isDimensionObject(shadow.spread)
      ? this.dimensionToCGFloat(shadow.spread as DimensionValue)
      : '0'

    return `ShadowStyle(color: ${color}, radius: ${radius}, x: ${x}, y: ${y}, spread: ${spread})`
  }

  private formatTypographyValue(value: unknown): string {
    if (typeof value !== 'object' || value === null) {
      return 'TypographyStyle(font: Font.body, tracking: 0, lineSpacing: 0)'
    }

    const typo = value as Record<string, unknown>

    const size = isDimensionObject(typo.fontSize)
      ? this.dimensionToPoints(typo.fontSize as DimensionValue)
      : '16'

    const weight =
      typo.fontWeight != null ? this.formatFontWeightValue(typo.fontWeight) : 'Font.Weight.regular'

    const fontExpr = this.buildFontExpression(typo, size, weight)
    const tracking = this.extractTracking(typo)
    const lineSpacing = this.extractLineSpacing(typo)

    return `TypographyStyle(font: ${fontExpr}, tracking: ${tracking}, lineSpacing: ${lineSpacing})`
  }

  private buildFontExpression(typo: Record<string, unknown>, size: string, weight: string): string {
    if (typo.fontFamily != null) {
      const family = Array.isArray(typo.fontFamily) ? typo.fontFamily[0] : typo.fontFamily
      if (typeof family === 'string') {
        return `Font.custom("${this.escapeSwiftString(family)}", size: ${size}).weight(${weight})`
      }
    }

    return `Font.system(size: ${size}, weight: ${weight})`
  }

  private extractTracking(typo: Record<string, unknown>): string {
    if (!isDimensionObject(typo.letterSpacing)) {
      return '0'
    }
    return this.dimensionToPoints(typo.letterSpacing as DimensionValue)
  }

  private extractLineSpacing(typo: Record<string, unknown>): string {
    if (typo.lineHeight == null || typeof typo.lineHeight !== 'number') {
      return '0'
    }
    if (!isDimensionObject(typo.fontSize)) {
      return '0'
    }
    const basePt = this.dimensionToNumericPoints(typo.fontSize as DimensionValue)
    const lineHeightPt = Math.round(basePt * typo.lineHeight * 100) / 100
    return String(lineHeightPt - basePt)
  }

  private dimensionToNumericPoints(dim: DimensionValue): number {
    return dim.unit === 'rem' ? dim.value * 16 : dim.value
  }

  private dimensionToPoints(dim: DimensionValue): string {
    return String(this.dimensionToNumericPoints(dim))
  }

  /** Formats a dimension as a CGFloat literal (appends `.0` for integers). */
  private dimensionToCGFloat(dim: DimensionValue): string {
    const ptValue = this.dimensionToNumericPoints(dim)
    return Number.isInteger(ptValue) ? `${ptValue}.0` : String(ptValue)
  }

  private getTypeAnnotation(token: ResolvedToken): string | undefined {
    switch (token.$type) {
      case 'dimension':
        return 'CGFloat'
      case 'duration':
        return 'TimeInterval'
      case 'number':
        return 'Double'
      case 'fontWeight':
        return 'Font.Weight'
      case 'fontFamily':
        return 'String'
      default:
        return undefined
    }
  }

  private escapeSwiftString(str: string): string {
    return str.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n')
  }

  private roundComponent(value: number): number {
    return Math.round(value * 10000) / 10000
  }

  /**
   * Returns the prefix for `static let` declarations.
   * Swift 6 requires `nonisolated(unsafe)` on global stored properties.
   */
  private staticLetPrefix(options: Required<IosRendererOptions>): string {
    return options.swiftVersion === '6.0' ? 'nonisolated(unsafe) static let ' : 'static let '
  }

  /** Returns `@frozen ` when the frozen option is enabled, empty string otherwise. */
  private frozenPrefix(options: Required<IosRendererOptions>): string {
    return options.frozen ? '@frozen ' : ''
  }

  /** Returns `: Sendable` when targeting Swift 6, empty string otherwise. */
  private structConformances(options: Required<IosRendererOptions>): string {
    return options.swiftVersion === '6.0' ? ': Sendable' : ''
  }

  /** Emits all struct definitions needed by the token set. */
  private buildStructDefinitions(
    tokens: ResolvedTokens,
    access: string,
    options: Required<IosRendererOptions>,
  ): string[] {
    const lines: string[] = []

    if (Object.values(tokens).some(isShadowToken)) {
      lines.push('')
      lines.push(...this.buildShadowStyleStruct(access, options))
    }

    if (Object.values(tokens).some(isTypographyToken)) {
      lines.push('')
      lines.push(...this.buildTypographyStyleStruct(access, options))
    }

    if (Object.values(tokens).some(isBorderToken)) {
      lines.push('')
      lines.push(...this.buildBorderStyleStruct(access, options))
    }

    return lines
  }

  private buildShadowStyleStruct(access: string, options: Required<IosRendererOptions>): string[] {
    const i1 = indentStr(options.indent, 1)
    const conformances = this.structConformances(options)
    const frozen = this.frozenPrefix(options)
    return [
      `${frozen}${access} struct ShadowStyle${conformances} {`,
      `${i1}${access} let color: Color`,
      `${i1}${access} let radius: CGFloat`,
      `${i1}${access} let x: CGFloat`,
      `${i1}${access} let y: CGFloat`,
      `${i1}${access} let spread: CGFloat`,
      '}',
    ]
  }

  private buildTypographyStyleStruct(
    access: string,
    options: Required<IosRendererOptions>,
  ): string[] {
    const i1 = indentStr(options.indent, 1)
    const conformances = this.structConformances(options)
    const frozen = this.frozenPrefix(options)
    return [
      `${frozen}${access} struct TypographyStyle${conformances} {`,
      `${i1}${access} let font: Font`,
      `${i1}${access} let tracking: CGFloat`,
      `${i1}${access} let lineSpacing: CGFloat`,
      '}',
    ]
  }

  private buildBorderStyleStruct(access: string, options: Required<IosRendererOptions>): string[] {
    const i1 = indentStr(options.indent, 1)
    const conformances = this.structConformances(options)
    const frozen = this.frozenPrefix(options)
    return [
      `${frozen}${access} struct BorderStyle${conformances} {`,
      `${i1}${access} let color: Color`,
      `${i1}${access} let width: CGFloat`,
      '}',
    ]
  }

  /** Emits convenience View extensions for shadow and typography application. */
  private buildViewExtensions(
    tokens: ResolvedTokens,
    access: string,
    options: Required<IosRendererOptions>,
  ): string[] {
    const lines: string[] = []
    const i1 = indentStr(options.indent, 1)
    const i2 = indentStr(options.indent, 2)

    if (Object.values(tokens).some(isShadowToken)) {
      lines.push('')
      lines.push(`${access} extension View {`)
      lines.push(`${i1}func shadowStyle(_ style: ShadowStyle) -> some View {`)
      lines.push(
        `${i2}self.shadow(color: style.color, radius: style.radius, x: style.x, y: style.y)`,
      )
      lines.push(`${i1}}`)
      lines.push('}')
    }

    if (Object.values(tokens).some(isTypographyToken)) {
      lines.push('')
      lines.push(`${access} extension View {`)
      lines.push(`${i1}func typographyStyle(_ style: TypographyStyle) -> some View {`)
      lines.push(
        `${i2}self.font(style.font).tracking(style.tracking).lineSpacing(style.lineSpacing)`,
      )
      lines.push(`${i1}}`)
      lines.push('}')
    }

    return lines
  }

  private formatBorderValue(value: unknown, options: Required<IosRendererOptions>): string {
    if (typeof value !== 'object' || value === null) {
      return 'BorderStyle(color: .clear, width: 0)'
    }

    const border = value as Record<string, unknown>

    const color = isColorObject(border.color)
      ? this.formatColorValue(border.color, options)
      : 'Color.clear'

    const width = isDimensionObject(border.width)
      ? this.dimensionToCGFloat(border.width as DimensionValue)
      : '1.0'

    return `BorderStyle(color: ${color}, width: ${width})`
  }

  private formatGradientValue(value: unknown, options: Required<IosRendererOptions>): string {
    if (!Array.isArray(value) || value.length === 0) {
      return 'Gradient(stops: [])'
    }

    const stops = (value as GradientStop[]).map((stop) => {
      const color = isColorObject(stop.color)
        ? this.formatColorValue(stop.color, options)
        : 'Color.clear'
      return `.init(color: ${color}, location: ${stop.position})`
    })

    return `Gradient(stops: [${stops.join(', ')}])`
  }

  private async formatStandalone(
    context: RenderContext,
    options: Required<IosRendererOptions>,
  ): Promise<RenderOutput> {
    assertFileRequired(
      context.buildPath,
      context.output.file,
      context.output.name,
      'standalone iOS',
    )

    const files: Record<string, string> = {}
    for (const { tokens, modifierInputs } of context.permutations) {
      const processedTokens = stripInternalMetadata(tokens)
      const content = this.formatTokens(processedTokens, options)
      const fileName = context.output.file
        ? resolveFileName(context.output.file, modifierInputs)
        : buildInMemoryOutputKey({
            outputName: context.output.name,
            extension: 'swift',
            modifierInputs,
            resolver: context.resolver,
            defaults: context.meta.defaults,
          })
      files[fileName] = content
    }

    return outputTree(files)
  }
}

/**
 * iOS/SwiftUI renderer factory function.
 *
 * @example
 * ```typescript
 * outputs: [{
 *   name: 'ios',
 *   renderer: iosRenderer(),
 *   options: {
 *     accessLevel: 'public',
 *     structure: 'enum',  // or 'grouped' for extension-based layout
 *     enumName: 'DesignTokens',
 *     colorSpace: 'sRGB',
 *   },
 *   file: 'DesignTokens-{theme}.swift'
 * }]
 * ```
 */
export function iosRenderer(): Renderer<IosRendererOptions> {
  const rendererInstance = new IosRenderer()
  return {
    format: (context, options) =>
      rendererInstance.format(
        context,
        options ?? (context.output.options as IosRendererOptions | undefined),
      ),
  }
}
