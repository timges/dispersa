/**
 * @license MIT
 * Copyright (c) 2025-present Dispersa Contributors
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

/**
 * @fileoverview Tailwind CSS v4 renderer using @theme directive
 * Generates CSS with @theme blocks for Tailwind v4+ design token integration
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
import { getSortedTokenEntries } from '@shared/utils/token-utils'
import type { DimensionValue, ResolvedToken, ResolvedTokens } from '@tokens/types'
import prettier from 'prettier'

import { bundleAsTailwind } from './bundlers/tailwind'
import {
  assertFileRequired,
  buildInMemoryOutputKey,
  isBasePermutation,
  resolveFileName,
  stripInternalMetadata,
} from './bundlers/utils'
import { buildTokenDeprecationComment, buildTokenDescriptionComment } from './metadata'
import { outputTree } from './output-tree'
import type {
  MediaQueryFunction,
  RenderContext,
  RenderOutput,
  Renderer,
  SelectorFunction,
} from './types'

/**
 * Options for Tailwind CSS v4 renderer
 *
 * Controls how tokens are converted to Tailwind v4 @theme CSS variables.
 *
 * @example Bundle with dark mode overrides
 * ```typescript
 * tailwind({
 *   name: 'tailwind',
 *   file: 'theme.css',
 *   preset: 'bundle',
 *   selector: (modifier, context, isBase) => {
 *     if (isBase) return ':root'
 *     return `[data-${modifier}="${context}"]`
 *   },
 * })
 * ```
 */
export type TailwindRendererOptions = {
  preset?: 'bundle' | 'standalone'
  includeImport?: boolean
  namespace?: string
  minify?: boolean
  selector?: string | SelectorFunction
  mediaQuery?: string | MediaQueryFunction
}

/**
 * Mapping from DTCG token types to Tailwind v4 CSS variable namespace prefixes
 */
const TAILWIND_NAMESPACE_MAP: Record<string, string> = {
  color: 'color',
  dimension: 'spacing',
  fontFamily: 'font',
  fontWeight: 'font-weight',
  duration: 'duration',
  shadow: 'shadow',
  number: 'number',
  cubicBezier: 'ease',
}

/**
 * Resolved Tailwind options with required base fields.
 * selector and mediaQuery remain optional (only used in bundle mode).
 * variantDeclarations is populated by the bundler from non-base permutations.
 */
type ResolvedTailwindOptions = {
  preset: 'bundle' | 'standalone'
  includeImport: boolean
  namespace: string
  minify: boolean
  selector?: string | SelectorFunction
  mediaQuery?: string | MediaQueryFunction
  variantDeclarations: string[]
}

export class TailwindRenderer implements Renderer<TailwindRendererOptions> {
  async format(context: RenderContext, options?: TailwindRendererOptions): Promise<RenderOutput> {
    const opts: ResolvedTailwindOptions = {
      preset: options?.preset ?? 'bundle',
      includeImport: options?.includeImport ?? true,
      namespace: options?.namespace ?? '',
      minify: options?.minify ?? false,
      selector: options?.selector,
      mediaQuery: options?.mediaQuery,
      variantDeclarations: [],
    }

    if (opts.preset === 'bundle') {
      return await this.formatBundle(context, opts)
    }

    return await this.formatStandalone(context, opts)
  }

