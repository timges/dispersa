/**
 * @fileoverview JSON renderer using Prettier for consistent formatting
 */

import {
  buildInMemoryOutputKey,
  resolveFileName,
  stripInternalMetadata,
} from '@renderers/bundlers/utils'
import { ConfigurationError } from '@shared/errors/index'
import { getSortedTokenEntries } from '@shared/utils/token-utils'
import type { ResolvedToken, ResolvedTokens } from '@tokens/types'
import prettier from 'prettier'

import { outputTree } from './output-tree'
import type { JsonRendererOptions, RenderContext, RenderOutput, Renderer } from './types'

export class JsonRenderer implements Renderer<JsonRendererOptions> {
  async format(context: RenderContext, options?: JsonRendererOptions): Promise<RenderOutput> {
    const opts: Required<JsonRendererOptions> = {
      preset: options?.preset ?? 'standalone',
      structure: options?.structure ?? 'nested',
      minify: options?.minify ?? false,
      includeMetadata: options?.includeMetadata ?? false,
    }

    if (opts.preset === 'bundle') {
      const { bundleAsJson } = await import('@renderers/bundlers/json')
      const bundleData = context.permutations.map(({ tokens, modifierInputs }) => ({
        tokens: stripInternalMetadata(tokens),
        modifierInputs,
        isBase: this.isBasePermutation(modifierInputs, context.meta.defaults),
      }))

      return await bundleAsJson(bundleData, context.resolver, async (tokens) => {
        return await this.formatTokens(tokens, opts)
      })
    }

    const requiresFile = context.buildPath !== undefined && context.buildPath !== ''
    if (!context.output.file && requiresFile) {
      throw new ConfigurationError(
        `Output "${context.output.name}": file is required for JSON output`,
      )
    }

    const files: Record<string, string> = {}
    for (const { tokens, modifierInputs } of context.permutations) {
      const processedTokens = stripInternalMetadata(tokens)
      const content = await this.formatTokens(processedTokens, opts)
      const fileName = context.output.file
        ? resolveFileName(context.output.file, modifierInputs)
        : buildInMemoryOutputKey({
            outputName: context.output.name,
            extension: 'json',
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
    options: JsonRendererOptions,
  ): Promise<string> {
    const opts: Required<JsonRendererOptions> = {
      preset: options.preset ?? 'standalone',
      structure: options.structure ?? 'nested',
      minify: options.minify ?? false,
      includeMetadata: options.includeMetadata ?? false,
    }

    let output: unknown

    if (opts.structure === 'flat') {
      // Flat format: { "token.name": "value" } or { "token.name": { $value, $type, ... } }
      output = opts.includeMetadata ? this.flattenTokens(tokens) : this.flattenValues(tokens)
    } else {
      // Nested format: { "token": { "name": "value" } }
      output = opts.includeMetadata ? this.nestTokens(tokens) : this.nestValues(tokens)
    }

    const jsonString = JSON.stringify(output)

    // Use Prettier for consistent, high-quality formatting
    if (!opts.minify) {
      return await prettier.format(jsonString, {
        parser: 'json',
        printWidth: 80,
        tabWidth: 2,
        useTabs: false,
      })
    }

    return jsonString
  }

  /**
   * Flatten tokens to simple key-value pairs
   */
  private flattenValues(tokens: ResolvedTokens): Record<string, unknown> {
    const result: Record<string, unknown> = {}
    for (const [name, token] of getSortedTokenEntries(tokens)) {
      result[name] = token.$value
    }
    return result
  }

  /**
   * Flatten tokens to metadata objects
   */
  private flattenTokens(tokens: ResolvedTokens): Record<string, unknown> {
    const result: Record<string, unknown> = {}
    for (const [name, token] of getSortedTokenEntries(tokens)) {
      result[name] = this.serializeToken(token)
    }
    return result
  }

  /**
   * Nest tokens by path (values only)
   */
  private nestValues(tokens: ResolvedTokens): Record<string, unknown> {
    const result: Record<string, unknown> = {}

    for (const [, token] of getSortedTokenEntries(tokens)) {
      const parts = token.path
      let current = result

      for (let i = 0; i < parts.length - 1; i++) {
        const part = parts[i]
        if (part === null || part === undefined) {
          continue
        }
        if (!(part in current)) {
          current[part] = {}
        }
        current = current[part] as Record<string, unknown>
      }

      const lastPart = parts[parts.length - 1]
      if (lastPart !== null && lastPart !== undefined) {
        current[lastPart] = token.$value
      }
    }

    return result
  }

  /**
   * Nest tokens by path (with metadata)
   */
  private nestTokens(tokens: ResolvedTokens): Record<string, unknown> {
    const result: Record<string, unknown> = {}

    for (const [, token] of getSortedTokenEntries(tokens)) {
      const parts = token.path
      let current = result

      for (let i = 0; i < parts.length - 1; i++) {
        const part = parts[i]
        if (part === null || part === undefined) {
          continue
        }
        if (!(part in current)) {
          current[part] = {}
        }
        current = current[part] as Record<string, unknown>
      }

      const lastPart = parts[parts.length - 1]
      if (lastPart !== null && lastPart !== undefined) {
        current[lastPart] = this.serializeToken(token)
      }
    }

    return result
  }

  private serializeToken(token: ResolvedToken): Record<string, unknown> {
    return {
      $value: token.$value,
      ...(typeof token.$type === 'string' && { $type: token.$type }),
      ...(token.$description != null &&
        token.$description !== '' && { $description: token.$description }),
      ...(token.$deprecated != null &&
        token.$deprecated !== false && { $deprecated: token.$deprecated }),
      ...(token.$extensions != null && { $extensions: token.$extensions }),
    }
  }

  private isBasePermutation(
    modifierInputs: Record<string, string>,
    defaults: Record<string, string>,
  ): boolean {
    return Object.entries(modifierInputs).every(([key, value]) => value === defaults[key])
  }
}

/**
 * JSON renderer factory function
 *
 * Creates a JSON renderer with the specified preset and options.
 *
 * @param preset - Output preset: 'bundle' or 'standalone'
 * @param options - JSON formatting options (structure, minify, includeMetadata)
 * @returns Renderer instance
 *
 * @example
 * ```typescript
 * outputs: [{
 *   name: 'json',
 *   renderer: jsonRenderer(),
 *   options: { preset: 'bundle', structure: 'nested', includeMetadata: true },
 *   file: 'tokens.json'
 * }]
 * ```
 */
export function jsonRenderer(): Renderer<JsonRendererOptions> {
  const rendererInstance = new JsonRenderer()
  return {
    format: (context, options) =>
      rendererInstance.format(
        context,
        options ?? (context.output.options as JsonRendererOptions | undefined),
      ),
  }
}
