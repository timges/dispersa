/**
 * @license
 * Copyright (c) 2025 Dispersa Contributors
 * SPDX-License-Identifier: MIT
 */

/**
 * @fileoverview Main Dispersa API
 */

import { TypeWriter } from '@adapters/filesystem/type-writer'
import { BuildOrchestrator } from '@build/build-orchestrator'
import { OutputProcessor } from '@build/output-processor'
import { TokenPipeline } from '@build/pipeline/token-pipeline'
import type {
  BuildConfig,
  BuildResult,
  ModifierInputs,
  ResolvedTokens,
  ResolverDocument,
  DispersaOptions,
} from '@config/index'
import { SchemaValidator } from '@lib/validation/validator'
import { ConfigurationError } from '@shared/errors/index'
import { toBuildError } from '@shared/utils/error-utils'
import { stripInternalTokenMetadata } from '@shared/utils/token-utils'

/**
 * DTCG design token processor with multi-format output support
 *
 * Dispersa processes DTCG-compliant design tokens through a configurable pipeline,
 * resolves references and aliases, applies transforms and filters, and generates output
 * in multiple formats (CSS, JSON, JavaScript, Figma Variables).
 *
 * **Runtime Validation:**
 * Dispersa validates all configuration inputs at runtime, including constructor options,
 * build configs, output configs, and custom component registrations. This catches
 * configuration errors early with helpful error messages.
 *
 * Features:
 * - **Transforms**: Modify token values and names (e.g., convert colors, change case)
 * - **Filters**: Select which tokens to include in output
 * - **Preprocessors**: Transform raw token data before parsing
 * - **Renderers**: Generate output in various formats
 * - **Runtime validation**: JSON schema validation for all user inputs
 *
 * @example Basic usage with constructor defaults
 * ```typescript
 * const dispersa = new Dispersa({
 *   resolver: './tokens.resolver.json',
 *   buildPath: './output'
 * })
 *
 * const result = await dispersa.build({
 *   outputs: [
 *     css({
 *       name: 'css',
 *       file: 'tokens.css',
 *       preset: 'bundle',
 *       selector: ':root',
 *       transforms: [nameKebabCase()]
 *     })
 *   ]
 * })
 * ```
 *
 * @example Mixed presets per output
 * ```typescript
 * import { css, json } from 'dispersa'
 *
 * const dispersa = new Dispersa({
 *   resolver: './tokens.resolver.json',
 *   buildPath: './output'
 * })
 *
 * await dispersa.build({
 *   outputs: [
 *     css({
 *       name: 'css',
 *       file: 'tokens.css',
 *       preset: 'bundle',
 *       selector: ':root',  // All themes in one CSS file
 *       transforms: [nameKebabCase()]
 *     }),
 *     json({
 *       name: 'json',
 *       file: 'tokens-{theme}.json',  // Separate file per theme
 *       preset: 'standalone',
 *       structure: 'flat'
 *     })
 *   ]
 * })
 * ```
 *
 * @example Using filters and preprocessors
 * ```typescript
 * import { css } from 'dispersa'
 * import { byType } from 'dispersa/filters'
 * import { nameKebabCase } from 'dispersa/transforms'
 *
 * const dispersa = new Dispersa({
 *   resolver: './tokens.resolver.json',
 *   buildPath: './output'
 * })
 *
 * await dispersa.build({
 *   outputs: [
 *     css({
 *       name: 'colors-only',
 *       file: 'colors.css',
 *       preset: 'standalone',
 *       selector: ':root',
 *       filters: [byType('color')],
 *       transforms: [nameKebabCase()]
 *     })
 *   ],
 *   permutations: [
 *     { theme: 'light' },
 *     { theme: 'dark' }
 *   ]
 * })
 * ```
 */
export class Dispersa {
  private validator: SchemaValidator
  private pipeline: TokenPipeline
  private outputProcessor: OutputProcessor
  private orchestrator: BuildOrchestrator
  private options: DispersaOptions

  /**
   * Creates a new Dispersa instance
   *
   * @param options - Configuration options (optional, can be empty object)
   * @param options.resolver - Default resolver (file path or inline object, optional if provided at build time)
   * @param options.buildPath - Default output directory for generated files (omit for in-memory mode)
   * @throws {ConfigurationError} If options are invalid and validation is enabled
   */
  constructor(options: DispersaOptions = {}) {
    this.options = options

    // Initialize validator
    this.validator = new SchemaValidator()

    // Validate constructor options
    const errors = this.validator.validateDispersaOptions(options)
    if (errors.length > 0) {
      throw new ConfigurationError(
        `Invalid Dispersa options: ${this.validator.getErrorMessage(errors)}`,
      )
    }

    // Initialize pipeline and processor
    this.pipeline = new TokenPipeline({ validation: options.validation })
    this.outputProcessor = new OutputProcessor()

    // Initialize build orchestrator
    this.orchestrator = new BuildOrchestrator(this.pipeline, this.outputProcessor)
  }

