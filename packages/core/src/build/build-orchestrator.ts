/**
 * @fileoverview Build orchestration and coordination
 * Handles build execution and error collection
 */

import type { OutputProcessor } from '@build/output-processor'
import type { BuildConfig } from '@config/index'
import { buildMetadata, resolveResolverDocument } from '@renderers/bundlers/utils'
import type { BuildResult, PermutationData, RenderContext } from '@renderers/types'
import type { ResolverDocument } from '@resolution/types'
import { ConfigurationError } from '@shared/errors/index'
import { toBuildError } from '@shared/utils/error-utils'
import type { TokenPipeline } from './pipeline/token-pipeline'

/**
 * Orchestrates the build process for design tokens
 *
 * Coordinates between the token pipeline, output processor, and renderers
 * to generate output files. Handles error collection and provides consistent
 * error handling across different outputs.
 *
 * @example
 * ```typescript
 * const orchestrator = new BuildOrchestrator(pipeline, outputProcessor)
 * const result = await orchestrator.build(resolver, buildPath, config)
 * ```
 */
export class BuildOrchestrator {
  constructor(
    private pipeline: TokenPipeline,
    private outputProcessor: OutputProcessor,
  ) {}

  /**
   * Build tokens with explicit or auto-discovered permutations
   *
   * Unified build method that handles both explicit and auto-discovered permutations:
   * - If `config.permutations` is provided and non-empty, builds those specific permutations
   * - If `config.permutations` is empty/undefined, auto-discovers all permutations from resolver
   * - If `config.permutations` is `[{}]`, builds single default permutation
   *
   * This consolidates the previous `build()` and `build()` methods into one unified API.
   *
   * @param resolver - Resolver configuration (file path or inline object)
   * @param buildPath - Output directory for generated files
   * @param config - Build configuration with outputs and transforms
   * @returns Build result with success status and generated files
   *
   * @example Build all permutations (auto-discover)
   * ```typescript
   * await orchestrator.build(resolver, buildPath, {
   *   outputs: [{ name: 'css', renderer: cssRenderer(), file: 'tokens.css', options: { preset: 'bundle' } }]
   * })
   * ```
   *
   * @example Build specific permutations
   * ```typescript
   * await orchestrator.build(resolver, buildPath, {
   *   outputs: [
   *     { name: 'css', renderer: cssRenderer(), file: 'tokens.css', options: { preset: 'standalone' } }
   *   ],
   *   permutations: [{ theme: 'light' }, { theme: 'dark' }]
   * })
   * ```
   *
   * @example Build with default permutation (no modifiers)
   * ```typescript
   * await orchestrator.build(resolver, buildPath, {
   *   outputs: [
   *     { name: 'css', renderer: cssRenderer(), file: 'tokens.css', options: { preset: 'standalone' } }
   *   ],
   *   permutations: [{}]
   * })
   * ```
   */
  async build(
    resolver: string | ResolverDocument,
    buildPath: string,
    config: BuildConfig,
  ): Promise<BuildResult> {
    // Fire onBuildStart hook before any work begins
    if (config.hooks?.onBuildStart) {
      await config.hooks.onBuildStart({ config, resolver })
    }

    if (!config.permutations || config.permutations.length === 0) {
      const permutations = await this.pipeline.resolveAllPermutations(
        resolver,
        config.transforms,
        config.preprocessors,
        config.filters,
      )
      return this.executeBuild(buildPath, config, permutations, resolver)
    }

    const permutations = await Promise.all(
      config.permutations.map(async (modifierInputs) => {
        const { tokens, modifierInputs: resolvedInputs } = await this.pipeline.resolve(
          resolver,
          modifierInputs,
          config.transforms,
          config.preprocessors,
          config.filters,
        )
        return { tokens, modifierInputs: resolvedInputs }
      }),
    )

    return this.executeBuild(buildPath, config, permutations, resolver)
  }