  /**
   * Format tokens as Tailwind v4 @theme CSS variables
   */
  async formatTokens(tokens: ResolvedTokens, options: ResolvedTailwindOptions): Promise<string> {
    const lines: string[] = []
    const indent = options.minify ? '' : '  '
    const newline = options.minify ? '' : '\n'
    const space = options.minify ? '' : ' '

    if (options.includeImport) {
      lines.push(`@import "tailwindcss";${newline}`)
    }

    // Emit @custom-variant declarations (auto-derived from non-base modifiers)
    if (options.variantDeclarations.length > 0) {
      if (options.includeImport) {
        lines.push(newline)
      }
      for (const declaration of options.variantDeclarations) {
        lines.push(`${declaration}${newline}`)
      }
    }

    if (options.includeImport || options.variantDeclarations.length > 0) {
      lines.push(newline)
    }

    const themeDirective = options.namespace ? `@theme namespace(${options.namespace})` : '@theme'

    lines.push(`${themeDirective}${space}{${newline}`)

    for (const [, token] of getSortedTokenEntries(tokens)) {
      const varName = this.buildVariableName(token)
      const varValue = this.formatValue(token)

      const deprecationComment = buildTokenDeprecationComment(token, 'tailwind')
      if (deprecationComment) {
        lines.push(`${indent}${deprecationComment}${newline}`)
      }

      const descriptionComment = buildTokenDescriptionComment(token, 'tailwind')
      if (descriptionComment) {
        lines.push(`${indent}${descriptionComment}${newline}`)
      }

      lines.push(`${indent}--${varName}:${space}${varValue};${newline}`)
    }

    lines.push(`}${newline}`)

    const cssString = lines.join('')
    return options.minify ? cssString : await this.formatWithPrettier(cssString)
  }

  /**
   * Format tokens as plain CSS custom property overrides inside a selector block.
   * Used for modifier overrides (e.g., dark mode) appended after the @theme block.
   */
  async formatOverrideBlock(
    tokens: ResolvedTokens,
    selector: string,
    mediaQuery: string,
    minify: boolean,
  ): Promise<string> {
    const indent = minify ? '' : '  '
    const newline = minify ? '' : '\n'
    const space = minify ? '' : ' '
    const hasMediaQuery = mediaQuery !== ''
    const tokenIndent = hasMediaQuery ? indent + indent : indent

    const lines: string[] = []

    if (hasMediaQuery) {
      lines.push(`@media ${mediaQuery}${space}{${newline}`)
      lines.push(`${indent}${selector}${space}{${newline}`)
    } else {
      lines.push(`${selector}${space}{${newline}`)
    }

    for (const [, token] of getSortedTokenEntries(tokens)) {
      const varName = this.buildVariableName(token)
      const varValue = this.formatValue(token)

      const deprecationComment = buildTokenDeprecationComment(token, 'tailwind')
      if (deprecationComment) {
        lines.push(`${tokenIndent}${deprecationComment}${newline}`)
      }

      const descriptionComment = buildTokenDescriptionComment(token, 'tailwind')
      if (descriptionComment) {
        lines.push(`${tokenIndent}${descriptionComment}${newline}`)
      }

      lines.push(`${tokenIndent}--${varName}:${space}${varValue};${newline}`)
    }

    if (hasMediaQuery) {
      lines.push(`${indent}}${newline}`)
      lines.push(`}${newline}`)
    } else {
      lines.push(`}${newline}`)
    }

    return lines.join('')
  }

  private buildVariableName(token: ResolvedToken): string {
    const prefix = TAILWIND_NAMESPACE_MAP[token.$type ?? '']
    if (!prefix) {
      return token.name
    }

    // If token name already starts with the prefix, don't double-prefix
    const nameLower = token.name.toLowerCase()
    const prefixLower = prefix.toLowerCase()
    if (nameLower.startsWith(`${prefixLower}-`) || nameLower.startsWith(`${prefixLower}.`)) {
      return token.name
    }

    return `${prefix}-${token.name}`
  }

  private formatValue(token: ResolvedToken): string {
    const value = token.$value

    if (token.$type === 'color' && isColorObject(value)) {
      return colorObjectToHex(value)
    }

    if (token.$type === 'dimension' && isDimensionObject(value)) {
      return dimensionObjectToString(value as DimensionValue)
    }

    if (token.$type === 'duration' && isDurationObject(value)) {
      return durationObjectToString(value)
    }

    if (token.$type === 'fontFamily') {
      if (Array.isArray(value)) {
        return value
          .map((v) => (typeof v === 'string' && v.includes(' ') ? `"${v}"` : v))
          .join(', ')
      }
      return typeof value === 'string' ? value : String(value)
    }

    if (token.$type === 'shadow') {
      return this.formatShadowValue(value)
    }

    if (token.$type === 'cubicBezier' && Array.isArray(value) && value.length === 4) {
      return `cubic-bezier(${value.join(', ')})`
    }

    if (typeof value === 'string') {
      return value
    }

    if (typeof value === 'number') {
      return String(value)
    }

    return String(value)
  }