  /**
   * Builds design tokens from a resolver configuration
   *
   * Processes tokens through the resolution pipeline, applies preprocessors,
   * transforms, and filters, then generates output files in multiple formats
   * for specified outputs.
   *
   * **Runtime Validation:**
   * This method validates the build configuration
   * and all output configurations before processing, throwing helpful errors for
   * invalid inputs.
   *
   * **Permutation Handling:**
   * - If `config.permutations` is provided and non-empty, builds those specific permutations
   * - If `config.permutations` is undefined or empty, auto-discovers all permutations from resolver
   *
   * @param config - Build configuration
   * @param config.resolver - Resolver configuration (file path or inline object, optional if set in constructor)
   * @param config.outputs - Array of output configurations (renderers, transforms, filters)
   * @param config.buildPath - Output directory for generated files (omit for in-memory mode, optional if set in constructor)
   * @param config.transforms - Global transforms to apply to all tokens
   * @param config.preprocessors - Global preprocessors to apply before parsing
   * @param config.permutations - Array of modifier inputs for generating variations
   * @returns Build result with success status and generated output files
   * @throws {ConfigurationError} If configuration is invalid
   * @throws {FileOperationError} If file operations fail
   *
   * @example Basic build
   * ```typescript
   * const dispersa = new Dispersa({
   *   resolver: './tokens.resolver.json',
   *   buildPath: './output'
   * })
   *
   * const result = await dispersa.build({
   *   outputs: [
   *     css({
   *       name: 'css',
   *       file: 'tokens.css',
   *       preset: 'bundle',
   *       selector: ':root',
   *       transforms: [nameKebabCase()]
   *     })
   *   ]
   * })
   * ```
   *
   * @example With filters and multiple presets
   * ```typescript
   * const result = await dispersa.build({
   *   resolver: './tokens.resolver.json',
   *   outputs: [
   *     css({
   *       name: 'css',
   *       file: 'tokens.css',
   *       preset: 'bundle',
   *       selector: ':root',  // All themes in one file
   *       transforms: [nameKebabCase()]
   *     }),
   *     json({
   *       name: 'json',
   *       file: 'tokens-{theme}.json',  // Separate file per theme
   *       preset: 'standalone',
   *       structure: 'flat'
   *     })
   *   ],
   *   buildPath: './output',
   *   permutations: [
   *     { theme: 'light' },
   *     { theme: 'dark' }
   *   ]
   * })
   * ```
   */
  async build(config: BuildConfig): Promise<BuildResult> {
    try {
      return await this.buildOrThrow(config)
    } catch (error) {
      return {
        success: false,
        outputs: [],
        errors: [toBuildError(error)],
      }
    }
  }

  /**
   * Builds design tokens and throws on any failure.
   *
   * Unlike {@link build}, which catches errors and returns them inside
   * `BuildResult.errors`, this method propagates the first error as an
   * exception. Use it when you want fail-fast behavior in CLI or CI workflows.
   *
   * @param config - Build configuration specifying resolver, outputs, transforms, etc.
   * @returns A successful `BuildResult` (never contains errors)
   * @throws {ConfigurationError} When the build config or resolver is invalid
   * @throws {DispersaError} When token resolution, transforms, or rendering fails
   *
   * @example
   * ```typescript
   * try {
   *   const result = await dispersa.buildOrThrow({
   *     resolver: './tokens.resolver.json',
   *     outputs: [css({ name: 'css', file: 'tokens.css' })],
   *     buildPath: './output',
   *   })
   * } catch (error) {
   *   process.exit(1)
   * }
   * ```
   */
  async buildOrThrow(config: BuildConfig): Promise<BuildResult> {
    // Validate overall build config structure
    const configErrors = this.validator.validateBuildConfig(config)
    if (configErrors.length > 0) {
      throw new ConfigurationError(
        `Invalid build configuration: ${this.validator.getErrorMessage(configErrors)}`,
      )
    }

    // Validate each output config
    for (const output of config.outputs) {
      const outputErrors = this.validator.validateOutputConfig(output)
      if (outputErrors.length > 0) {
        throw new ConfigurationError(
          `Invalid output '${output.name}': ${this.validator.getErrorMessage(outputErrors)}`,
        )
      }
    }

    // Resolve config with constructor defaults
    const { resolver, buildPath } = this.resolveConfig(config)

    // Delegate to orchestrator
    return this.orchestrator.build(resolver, buildPath, config)
  }