  /**
   * Execute the build process for resolved permutations
   *
   * This is the main build execution logic that processes all permutations through
   * each output's renderer, collecting errors but continuing execution to maximize
   * successful outputs even when some outputs fail.
   *
   * This method replaces the previous `buildWithResolver()` method and handles:
   * - Applying transforms and filters from the build configuration
   * - Processing permutations through each output's renderer
   * - Collecting errors but continuing with other outputs
   * - Returning a unified build result with outputs and errors
   *
   * @param buildPath - Output directory for generated files
   * @param config - Build configuration with outputs and transforms
   * @param permutations - Array of resolved permutation data
   * @returns Build result with success status, outputs, and any errors
   */
  private async executeBuild(
    buildPath: string,
    config: BuildConfig,
    permutations: PermutationData[],
    resolver: string | ResolverDocument,
  ): Promise<BuildResult> {
    try {
      const resolverDoc = await resolveResolverDocument(resolver)
      const metadata = buildMetadata(resolverDoc)

      const settled = await Promise.allSettled(
        config.outputs.map((output) =>
          this.buildSingleOutput(output, permutations, resolverDoc, metadata, buildPath, config, resolver),
        ),
      )

      const result = this.collectSettledResults(settled, config)

      if (config.hooks?.onBuildEnd) {
        await config.hooks.onBuildEnd(result)
      }

      return result
    } catch (error) {
      const result: BuildResult = {
        success: false,
        outputs: [],
        errors: [toBuildError(error)],
      }

      if (config.hooks?.onBuildEnd) {
        await config.hooks.onBuildEnd(result)
      }

      return result
    }
  }

  private async buildSingleOutput(
    output: BuildConfig['outputs'][number],
    permutations: PermutationData[],
    resolverDoc: ResolverDocument,
    metadata: ReturnType<typeof buildMetadata>,
    buildPath: string,
    config: BuildConfig,
    resolver: string | ResolverDocument,
  ): Promise<BuildResult['outputs']> {
    if (output.hooks?.onBuildStart) {
      await output.hooks.onBuildStart({ config, resolver })
    }

    try {
      const results = await this.processOutput(output, permutations, resolverDoc, metadata, metadata.defaults, buildPath)

      if (output.hooks?.onBuildEnd) {
        await output.hooks.onBuildEnd({ success: true, outputs: results })
      }

      return results
    } catch (error) {
      if (output.hooks?.onBuildEnd) {
        await output.hooks.onBuildEnd({ success: false, outputs: [], errors: [toBuildError(error, output.name)] })
      }

      throw error
    }
  }

  private collectSettledResults(
    settled: PromiseSettledResult<BuildResult['outputs']>[],
    config: BuildConfig,
  ): BuildResult {
    const outputs: BuildResult['outputs'] = []
    const errors: BuildResult['errors'] = []

    for (let i = 0; i < settled.length; i++) {
      const outcome = settled[i]!
      if (outcome.status === 'fulfilled') {
        outputs.push(...outcome.value)
      } else {
        errors.push(toBuildError(outcome.reason, config.outputs[i]!.name))
      }
    }

    return {
      success: errors.length === 0,
      outputs,
      errors: errors.length > 0 ? errors : undefined,
    }
  }

  private async processOutput(
    output: BuildConfig['outputs'][number],
    permutations: PermutationData[],
    resolverDoc: ResolverDocument,
    metadata: ReturnType<typeof buildMetadata>,
    basePermutation: Record<string, string>,
    buildPath: string,
  ) {
    if (!output.renderer.format) {
      throw new ConfigurationError('Renderer does not implement format()')
    }

    const processedPermutations = this.outputProcessor.processPermutations(permutations, output)

    const context: RenderContext = {
      permutations: processedPermutations,
      output,
      resolver: resolverDoc,
      meta: { ...metadata, basePermutation },
      buildPath,
    }

    const renderOutput = await output.renderer.format(context, output.options)
    return this.outputProcessor.writeRenderOutput(renderOutput, context)
  }

  /**
   * Note: intentionally no version/introspection API here.
   * Keep public surface minimal; use package versioning instead.
   */
}