  private formatShadowValue(value: unknown): string {
    if (Array.isArray(value) && value.length > 0 && typeof value[0] === 'object') {
      return value.map((s) => this.formatSingleShadow(s as Record<string, unknown>)).join(', ')
    }

    if (typeof value === 'object' && value !== null) {
      return this.formatSingleShadow(value as Record<string, unknown>)
    }

    return String(value)
  }

  private formatSingleShadow(shadow: Record<string, unknown>): string {
    const parts: string[] = []

    if (shadow.inset === true) {
      parts.push('inset')
    }

    if (isDimensionObject(shadow.offsetX)) {
      parts.push(dimensionObjectToString(shadow.offsetX as DimensionValue))
    }
    if (isDimensionObject(shadow.offsetY)) {
      parts.push(dimensionObjectToString(shadow.offsetY as DimensionValue))
    }
    if (isDimensionObject(shadow.blur)) {
      parts.push(dimensionObjectToString(shadow.blur as DimensionValue))
    }
    if (shadow.spread != null && isDimensionObject(shadow.spread)) {
      parts.push(dimensionObjectToString(shadow.spread as DimensionValue))
    }
    if (isColorObject(shadow.color)) {
      parts.push(colorObjectToHex(shadow.color))
    } else if (shadow.color != null) {
      parts.push(String(shadow.color))
    }

    return parts.join(' ')
  }

  private async formatWithPrettier(css: string): Promise<string> {
    try {
      return await prettier.format(css, {
        parser: 'css',
        printWidth: 80,
        tabWidth: 2,
        useTabs: false,
      })
    } catch {
      return css
    }
  }

  private async formatBundle(
    context: RenderContext,
    options: ResolvedTailwindOptions,
  ): Promise<string> {
    const bundleData = context.permutations.map(({ tokens, modifierInputs }) => ({
      tokens,
      modifierInputs,
      isBase: isBasePermutation(modifierInputs, context.meta.defaults),
    }))

    return await bundleAsTailwind(
      bundleData,
      options,
      async (tokens, opts) => await this.formatTokens(tokens, opts),
      async (tokens, selector, mediaQuery, minify) =>
        await this.formatOverrideBlock(tokens, selector, mediaQuery, minify),
    )
  }

  private async formatStandalone(
    context: RenderContext,
    options: ResolvedTailwindOptions,
  ): Promise<RenderOutput> {
    assertFileRequired(
      context.buildPath,
      context.output.file,
      context.output.name,
      'standalone Tailwind',
    )

    const files: Record<string, string> = {}
    for (const { tokens, modifierInputs } of context.permutations) {
      const processedTokens = stripInternalMetadata(tokens)
      const content = await this.formatTokens(processedTokens, options)
      const fileName = context.output.file
        ? resolveFileName(context.output.file, modifierInputs)
        : buildInMemoryOutputKey({
            outputName: context.output.name,
            extension: 'css',
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
 * Tailwind CSS v4 renderer factory function.
 *
 * @example
 * ```typescript
 * outputs: [{
 *   name: 'tailwind',
 *   renderer: tailwindRenderer(),
 *   options: {
 *     preset: 'bundle',
 *     includeImport: true,
 *   },
 *   file: 'theme.css'
 * }]
 * ```
 */
export function tailwindRenderer(): Renderer<TailwindRendererOptions> {
  const rendererInstance = new TailwindRenderer()
  return {
    format: (context, options) =>
      rendererInstance.format(
        context,
        options ?? (context.output.options as TailwindRendererOptions | undefined),
      ),
  }
}