  /**
   * Builds tokens for a single permutation with all configured outputs
   *
   * Convenience wrapper around `build()` that forces a single permutation.
   * This means it has the same runtime validation and error semantics as `build()`:
   * it returns a `BuildResult` object rather than throwing (use `buildOrThrow()` if you
   * want fail-fast behavior).
   *
   * @param config - Build configuration
   * @param modifierInputs - Modifier values (e.g., `{ theme: 'dark' }`)
   * @returns Build result (success, outputs, optional errors)
   */
  async buildPermutation(
    config: BuildConfig,
    modifierInputs: ModifierInputs = {},
  ): Promise<BuildResult> {
    return await this.build({
      ...config,
      permutations: [modifierInputs],
    })
  }

  /**
   * Resolve configuration with constructor defaults
   */
  private resolveConfig(config: Partial<BuildConfig>): {
    resolver: string | ResolverDocument
    buildPath: string
  } {
    const resolver = config.resolver ?? this.options.resolver
    const buildPath = config.buildPath ?? this.options.buildPath ?? ''

    if (!resolver) {
      throw new ConfigurationError(
        'resolver must be provided either in constructor options or build config',
      )
    }

    return { resolver, buildPath }
  }

  /**
   * Resolves tokens for a specific permutation without generating output files
   *
   * Useful for programmatic access to resolved token values, testing,
   * or implementing custom output logic. Returns fully resolved tokens
   * with all references and aliases resolved.
   *
   * @param resolver - Resolver configuration (file path or inline object)
   * @param modifierInputs - Modifier values for this permutation (e.g., `{ theme: 'dark' }`)
   * @returns Object mapping token names to resolved token objects
   * @throws {FileOperationError} If resolver file cannot be read
   * @throws {TokenReferenceError} If token references cannot be resolved (when validate is enabled)
   *
   * @example
   * ```typescript
   * const tokens = await dispersa.resolveTokens(
   *   './tokens.resolver.json',
   *   { theme: 'dark' }
   * )
   *
   * console.log(tokens['color.background'].$value) // '#1a1a1a'
   * ```
   */
  async resolveTokens(
    resolver: string | ResolverDocument,
    modifierInputs: ModifierInputs = {},
  ): Promise<ResolvedTokens> {
    const { tokens } = await this.pipeline.resolve(resolver, modifierInputs)
    return stripInternalTokenMetadata(tokens)
  }

  /**
   * Resolves tokens for all permutations defined in the resolver
   *
   * Auto-discovers all possible permutations from the resolver's modifier
   * definitions and resolves tokens for each one. Useful for generating
   * comprehensive token sets or validating all theme variations.
   *
   * @param resolver - Resolver configuration (file path or inline object)
   * @returns Array of resolved token sets with their modifier inputs
   * @throws {FileOperationError} If resolver file cannot be read
   * @throws {TokenReferenceError} If token references cannot be resolved (when validate is enabled)
   *
   * @example
   * ```typescript
   * const permutations = await dispersa.resolveAllPermutations(
   *   './tokens.resolver.json'
   * )
   *
   * permutations.forEach(({ tokens, modifierInputs }) => {
   *   console.log(`Theme: ${modifierInputs.theme}`)
   *   console.log(`Tokens: ${Object.keys(tokens).length}`)
   * })
   * ```
   */
  async resolveAllPermutations(resolver: string | ResolverDocument): Promise<
    {
      tokens: ResolvedTokens
      modifierInputs: ModifierInputs
    }[]
  > {
    const permutations = await this.pipeline.resolveAllPermutations(resolver)
    return permutations.map(({ tokens, modifierInputs }) => ({
      tokens: stripInternalTokenMetadata(tokens),
      modifierInputs,
    }))
  }

  /**
   * Generates TypeScript type definitions from resolved tokens
   *
   * Creates a `.d.ts` file with type-safe token definitions including:
   * - Token name union type for autocomplete
   * - Token value types
   * - Nested structure types matching token organization
   *
   * @param tokens - Resolved tokens object
   * @param fileName - Path for the generated `.d.ts` file
   * @param options - Generation options
   * @param options.moduleName - Name for the exported types (default: 'Tokens')
   * @returns Promise that resolves when file is written
   * @throws {FileOperationError} If file cannot be written
   *
   * @example
   * ```typescript
   * const tokens = await dispersa.resolveTokens('./tokens.resolver.json')
   * await dispersa.generateTypes(tokens, './src/tokens.d.ts', {
   *   moduleName: 'DesignTokens'
   * })
   *
   * // Generated types can be used like:
   * // const tokenName: TokenName = 'color.background'
   * // const tokens: DesignTokens = { ... }
   * ```
   */
  async generateTypes(
    tokens: ResolvedTokens,
    fileName: string,
    options?: { moduleName?: string },
  ): Promise<void> {
    const typeWriter = new TypeWriter()
    await typeWriter.write(tokens, {
      fileName,
      moduleName: options?.moduleName ?? 'Tokens',
      includeValues: true,
    })
  }
}
