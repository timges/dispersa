/**
 * @license
 * Copyright (c) 2025 Dispersa Contributors
 * SPDX-License-Identifier: MIT
 */

/**
 * @fileoverview Main Dispersa API - Functional exports
 */

import { TypeWriter } from '@adapters/filesystem/type-writer'
import { BuildOrchestrator } from '@build/build-orchestrator'
import { OutputProcessor } from '@build/output-processor'
import { TokenPipeline } from '@build/pipeline/token-pipeline'
import type { BuildConfig, DispersaOptions } from '@config/index'
import { LintRunner } from '@lint/lint-runner'
import type { LintConfig, LintResult } from '@lint/types'
import type { BuildResult } from '@renderers/types'
import type { ModifierInputs, ResolverDocument } from '@resolution/types'
import { ConfigurationError, LintError } from '@shared/errors/index'
import type { ValidationOptions } from '@shared/types/validation'
import { toBuildError } from '@shared/utils/error-utils'
import { stripInternalTokenMetadata } from '@shared/utils/token-utils'
import type { ResolvedTokens, InternalResolvedTokens } from '@tokens/types'
import { SchemaValidator } from '@validation/validator'

function createValidator(): SchemaValidator {
  return new SchemaValidator()
}

function createPipeline(options?: DispersaOptions): TokenPipeline {
  return new TokenPipeline({ validation: options?.validation })
}

function createOutputProcessor(): OutputProcessor {
  return new OutputProcessor()
}

function createOrchestrator(
  pipeline: TokenPipeline,
  outputProcessor: OutputProcessor,
): BuildOrchestrator {
  return new BuildOrchestrator(pipeline, outputProcessor)
}

function resolveConfig(
  config: Partial<BuildConfig>,
  options?: DispersaOptions,
): { resolver: string | ResolverDocument; buildPath: string } {
  const resolver = config.resolver ?? options?.resolver
  const buildPath = config.buildPath ?? options?.buildPath ?? ''

  if (!resolver) {
    throw new ConfigurationError('resolver is required in build config')
  }

  return { resolver, buildPath }
}

function validateBuildConfig(validator: SchemaValidator, config: BuildConfig): void {
  const configErrors = validator.validateBuildConfig(config)
  if (configErrors.length > 0) {
    throw new ConfigurationError(
      `Invalid build configuration: ${validator.getErrorMessage(configErrors)}`,
    )
  }

  for (const output of config.outputs) {
    const outputErrors = validator.validateOutputConfig(output)
    if (outputErrors.length > 0) {
      throw new ConfigurationError(
        `Invalid output '${output.name}': ${validator.getErrorMessage(outputErrors)}`,
      )
    }
  }
}

async function resolvePipeline(
  pipeline: TokenPipeline,
  resolver: string | ResolverDocument,
  modifierInputs: ModifierInputs,
): Promise<ResolvedTokens> {
  const { tokens } = await pipeline.resolve(resolver, modifierInputs)
  return stripInternalTokenMetadata(tokens)
}

/**
 * DTCG design token processor with multi-format output support
 *
 * Dispersa processes DTCG-compliant design tokens through a configurable pipeline,
 * resolves references and aliases, applies transforms and filters, and generates output
 * in multiple formats (CSS, JSON, JavaScript).
 *
 * **Runtime Validation:**
 * All functions validate their configuration inputs at runtime, including build configs,
 * output configs, and custom component registrations. This catches configuration errors
 * early with helpful error messages.
 *
 * Features:
 * - **Transforms**: Modify token values and names (e.g., convert colors, change case)
 * - **Filters**: Select which tokens to include in output
 * - **Preprocessors**: Transform raw token data before parsing
 * - **Renderers**: Generate output in various formats
 * - **Runtime validation**: JSON schema validation for all user inputs
 *
 * @example Basic build usage
 * ```typescript
 * import { build, css } from 'dispersa'
 * import { nameKebabCase } from 'dispersa/transforms'
 *
 * const result = await build({
 *   resolver: './tokens.resolver.json',
 *   buildPath: './output',
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
 * import { build, css, json } from 'dispersa'
 *
 * const result = await build({
 *   resolver: './tokens.resolver.json',
 *   buildPath: './output',
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
 * import { build, css } from 'dispersa'
 * import { byType } from 'dispersa/filters'
 * import { nameKebabCase } from 'dispersa/transforms'
 *
 * const result = await build({
 *   resolver: './tokens.resolver.json',
 *   buildPath: './output',
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
export async function build(config: BuildConfig): Promise<BuildResult> {
  try {
    return await buildOrThrow(config)
  } catch (error) {
    return {
      success: false,
      outputs: [],
      errors: [toBuildError(error)],
    }
  }
}

export async function buildOrThrow(config: BuildConfig): Promise<BuildResult> {
  const validator = createValidator()

  validateBuildConfig(validator, config)

  const { resolver, buildPath } = resolveConfig(config)

  const pipeline = createPipeline({ validation: config.validation })
  const outputProcessor = createOutputProcessor()
  const orchestrator = createOrchestrator(pipeline, outputProcessor)

  return orchestrator.build(resolver, buildPath, config)
}

export async function buildPermutation(
  config: BuildConfig,
  modifierInputs: ModifierInputs = {},
): Promise<BuildResult> {
  return build({
    ...config,
    permutations: [modifierInputs],
  })
}

export async function resolveTokens(
  resolver: string | ResolverDocument,
  modifierInputs: ModifierInputs = {},
  validation?: ValidationOptions,
): Promise<ResolvedTokens> {
  const pipeline = createPipeline({ validation })
  return resolvePipeline(pipeline, resolver, modifierInputs)
}

export type LintOptions = {
  resolver: string | ResolverDocument
  modifierInputs?: ModifierInputs
  validation?: ValidationOptions
} & LintConfig

export async function lint(options: LintOptions): Promise<LintResult> {
  const { resolver, modifierInputs = {}, validation, ...lintConfig } = options

  const pipeline = createPipeline({ validation })

  const runner = new LintRunner({
    ...lintConfig,
    failOnError: lintConfig.failOnError ?? true,
  })

  let tokenSets: InternalResolvedTokens[]

  if (Object.keys(modifierInputs).length > 0) {
    // Specific modifier inputs provided - resolve only that permutation
    const { tokens } = await pipeline.resolve(resolver, modifierInputs)
    tokenSets = [tokens]
  } else {
    // No specific modifier inputs - resolve all permutations
    const permutations = await pipeline.resolveAllPermutations(resolver)
    tokenSets = permutations.map((p) => p.tokens)
  }

  // Use runMultiple for deduplication across permutations
  const result = await runner.runMultiple(tokenSets)

  if (result.errorCount > 0 && lintConfig.failOnError !== false) {
    throw new LintError(result.issues)
  }

  return result
}

export async function resolveAllPermutations(resolver: string | ResolverDocument): Promise<
  {
    tokens: ResolvedTokens
    modifierInputs: ModifierInputs
  }[]
> {
  const pipeline = createPipeline()
  const permutations = await pipeline.resolveAllPermutations(resolver)
  return permutations.map(({ tokens, modifierInputs }) => ({
    tokens: stripInternalTokenMetadata(tokens),
    modifierInputs,
  }))
}

export async function generateTypes(
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
