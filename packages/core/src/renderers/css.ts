/**
 * @fileoverview CSS renderer with theme selector support
 * Supports DTCG 2025.10 color and dimension object formats
 */

import { colorObjectToHex, isColorObject } from '@processing/transforms/built-in/color-converter'
import {
  dimensionObjectToString,
  isDimensionObject,
} from '@processing/transforms/built-in/dimension-converter'
import {
  durationObjectToString,
  isDurationObject,
} from '@processing/transforms/built-in/duration-converter'
import { ConfigurationError } from '@shared/errors/index'
import {
  formatDeprecationMessage,
  getPureAliasReferenceName,
  getSortedTokenEntries,
} from '@shared/utils/token-utils'
import type {
  DimensionValue,
  DurationValue,
  ResolvedToken,
  ResolvedTokens,
  ShadowValueObject,
} from '@tokens/types'
import prettier from 'prettier'

import { buildSetLayerBlocks, bundleAsCss } from './bundlers/css'
import {
  assertFileRequired,
  buildInMemoryOutputKey,
  filterTokensBySource,
  filterTokensFromSets,
  isBasePermutation,
  normalizeModifierInputs,
  resolveBaseFileName,
  resolveMediaQuery,
  resolveFileName,
  resolveSelector,
  stripInternalMetadata,
} from './bundlers/utils'
import type { CssRendererOptions, RenderContext, RenderOutput, Renderer } from './types'

type ResolvedCssOptions = Omit<CssRendererOptions, 'selector' | 'mediaQuery'> & {
  selector?: string
  mediaQuery?: string
  referenceTokens?: ResolvedTokens
}

type CssEntry = {
  name: string
  value: string
}

type CompositeLeaf = {
  path: string[]
  value: unknown
}

