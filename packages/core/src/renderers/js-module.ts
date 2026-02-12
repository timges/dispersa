/**
 * @fileoverview JavaScript module renderer using Prettier for formatting
 */

import {
  buildInMemoryOutputKey,
  resolveFileName,
  stripInternalMetadata,
} from '@renderers/bundlers/utils'
import { ConfigurationError } from '@shared/errors/index'
import { getSortedTokenEntries } from '@shared/utils/token-utils'
import type { ResolvedTokens } from '@tokens/types'
import prettier from 'prettier'

import { outputTree } from './output-tree'
import type { JsModuleRendererOptions, RenderContext, RenderOutput, Renderer } from './types'

export class JsModuleRenderer implements Renderer<JsModuleRendererOptions> {
  async format(context: RenderContext, options?: JsModuleRendererOptions): Promise<RenderOutput> {
    const opts: Required<JsModuleRendererOptions> = {
      preset: options?.preset ?? 'standalone',
      structure: options?.structure ?? 'nested',
      minify: options?.minify ?? false,
      moduleName: options?.moduleName ?? 'tokens',
      generateHelper: options?.generateHelper ?? false,
    }

    if (opts.preset === 'bundle') {
      const { bundleAsJsModule } = await import('@renderers/bundlers/js')
      const bundleData = context.permutations.map(({ tokens, modifierInputs }) => ({
        tokens: stripInternalMetadata(tokens),
        modifierInputs,
        isBase: this.isBasePermutation(modifierInputs, context.meta.defaults),
      }))

      return await bundleAsJsModule(bundleData, context.resolver, opts, async (tokens) => {
        return await this.formatTokens(tokens, opts)
      })
    }

    const requiresFile = context.buildPath !== undefined && context.buildPath !== ''
    if (!context.output.file && requiresFile) {
      throw new ConfigurationError(
        `Output "${context.output.name}": file is required for JS module output`,
      )
    }

    const files: Record<string, string> = {}
    for (const { tokens, modifierInputs } of context.permutations) {
      const cleanTokens = stripInternalMetadata(tokens)
      const content = await this.formatTokens(cleanTokens, opts)
      const fileName = context.output.file
        ? resolveFileName(context.output.file, modifierInputs)
        : buildInMemoryOutputKey({
            outputName: context.output.name,
            extension: 'js',
            modifierInputs,
            resolver: context.resolver,
            defaults: context.meta.defaults,
          })
      files[fileName] = content
    }

    return outputTree(files)
  }

  private async formatTokens(
    tokens: ResolvedTokens,
    options: JsModuleRendererOptions,
  ): Promise<string> {
    const opts: Required<JsModuleRendererOptions> = {
      preset: options.preset ?? 'standalone',
      structure: options.structure ?? 'nested',
      minify: options.minify ?? false,
      moduleName: options.moduleName ?? 'tokens',
      generateHelper: options.generateHelper ?? false,
    }

    const lines: string[] = []
    lines.push(...this.formatAsObject(tokens, opts))

    const code = lines.join('\n')

    // Skip prettier formatting if minify is true
    if (opts.minify) {
      return code
    }

    // Use Prettier for consistent, high-quality formatting
    return await prettier.format(code, {
      parser: 'babel',
      printWidth: 80,
      tabWidth: 2,
      useTabs: false,
      semi: false,
      singleQuote: true,
      trailingComma: 'es5',
    })
  }

  /**
   * Format as default export object
   */
  private formatAsObject(
    tokens: ResolvedTokens,
    options: Required<JsModuleRendererOptions>,
  ): string[] {
    const lines: string[] = []
    const tokenObj = this.tokensToPlainObject(tokens, options.structure)
    const varName = options.moduleName !== '' ? options.moduleName : 'tokens'

    lines.push(`const ${varName} = {`)
    this.addObjectProperties(lines, tokenObj, 1)
    lines.push('}')
    lines.push('')
    lines.push(`export default ${varName}`)

    return lines
  }

  /**
   * Convert tokens to plain object with flat or nested structure
   */
  private tokensToPlainObject(
    tokens: ResolvedTokens,
    structure: 'flat' | 'nested',
  ): Record<string, unknown> {
    const result: Record<string, unknown> = {}

    if (structure === 'flat') {
      // Flat structure: { "token.name": "value" }
      for (const [name, token] of getSortedTokenEntries(tokens)) {
        result[name] = token.$value
      }
    } else {
      // Nested structure: { "token": { "name": "value" } }
      for (const [, token] of getSortedTokenEntries(tokens)) {
        const parts = token.path
        let current = result

        for (let i = 0; i < parts.length - 1; i++) {
          const part = parts[i]
          if (part == null) {
            continue
          }
          if (!(part in current)) {
            current[part] = {}
          }
          current = current[part] as Record<string, unknown>
        }

        const lastPart = parts[parts.length - 1]
        if (lastPart != null) {
          current[lastPart] = token.$value
        }
      }
    }

    return result
  }

  /**
   * Add object properties to lines
   */
  private addObjectProperties(lines: string[], obj: Record<string, unknown>, indent: number): void {
    const indentStr = '  '.repeat(indent)
    const entries = Object.entries(obj).sort(([keyA], [keyB]) => keyA.localeCompare(keyB))

    for (let i = 0; i < entries.length; i++) {
      const entry = entries[i]
      if (entry == null) {
        continue
      }
      const [key, value] = entry
      const isLast = i === entries.length - 1

      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        lines.push(`${indentStr}${this.quoteKey(key)}: {`)
        this.addObjectProperties(lines, value as Record<string, unknown>, indent + 1)
        lines.push(`${indentStr}}${isLast ? '' : ','}`)
      } else {
        const valueStr = JSON.stringify(value)
        lines.push(`${indentStr}${this.quoteKey(key)}: ${valueStr}${isLast ? '' : ','}`)
      }
    }
  }

  /**
   * Quote key if necessary
   */
  private quoteKey(key: string): string {
    if (/^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(key)) {
      return key
    }
    return `"${key}"`
  }

  private isBasePermutation(
    modifierInputs: Record<string, string>,
    defaults: Record<string, string>,
  ): boolean {
    return Object.entries(modifierInputs).every(([key, value]) => value === defaults[key])
  }
}

/**
 * JavaScript module renderer factory function
 *
 * Creates a JS module renderer with the specified preset and options.
 *
 * @param preset - Output preset: 'bundle' or 'standalone'
 * @param options - JS module formatting options (structure, minify, moduleName, generateHelper)
 * @returns Renderer instance
 *
 * @example
 * ```typescript
 * outputs: [{
 *   name: 'js',
 *   renderer: jsRenderer(),
 *   options: { preset: 'standalone', structure: 'flat', moduleName: 'tokens' },
 *   file: 'tokens.js'
 * }]
 * ```
 */
export function jsRenderer(): Renderer<JsModuleRendererOptions> {
  const rendererInstance = new JsModuleRenderer()
  return {
    format: (context, options) =>
      rendererInstance.format(
        context,
        options ?? (context.output.options as JsModuleRendererOptions | undefined),
      ),
  }
}
