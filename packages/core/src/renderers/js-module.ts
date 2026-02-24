/**
 * @fileoverview JavaScript module renderer using Prettier for formatting
 */

import {
  assertFileRequired,
  buildInMemoryOutputKey,
  isBasePermutation,
  resolveFileName,
  stripInternalMetadata,
} from '@renderers/bundlers/utils'
import { buildNestedTokenObject, getSortedTokenEntries } from '@shared/utils/token-utils'
import type { ResolvedToken, ResolvedTokens } from '@tokens/types'
import prettier from 'prettier'

import { buildTokenDeprecationComment, buildTokenDescriptionComment } from './metadata'
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
        isBase: isBasePermutation(modifierInputs, context.meta.defaults),
      }))

      return await bundleAsJsModule(bundleData, context.resolver, opts, async (tokens) => {
        return await this.formatTokens(tokens, opts)
      })
    }

    assertFileRequired(context.buildPath, context.output.file, context.output.name, 'JS module')

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
    options: Required<JsModuleRendererOptions>,
  ): Promise<string> {
    const lines: string[] = []
    lines.push(...this.formatAsObject(tokens, options))

    const code = lines.join('\n')

    if (options.minify) {
      return code
    }

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

  private formatAsObject(
    tokens: ResolvedTokens,
    options: Required<JsModuleRendererOptions>,
  ): string[] {
    const lines: string[] = []
    const tokenMap = this.buildTokenMap(tokens)
    const varName = options.moduleName !== '' ? options.moduleName : 'tokens'

    if (options.structure === 'flat') {
      lines.push(`const ${varName} = {`)
      this.addFlatProperties(lines, tokens, 1)
      lines.push('}')
    } else {
      lines.push(`const ${varName} = {`)
      const tokenObj = this.tokensToPlainObject(tokens, 'nested')
      this.addNestedProperties(lines, tokenObj, tokenMap, 1)
      lines.push('}')
    }

    lines.push('')
    lines.push(`export default ${varName}`)

    return lines
  }

  private buildTokenMap(tokens: ResolvedTokens): Map<string, ResolvedToken> {
    const map = new Map<string, ResolvedToken>()
    for (const [name, token] of Object.entries(tokens)) {
      map.set(name, token)
    }
    return map
  }

  private addFlatProperties(lines: string[], tokens: ResolvedTokens, indent: number): void {
    const indentStr = '  '.repeat(indent)
    const sortedEntries = getSortedTokenEntries(tokens)

    for (let i = 0; i < sortedEntries.length; i++) {
      const [name, token] = sortedEntries[i]!
      const isLast = i === sortedEntries.length - 1

      this.pushTokenComments(lines, token, indentStr)

      lines.push(
        `${indentStr}${this.quoteKey(name)}: ${JSON.stringify(token.$value)}${isLast ? '' : ','}`,
      )
    }
  }

  private pushTokenComments(lines: string[], token: ResolvedToken, indent: string): void {
    const deprecationComment = buildTokenDeprecationComment(token, 'js')
    if (deprecationComment) {
      lines.push(`${indent}${deprecationComment}`)
    }

    const descriptionComment = buildTokenDescriptionComment(token, 'js')
    if (descriptionComment) {
      lines.push(`${indent}${descriptionComment}`)
    }
  }

  private tokensToPlainObject(
    tokens: ResolvedTokens,
    structure: 'flat' | 'nested',
  ): Record<string, unknown> {
    if (structure === 'nested') {
      return buildNestedTokenObject(tokens, (token) => token.$value)
    }

    const result: Record<string, unknown> = {}
    for (const [name, token] of getSortedTokenEntries(tokens)) {
      result[name] = token.$value
    }
    return result
  }

  private addNestedProperties(
    lines: string[],
    obj: Record<string, unknown>,
    tokenMap: Map<string, ResolvedToken>,
    indent: number,
  ): void {
    const indentStr = '  '.repeat(indent)
    const entries = Object.entries(obj).sort(([keyA], [keyB]) => keyA.localeCompare(keyB))

    for (let i = 0; i < entries.length; i++) {
      const entry = entries[i]
      if (entry == null) {
        continue
      }
      const [key, value] = entry
      const isLast = i === entries.length - 1
      const isNestedObject = typeof value === 'object' && value !== null && !Array.isArray(value)

      if (!isNestedObject) {
        const token = tokenMap.get(key)
        if (token) {
          this.pushTokenComments(lines, token, indentStr)
        }

        lines.push(
          `${indentStr}${this.quoteKey(key)}: ${JSON.stringify(value)}${isLast ? '' : ','}`,
        )
        continue
      }

      lines.push(`${indentStr}${this.quoteKey(key)}: {`)
      this.addNestedProperties(lines, value as Record<string, unknown>, tokenMap, indent + 1)
      lines.push(`${indentStr}}${isLast ? '' : ','}`)
    }
  }

  private quoteKey(key: string): string {
    if (/^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(key)) {
      return key
    }
    return `"${key}"`
  }
}

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
