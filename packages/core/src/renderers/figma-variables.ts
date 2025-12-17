/**
 * @fileoverview Figma Variables JSON renderer
 */

import prettier from 'prettier'

import { FigmaVariablesBuilder } from './bundlers/figma/figma-variables-builder'
import type { FigmaVariablesOptions, RenderContext, RenderOutput, Renderer } from './types'

export class FigmaVariablesRenderer implements Renderer<FigmaVariablesOptions> {
  async format(context: RenderContext, options?: FigmaVariablesOptions): Promise<RenderOutput> {
    const collectionName = options?.collectionName ?? 'Design Tokens'
    const builder = new FigmaVariablesBuilder(
      collectionName,
      options?.modeMapping,
      options?.preserveReferences ?? false,
    )
    const output = builder.build(context.permutations, context.resolver)
    const jsonString = JSON.stringify(output)

    return await prettier.format(jsonString, {
      parser: 'json',
      printWidth: 80,
      tabWidth: 2,
      useTabs: false,
    })
  }
}

/**
 * Figma Variables renderer factory function.
 */
export function figmaRenderer(): Renderer<FigmaVariablesOptions> {
  const rendererInstance = new FigmaVariablesRenderer()
  return {
    format: (context, options) =>
      rendererInstance.format(
        context,
        options ?? (context.output.options as FigmaVariablesOptions | undefined),
      ),
  }
}