export class CssRenderer implements Renderer<CssRendererOptions> {
  private sanitizeCssCommentText(text: string): string {
    return text.replace(/\*\//g, '*\\/').replace(/\r?\n/g, ' ').trim()
  }

  async format(context: RenderContext, options?: CssRendererOptions): Promise<RenderOutput> {
    const opts: CssRendererOptions = {
      preset: options?.preset ?? 'bundle',
      selector: options?.selector,
      mediaQuery: options?.mediaQuery,
      minify: options?.minify ?? false,
      preserveReferences: options?.preserveReferences ?? false,
    }

    if (opts.preset === 'bundle') {
      return await this.formatBundle(context, opts)
    }

    if (opts.preset === 'modifier') {
      return await this.formatModifier(context, opts)
    }

    return await this.formatStandalone(context, opts)
  }

  private static readonly PRETTIER_PRINT_WIDTH = 80
  private static readonly PRETTIER_TAB_WIDTH = 2

  /**
   * Format tokens as CSS custom properties
   *
   * Converts resolved design tokens into CSS format with configurable selector,
   * media queries, and formatting options. Supports DTCG color and dimension objects.
   *
   * Note: This method expects selector and mediaQuery to be resolved strings.
   * Function-based selectors should be resolved before calling format().
   *
   * @param tokens - Resolved tokens to format
   * @param options - CSS formatting options (selector, media query, minify, etc.)
   * @returns Formatted CSS string with custom properties
   */
  private async formatTokens(
    tokens: ResolvedTokens,
    options?: ResolvedCssOptions,
  ): Promise<string> {
    const opts = {
      preset: 'bundle' as const,
      selector: ':root',
      mediaQuery: '',
      minify: false,
      preserveReferences: false,
      ...options,
      referenceTokens: options?.referenceTokens ?? tokens,
    }

    const sortedTokens = getSortedTokenEntries(tokens).map(([, token]) => token)
    const referenceTokens = opts.referenceTokens
    const lines: string[] = []

    this.buildCssBlock(lines, sortedTokens, opts.selector, tokens, referenceTokens, opts)

    const cssString = lines.join('')
    return opts.minify ? cssString : await this.formatWithPrettier(cssString)
  }

  private buildCssBlock(
    lines: string[],
    groupTokens: ResolvedToken[],
    selector: string,
    tokens: ResolvedTokens,
    referenceTokens: ResolvedTokens,
    opts: Required<ResolvedCssOptions>,
  ): void {
    const indent = opts.minify ? '' : '  '
    const newline = opts.minify ? '' : '\n'
    const space = opts.minify ? '' : ' '
    const hasMediaQuery = opts.mediaQuery != null && opts.mediaQuery !== ''
    const tokenIndent = hasMediaQuery ? indent + indent : indent

    if (hasMediaQuery) {
      lines.push(`@media ${opts.mediaQuery}${space}{${newline}`)
      lines.push(`${indent}${selector}${space}{${newline}`)
    } else {
      lines.push(`${selector}${space}{${newline}`)
    }

    for (const token of groupTokens) {
      this.pushTokenLines(
        lines,
        token,
        tokens,
        referenceTokens,
        opts.preserveReferences ?? false,
        tokenIndent,
        newline,
        space,
      )
    }

    if (hasMediaQuery) {
      lines.push(`${indent}}${newline}`)
    }
    lines.push(`}${newline}${newline}`)
  }

  private pushTokenLines(
    lines: string[],
    token: ResolvedToken,
    tokens: ResolvedTokens,
    referenceTokens: ResolvedTokens,
    preserveReferences: boolean,
    indent: string,
    newline: string,
    space: string,
  ): void {
    const entries = this.buildCssEntries(token, tokens, referenceTokens, preserveReferences)

    if (token.$deprecated != null && token.$deprecated !== false) {
      const deprecationMsg = formatDeprecationMessage(token, '', 'comment')
      lines.push(`${indent}/* ${this.sanitizeCssCommentText(deprecationMsg)} */${newline}`)
    }

    if (token.$description && token.$description !== '') {
      lines.push(`${indent}/* ${this.sanitizeCssCommentText(token.$description)} */${newline}`)
    }

    for (const entry of entries) {
      lines.push(`${indent}--${entry.name}:${space}${entry.value};${newline}`)
    }
  }

  private async formatWithPrettier(css: string): Promise<string> {
    try {
      return await prettier.format(css, {
        parser: 'css',
        printWidth: CssRenderer.PRETTIER_PRINT_WIDTH,
        tabWidth: CssRenderer.PRETTIER_TAB_WIDTH,
        useTabs: false,
      })
    } catch {
      // Prettier may fail on edge-case CSS; fall back to raw string
      return css
    }
  }

  private buildCssEntries(
    token: ResolvedToken,
    tokens: ResolvedTokens,
    referenceTokens: ResolvedTokens,
    preserveReferences: boolean,
  ): CssEntry[] {
    if (preserveReferences) {
      const refName = getPureAliasReferenceName(token.originalValue)
      if (refName !== undefined) {
        return [
          {
            name: token.name,
            value: this.buildCssVarReference(refName, referenceTokens, tokens),
          },
        ]
      }
    }

    if (!this.isCompositeToken(token)) {
      return [{ name: token.name, value: this.formatValue(token) }]
    }

    const leaves = this.collectCompositeLeaves(token.$value)
    if (leaves.length === 0) {
      return [{ name: token.name, value: this.formatLeafValue(token.$value) }]
    }

    const leafEntries = leaves.map((leaf) => ({
      name: this.buildCompositeName(token.name, leaf.path),
      value: this.formatLeafValue(
        this.resolveCompositeLeafValue(
          leaf,
          token.originalValue,
          tokens,
          referenceTokens,
          preserveReferences,
        ),
      ),
    }))

    const wholeValue = this.buildCompositeWholeValue(token, preserveReferences)
    if (!wholeValue) {
      return leafEntries
    }

    return [{ name: token.name, value: wholeValue }, ...leafEntries]
  }

  private isCompositeToken(token: ResolvedToken): boolean {
    const isCompositeType = [
      'shadow',
      'typography',
      'border',
      'strokeStyle',
      'transition',
      'gradient',
    ].includes(token.$type ?? '')
    if (!isCompositeType) {
      return false
    }

    const value = token.$value
    return (typeof value === 'object' && value !== null) || Array.isArray(value)
  }

  private buildCompositeWholeValue(
    token: ResolvedToken,
    preserveReferences: boolean,
  ): string | undefined {
    if (token.$type === 'shadow') {
      // Shadow always supports a whole-value (single or multi-layer)
      return preserveReferences ? this.buildShadowWholeValue(token) : this.formatValue(token)
    }
    if (token.$type === 'border') {
      // Border shorthand only works when style is a simple string (e.g. "solid").
      // Complex strokeStyle objects can't be represented as a CSS shorthand.
      if (!this.hasBorderShorthandStyle(token)) {
        return undefined
      }
      return preserveReferences ? this.buildBorderWholeValue(token) : this.formatValue(token)
    }
    if (token.$type === 'transition') {
      return preserveReferences ? this.buildTransitionWholeValue(token) : this.formatValue(token)
    }
    return undefined
  }

  private hasBorderShorthandStyle(token: ResolvedToken): boolean {
    const value = token.$value
    if (typeof value !== 'object' || value === null) {
      return false
    }
    return typeof (value as { style?: unknown }).style === 'string'
  }

  private buildShadowWholeValue(token: ResolvedToken): string | undefined {
    const value = token.$value
    if (Array.isArray(value)) {
      return value
        .map((shadow, index) => this.buildShadowLayerValue(token.name, shadow, [String(index)]))
        .join(', ')
    }
    if (typeof value === 'object' && value !== null) {
      return this.buildShadowLayerValue(token.name, value, [])
    }
    return undefined
  }

  private buildShadowLayerValue(baseName: string, shadow: unknown, prefix: string[]): string {
    if (typeof shadow !== 'object' || shadow === null) {
      return String(shadow)
    }
    const shadowObj = shadow as ShadowValueObject
    const parts: string[] = []

    if (shadowObj.inset === true) {
      parts.push('inset')
    }

    parts.push(this.buildCompositeVar(baseName, [...prefix, 'offsetX']))
    parts.push(this.buildCompositeVar(baseName, [...prefix, 'offsetY']))
    parts.push(this.buildCompositeVar(baseName, [...prefix, 'blur']))

    if (shadowObj.spread != null) {
      parts.push(this.buildCompositeVar(baseName, [...prefix, 'spread']))
    }

    parts.push(this.buildCompositeVar(baseName, [...prefix, 'color']))
    return parts.join(' ')
  }

  private buildBorderWholeValue(token: ResolvedToken): string | undefined {
    const value = token.$value
    if (typeof value !== 'object' || value === null) {
      return undefined
    }
    const border = value as { style?: unknown }
    if (typeof border.style !== 'string') {
      return undefined
    }
    return [
      this.buildCompositeVar(token.name, ['width']),
      this.buildCompositeVar(token.name, ['style']),
      this.buildCompositeVar(token.name, ['color']),
    ].join(' ')
  }

  private buildTransitionWholeValue(token: ResolvedToken): string | undefined {
    const value = token.$value
    if (typeof value !== 'object' || value === null) {
      return undefined
    }
    return [
      this.buildCompositeVar(token.name, ['duration']),
      `cubic-bezier(${this.buildCompositeVar(token.name, ['timingFunction', '0'])}, ${this.buildCompositeVar(token.name, ['timingFunction', '1'])}, ${this.buildCompositeVar(token.name, ['timingFunction', '2'])}, ${this.buildCompositeVar(token.name, ['timingFunction', '3'])})`,
      this.buildCompositeVar(token.name, ['delay']),
    ].join(' ')
  }

  private buildCompositeVar(baseName: string, path: string[]): string {
    return `var(--${this.buildCompositeName(baseName, path)})`
  }

  private collectCompositeLeaves(value: unknown): CompositeLeaf[] {
    const leaves: CompositeLeaf[] = []
    this.collectLeafEntries(value, [], leaves)
    return leaves
  }

  private collectLeafEntries(value: unknown, path: string[], leaves: CompositeLeaf[]): void {
    if (this.isPrimitiveValue(value)) {
      leaves.push({ path, value })
      return
    }

    if (isColorObject(value) || isDimensionObject(value) || isDurationObject(value)) {
      leaves.push({ path, value })
      return
    }

    if (Array.isArray(value)) {
      if (value.length === 0) {
        leaves.push({ path, value })
        return
      }
      value.forEach((item, index) => {
        this.collectLeafEntries(item, [...path, String(index)], leaves)
      })
      return
    }

    if (typeof value === 'object' && value !== null) {
      const entries = Object.entries(value)
      if (entries.length === 0) {
        leaves.push({ path, value })
        return
      }
      for (const [key, child] of entries) {
        this.collectLeafEntries(child, [...path, this.normalizePathSegment(key)], leaves)
      }
      return
    }

    leaves.push({ path, value })
  }

  private normalizePathSegment(segment: string): string {
    return segment.trim().replace(/\s+/g, '-')
  }

  private buildCompositeName(base: string, path: string[]): string {
    if (path.length === 0) {
      return base
    }
    return `${base}-${path.join('-')}`
  }

  private formatLeafValue(value: unknown): string {
    if (isColorObject(value)) {
      return colorObjectToHex(value)
    }

    if (isDimensionObject(value)) {
      return dimensionObjectToString(value)
    }

    if (isDurationObject(value)) {
      return durationObjectToString(value)
    }

    if (typeof value === 'string') {
      return value
    }

    if (typeof value === 'number' || typeof value === 'boolean') {
      return String(value)
    }

    if (Array.isArray(value)) {
      return JSON.stringify(value)
    }

    if (typeof value === 'object' && value != null) {
      return JSON.stringify(value)
    }

    return String(value)
  }

  private resolveCompositeLeafValue(
    leaf: CompositeLeaf,
    originalValue: unknown,
    tokens: ResolvedTokens,
    referenceTokens: ResolvedTokens,
    preserveReferences: boolean,
  ): unknown {
    if (!preserveReferences) {
      return leaf.value
    }

    const originalLeafValue = this.getOriginalLeafValue(originalValue, leaf.path)
    const refName = getPureAliasReferenceName(originalLeafValue)
    if (refName === undefined) {
      return leaf.value
    }

    return this.buildCssVarReference(refName, referenceTokens, tokens)
  }

  private buildCssVarReference(
    refName: string,
    referenceTokens: ResolvedTokens,
    tokens: ResolvedTokens,
  ): string {
    const referencedToken = referenceTokens[refName] ?? tokens[refName]
    if (!referencedToken) {
      throw new ConfigurationError(
        `CSS reference "{${refName}}" could not be resolved. The referenced token is not present in the current output's token set. ` +
          `This usually means a filter (e.g. isAlias()) excluded the referenced token while preserveReferences is true. ` +
          `Either remove the filter, include the referenced token, or set preserveReferences to false.`,
      )
    }
    return `var(--${referencedToken.name})`
  }

  private getOriginalLeafValue(value: unknown, path: string[]): unknown {
    let current: unknown = value

    for (const segment of path) {
      if (Array.isArray(current)) {
        const index = Number(segment)
        if (!Number.isInteger(index)) {
          return undefined
        }
        current = current[index]
        continue
      }

      if (typeof current === 'object' && current !== null) {
        const entries = Object.entries(current)
        const matched = entries.find(([key]) => this.normalizePathSegment(key) === segment)
        if (!matched) {
          return undefined
        }
        current = matched[1]
        continue
      }

      return undefined
    }

    return current
  }

  private isPrimitiveValue(value: unknown): boolean {
    return typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean'
  }

  /**
   * Format token value for CSS
   * Handles DTCG 2025.10 object formats for colors and dimensions
   */
  private formatValue(token: ResolvedToken): string {
    const value = token.$value

    const typed = this.formatTypedValue(token.$type, value)
    if (typed !== undefined) {
      return typed
    }

    return this.formatPrimitiveOrStructured(value, token.$type)
  }

  private formatTypedValue(type: string | undefined, value: unknown): string | undefined {
    if (type === 'color' && isColorObject(value)) {
      return colorObjectToHex(value)
    }

    if (type === 'dimension') {
      // Legacy fallback: string values from incomplete alias resolution
      return typeof value === 'string' ? value : dimensionObjectToString(value as DimensionValue)
    }

    if (type === 'duration') {
      if (isDurationObject(value)) {
        return durationObjectToString(value)
      }
      if (typeof value === 'string') {
        return value
      }
    }

    return undefined
  }

  private formatPrimitiveOrStructured(value: unknown, tokenType?: string): string {
    if (typeof value === 'string') {
      return value
    }
    if (typeof value === 'number') {
      return String(value)
    }
    if (Array.isArray(value)) {
      return this.formatArrayValue(value, tokenType)
    }
    if (typeof value === 'object' && value != null) {
      return this.formatCompositeValue(value as Record<string, unknown>, tokenType)
    }
    return String(value)
  }

  private formatArrayValue(value: unknown[], tokenType?: string): string {
    if (tokenType === 'shadow' && value.length > 0 && typeof value[0] === 'object') {
      return value
        .map((shadowObj) => this.formatShadow(shadowObj as unknown as ShadowValueObject))
        .join(', ')
    }
    // For arrays like font families
    return value.map((v) => (typeof v === 'string' && v.includes(' ') ? `"${v}"` : v)).join(', ')
  }

  /**
   * Format composite token values
   */
  private formatCompositeValue(value: Record<string, unknown>, tokenType?: string): string {
    if (tokenType === 'shadow') {
      return this.formatShadow(value as unknown as ShadowValueObject)
    }

    if (tokenType === 'border') {
      return this.formatBorder(value)
    }

    if (tokenType === 'transition') {
      return this.formatTransition(value)
    }

    // Default: JSON stringify (for debugging or unsupported types)
    return JSON.stringify(value)
  }

  /**
   * Format a single shadow object to CSS box-shadow syntax
   */
  private formatShadow(shadow: ShadowValueObject): string {
    const parts: string[] = []
    if (shadow.inset === true) {
      parts.push('inset')
    }

    // Enforce DTCG 2025.10 compliance: all dimension values must be objects

    parts.push(dimensionObjectToString(shadow.offsetX))
    parts.push(dimensionObjectToString(shadow.offsetY))
    parts.push(dimensionObjectToString(shadow.blur))

    if (shadow.spread != null) {
      parts.push(dimensionObjectToString(shadow.spread))
    }

    // Handle color objects (DTCG format)
    if (isColorObject(shadow.color)) {
      parts.push(colorObjectToHex(shadow.color))
    } else {
      parts.push(String(shadow.color))
    }

    return parts.join(' ')
  }

  /**
   * Format a border object to CSS border shorthand syntax
   */
  private formatBorder(value: Record<string, unknown>): string {
    const parts: string[] = []

    if (isDimensionObject(value.width)) {
      parts.push(dimensionObjectToString(value.width as DimensionValue))
    } else if (value.width != null) {
      parts.push(String(value.width))
    }

    if (typeof value.style === 'string') {
      parts.push(value.style)
    }

    if (isColorObject(value.color)) {
      parts.push(colorObjectToHex(value.color))
    } else if (value.color != null) {
      parts.push(String(value.color))
    }

    return parts.join(' ')
  }

  /**
   * Format a transition object to CSS transition shorthand syntax
   */
  private formatTransition(value: Record<string, unknown>): string {
    const parts: string[] = []

    if (isDurationObject(value.duration)) {
      parts.push(durationObjectToString(value.duration as DurationValue))
    } else if (value.duration != null) {
      parts.push(String(value.duration))
    }

    if (Array.isArray(value.timingFunction) && value.timingFunction.length === 4) {
      parts.push(`cubic-bezier(${value.timingFunction.join(', ')})`)
    }

    if (isDurationObject(value.delay)) {
      parts.push(durationObjectToString(value.delay as DurationValue))
    } else if (value.delay != null) {
      parts.push(String(value.delay))
    }

    return parts.join(' ')
  }

  private async formatBundle(context: RenderContext, options: CssRendererOptions): Promise<string> {
    const bundleData = context.permutations.map(({ tokens, modifierInputs }) => ({
      tokens,
      modifierInputs,
      isBase: isBasePermutation(modifierInputs, context.meta.defaults),
    }))

    return await bundleAsCss(bundleData, context.resolver, options, async (tokens, resolved) => {
      return await this.formatTokens(tokens, {
        ...resolved,
        preserveReferences: options.preserveReferences ?? false,
      })
    })
  }

  private async formatStandalone(
    context: RenderContext,
    options: CssRendererOptions,
  ): Promise<RenderOutput> {
    assertFileRequired(
      context.buildPath,
      context.output.file,
      context.output.name,
      'standalone CSS',
    )

    const files: Record<string, string> = {}
    for (const { tokens, modifierInputs } of context.permutations) {
      const { fileName, content } = await this.buildStandaloneFile(
        tokens,
        modifierInputs,
        context,
        options,
      )
      files[fileName] = content
    }

    return { kind: 'outputTree', files }
  }

  private async buildStandaloneFile(
    tokens: ResolvedTokens,
    modifierInputs: Record<string, string>,
    context: RenderContext,
    options: CssRendererOptions,
  ): Promise<{ fileName: string; content: string }> {
    const isBase = isBasePermutation(modifierInputs, context.meta.defaults)
    const { modifierName, modifierContext } = this.resolveModifierContext(
      modifierInputs,
      context,
      isBase,
    )

    const selector = resolveSelector(
      options.selector,
      modifierName,
      modifierContext,
      isBase,
      modifierInputs,
    )
    const mediaQuery = resolveMediaQuery(
      options.mediaQuery,
      modifierName,
      modifierContext,
      isBase,
      modifierInputs,
    )

    const content = await this.formatTokens(tokens, {
      selector,
      mediaQuery,
      minify: options.minify ?? false,
      preserveReferences: options.preserveReferences ?? false,
      referenceTokens: tokens,
    })

    const fileName = context.output.file
      ? resolveFileName(context.output.file, modifierInputs)
      : buildInMemoryOutputKey({
          outputName: context.output.name,
          extension: 'css',
          modifierInputs,
          resolver: context.resolver,
          defaults: context.meta.defaults,
        })

    return { fileName, content }
  }

  private async formatModifier(
    context: RenderContext,
    options: CssRendererOptions,
  ): Promise<RenderOutput> {
    assertFileRequired(context.buildPath, context.output.file, context.output.name, 'modifier CSS')
    if (!context.resolver.modifiers) {
      throw new ConfigurationError('Modifier preset requires modifiers to be defined in resolver')
    }

    const files: Record<string, string> = {}

    const baseResult = await this.buildModifierBaseFile(context, options)
    if (baseResult) {
      files[baseResult.fileName] = baseResult.content
    }

    for (const [modifierName, modifierDef] of Object.entries(context.resolver.modifiers)) {
      for (const contextValue of Object.keys(modifierDef.contexts)) {
        const result = await this.buildModifierContextFile(
          modifierName,
          contextValue,
          context,
          options,
        )
        if (result) {
          files[result.fileName] = result.content
        }
      }
    }

    return { kind: 'outputTree', files }
  }

  private async buildModifierBaseFile(
    context: RenderContext,
    options: CssRendererOptions,
  ): Promise<{ fileName: string; content: string } | undefined> {
    const basePermutation = context.permutations.find(({ modifierInputs }) =>
      isBasePermutation(modifierInputs, context.meta.defaults),
    )
    if (!basePermutation) {
      return undefined
    }

    const setTokens = filterTokensFromSets(basePermutation.tokens)
    if (Object.keys(setTokens).length === 0) {
      return undefined
    }

    const setBlocks = buildSetLayerBlocks(setTokens, context.resolver)
    if (setBlocks.length === 0) {
      return undefined
    }

    const { selector, mediaQuery } = this.resolveBaseModifierContext(context, options)
    const content = await this.formatSetBlocksCss(
      setBlocks,
      basePermutation.tokens,
      selector,
      mediaQuery,
      options,
    )

    const fileName = context.output.file
      ? resolveBaseFileName(context.output.file, context.meta.defaults)
      : `${context.output.name}-base.css`

    return { fileName, content }
  }

  private resolveBaseModifierContext(
    context: RenderContext,
    options: CssRendererOptions,
  ): { selector: string; mediaQuery: string } {
    const modifiers = context.resolver.modifiers!
    const firstModifierName = Object.keys(modifiers)[0] ?? ''
    const firstModifierContext = context.meta.defaults[firstModifierName] ?? ''
    const baseModifierInputs = { ...context.meta.defaults }

    return {
      selector: resolveSelector(
        options.selector,
        firstModifierName,
        firstModifierContext,
        true,
        baseModifierInputs,
      ),
      mediaQuery: resolveMediaQuery(
        options.mediaQuery,
        firstModifierName,
        firstModifierContext,
        true,
        baseModifierInputs,
      ),
    }
  }

  private async formatSetBlocksCss(
    setBlocks: ReturnType<typeof buildSetLayerBlocks>,
    referenceTokens: ResolvedTokens,
    selector: string,
    mediaQuery: string,
    options: CssRendererOptions,
  ): Promise<string> {
    const cssBlocks: string[] = []
    for (const block of setBlocks) {
      const cleanTokens = stripInternalMetadata(block.tokens)
      const css = await this.formatTokens(cleanTokens, {
        selector,
        mediaQuery,
        minify: options.minify ?? false,
        preserveReferences: options.preserveReferences ?? false,
        referenceTokens,
      })
      const header = block.description
        ? `/* ${block.key} */\n/* ${block.description} */`
        : `/* ${block.key} */`
      cssBlocks.push(`${header}\n${css}`)
    }
    return cssBlocks.join('\n')
  }

  private collectTokensForModifierContext(
    modifierName: string,
    contextValue: string,
    permutations: RenderContext['permutations'],
  ): { tokensFromSource: ResolvedTokens; referenceTokens: ResolvedTokens } {
    const expectedSource = `${modifierName}-${contextValue}`
    let tokensFromSource: ResolvedTokens = {}
    let referenceTokens: ResolvedTokens = {}

    for (const { tokens, modifierInputs } of permutations) {
      if (modifierInputs[modifierName] !== contextValue) {
        continue
      }
      tokensFromSource = { ...tokensFromSource, ...filterTokensBySource(tokens, expectedSource) }
      referenceTokens = { ...referenceTokens, ...tokens }
    }

    return { tokensFromSource, referenceTokens }
  }

  private async buildModifierContextFile(
    modifierName: string,
    contextValue: string,
    context: RenderContext,
    options: CssRendererOptions,
  ): Promise<{ fileName: string; content: string } | undefined> {
    const { tokensFromSource, referenceTokens } = this.collectTokensForModifierContext(
      modifierName,
      contextValue,
      context.permutations,
    )

    if (Object.keys(tokensFromSource).length === 0) {
      return undefined
    }

    const defaults = context.meta.defaults
    const isBase = contextValue === defaults[modifierName]
    const modifierInputs = { ...defaults, [modifierName]: contextValue }

    const selector = resolveSelector(
      options.selector,
      modifierName,
      contextValue,
      isBase,
      modifierInputs,
    )
    const mediaQuery = resolveMediaQuery(
      options.mediaQuery,
      modifierName,
      contextValue,
      isBase,
      modifierInputs,
    )

    const content = await this.formatTokens(tokensFromSource, {
      selector,
      mediaQuery,
      minify: options.minify ?? false,
      preserveReferences: options.preserveReferences ?? false,
      referenceTokens,
    })

    const fileName = context.output.file
      ? resolveFileName(context.output.file, modifierInputs)
      : buildInMemoryOutputKey({
          outputName: context.output.name,
          extension: 'css',
          modifierInputs,
          resolver: context.resolver,
          defaults: context.meta.defaults,
        })

    return { fileName, content }
  }

  private resolveModifierContext(
    modifierInputs: Record<string, string>,
    context: RenderContext,
    isBase: boolean,
  ): { modifierName: string; modifierContext: string } {
    if (!context.resolver.modifiers) {
      return { modifierName: '', modifierContext: '' }
    }

    const normalizedInputs = normalizeModifierInputs(modifierInputs)
    const normalizedDefaults = normalizeModifierInputs(context.meta.defaults)

    if (isBase) {
      const firstModifier = Object.keys(context.resolver.modifiers)[0] ?? ''
      return {
        modifierName: firstModifier,
        modifierContext: normalizedInputs[firstModifier] ?? '',
      }
    }

    for (const [name, value] of Object.entries(normalizedInputs)) {
      if (value !== normalizedDefaults[name]) {
        return { modifierName: name, modifierContext: value }
      }
    }

    return { modifierName: '', modifierContext: '' }
  }
}

/**
 * CSS renderer factory function.
 *
 * Options are provided via OutputConfig.options.
 *
 * @example
 * ```typescript
 * outputs: [{
 *   name: 'css',
 *   renderer: cssRenderer(),
 *   options: {
 *     preset: 'bundle',
 *     selector: ':root',
 *     mediaQuery: (modifierName, context) => {
 *       if (modifierName === 'breakpoint' && context === 'mobile') {
 *         return '(max-width: 768px)'
 *       }
 *       return ''
 *     }
 *   },
 *   file: 'tokens.css'
 * }]
 * ```
 */
export function cssRenderer(): Renderer<CssRendererOptions> {
  const rendererInstance = new CssRenderer()
  return {
    format: (context, options) =>
      rendererInstance.format(
        context,
        options ?? (context.output.options as CssRendererOptions | undefined),
      ),
  }
}
