/**
 * @fileoverview Output processor for handling output-specific token rendering
 */

import * as path from 'node:path'

import { writeOutputFile } from '@adapters/filesystem/file-utils'
import type { ModifierInputs, OutputConfig, ResolvedTokens } from '@config/index'
import { applyFilters, applyTransforms } from '@processing/token-modifier'
import { resolveFileName } from '@renderers/bundlers/utils'
import { isOutputTree } from '@renderers/output-tree'
import type {
  PermutationData,
  RenderContext,
  RenderOutput,
} from '@renderers/types'
import { ConfigurationError } from '@shared/errors/index'

export type OutputResult = {
  name: string
  /** File path or in-memory output key */
  path?: string
  content: string
}

export class OutputProcessor {
  /**
   * Apply output-specific filters and transforms to a permutation set.
   */
  processPermutations(
    permutations: PermutationData[],
    output: OutputConfig,
  ): PermutationData[] {
    return permutations.map(({ tokens, modifierInputs }) => ({
      tokens: this.applyFiltersAndTransforms(tokens, output),
      modifierInputs,
    }))
  }

  /**
   * Apply filters and transforms to tokens without formatting.
   */
  applyFiltersAndTransforms(tokens: ResolvedTokens, output: OutputConfig): ResolvedTokens {
    let outputTokens = tokens

    // Apply output-specific filters first (select which tokens to include)
    if (output.filters !== undefined && output.filters.length > 0) {
      outputTokens = applyFilters(outputTokens, output.filters)
    }

    // Apply output-specific transforms (only to filtered tokens)
    if (output.transforms !== undefined && output.transforms.length > 0) {
      outputTokens = applyTransforms(outputTokens, output.transforms)
    }

    return outputTokens
  }

  /**
   * Write rendered output (string or output tree) to the filesystem.
   */
  async writeRenderOutput(
    renderOutput: RenderOutput,
    context: RenderContext,
  ): Promise<OutputResult[]> {
    if (typeof renderOutput === 'string') {
      return [await this.writeSingleOutput(renderOutput, context)]
    }

    if (!isOutputTree(renderOutput)) {
      throw new ConfigurationError('Renderer returned an unsupported output shape')
    }

    return await this.writeOutputTree(renderOutput.files, context)
  }

  private async writeSingleOutput(
    content: string,
    context: RenderContext,
  ): Promise<OutputResult> {
    const { output, buildPath, meta } = context

    if (buildPath !== undefined && buildPath !== '') {
      if (!output.file) {
        throw new ConfigurationError(
          `Output "${output.name}": file is required when buildPath is provided`,
        )
      }

      const fileName = this.resolveSingleOutputFileName(output.file, meta.basePermutation)
      const fullPath = path.resolve(buildPath, fileName)
      await writeOutputFile(fullPath, content)
      return { name: output.name, path: fullPath, content }
    }

    return { name: output.name, path: undefined, content }
  }

  private async writeOutputTree(
    files: Record<string, string>,
    context: RenderContext,
  ): Promise<OutputResult[]> {
    const { output, buildPath } = context
    const entries = Object.entries(files).sort(([pathA], [pathB]) => pathA.localeCompare(pathB))

    if (entries.length === 0) {
      return []
    }

    // Write all files in parallel -- each entry targets a unique path
    const results = await Promise.all(
      entries.map(async ([relativePath, content]) => {
        const outputPath =
          buildPath !== undefined && buildPath !== ''
            ? path.resolve(buildPath, relativePath)
            : relativePath

        if (buildPath !== undefined && buildPath !== '') {
          await writeOutputFile(outputPath, content)
        }

        return { name: output.name, path: outputPath, content } satisfies OutputResult
      }),
    )

    return results
  }

  private resolveSingleOutputFileName(
    outputFile: string | ((modifierInputs: ModifierInputs) => string),
    modifierInputs: ModifierInputs,
  ): string {
    if (typeof outputFile === 'function') {
      return outputFile(modifierInputs)
    }

    if (/\{.+?\}/.test(outputFile)) {
      return resolveFileName(outputFile, modifierInputs)
    }

    return outputFile
  }
}
