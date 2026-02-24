/**
 * @fileoverview Token resolution pipeline
 * Handles the flow: parse resolver → resolve tokens → preprocess → resolve $ref → flatten → resolve aliases → strip $root → lint → apply filters → apply transforms
 *
 * Pipeline stages are explicitly typed to prevent temporal coupling and ensure
 * operations happen in the correct order.
 */

import { ResolverLoader } from '@adapters/filesystem/resolver-loader'
import { LintRunner } from '@lint/lint-runner'
import type { LintBuildConfig, LintResult } from '@lint/types'
import { applyFilters, applyTransforms } from '@processing/apply'
import type { Filter } from '@processing/filters/types'
import type { Preprocessor } from '@processing/preprocessors/types'
import type { Transform } from '@processing/transforms/types'
import { AliasResolver } from '@resolution/alias-resolver'
import { ReferenceResolver } from '@resolution/reference-resolver'
import { ResolutionEngine } from '@resolution/resolution-engine'
import type { ModifierInputs, ResolverDocument } from '@resolution/types'
import { LintError } from '@shared/errors'
import type { ValidationOptions } from '@shared/types/validation'
import { ValidationHandler } from '@shared/utils/validation-handler'
import { TokenParser } from '@tokens/token-parser'
import type { InternalResolvedTokens, InternalTokenDocument, TokenValue } from '@tokens/types'
import type {
    AliasResolvedStage,
    EngineReadyStage,
    FinalStage,
    FlattenedStage,
    LintedStage,
    LoadedResolverStage,
    PreprocessedStage,
    RawTokensStage,
    ReferenceResolvedStage,
} from './pipeline-stages'

const ROOT_REF_PATTERN = /\.\$root\}/g

/**
 * Rewrite `{foo.$root}` → `{foo}` inside alias reference strings.
 * Handles plain string values and composite objects with nested references.
 */
function rewriteRootReferences(value: TokenValue): TokenValue {
  if (typeof value === 'string') {
    return ROOT_REF_PATTERN.test(value)
      ? (value.replace(ROOT_REF_PATTERN, '}') as TokenValue)
      : value
  }

  if (Array.isArray(value)) {
    let changed = false
    const mapped = value.map((item) => {
      const rewritten = rewriteRootReferences(item as TokenValue)
      if (rewritten !== item) changed = true
      return rewritten
    })
    return changed ? (mapped as TokenValue) : value
  }

  if (typeof value === 'object' && value !== null) {
    let changed = false
    const result: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(value)) {
      const rewritten = rewriteRootReferences(v as TokenValue)
      if (rewritten !== v) changed = true
      result[k] = rewritten
    }
    return changed ? (result as TokenValue) : value
  }

  return value
}

export type TokenPipelineOptions = {
  validation?: ValidationOptions
  lint?: LintBuildConfig
}

export type TokenPipelineResult = {
  tokens: InternalResolvedTokens
  resolutionEngine: ResolutionEngine
  modifierInputs: ModifierInputs
  lintResult?: LintResult
}

export class TokenPipeline {
  private options: TokenPipelineOptions
  private validationHandler: ValidationHandler
  private resolverLoader: ResolverLoader
  private tokenParser: TokenParser
  private aliasResolver: AliasResolver
  private lintRunner: LintRunner | null = null
  private lintConfigCache: LintBuildConfig | null = null

  constructor(options: TokenPipelineOptions = {}) {
    this.options = options
    this.validationHandler = new ValidationHandler(options.validation)
    this.resolverLoader = new ResolverLoader({ validation: options.validation })
    this.tokenParser = new TokenParser({ validation: options.validation })
    this.aliasResolver = new AliasResolver({ validation: options.validation })
  }
  /**
   * Execute the complete token resolution pipeline
   *
   * The pipeline executes in the following explicit stages:
   * 1. Load resolver document
   * 2. Create resolution engine
   * 3. Resolve tokens using modifier inputs
   * 4. Apply preprocessors (if provided)
   * 5. Resolve JSON Pointer references
   * 6. Parse and flatten token structure
   * 7. Resolve alias references
   * 8. Strip $root from token names/paths (DTCG structural mechanism, transparent in output)
   * 9. Run lint rules (if enabled)
   * 10. Apply filters (if provided) — runs first to remove tokens before transforms
   * 11. Apply transforms (if provided) — runs on the already-filtered token set
   *
   * Each stage is explicitly typed to ensure correct order and prevent temporal coupling.
   *
   * @param resolver - Either a file path (string) or an inline ResolverDocument object
   * @param modifierInputs - Modifier values for this permutation
   * @param transformList - Optional transforms to apply
   * @param preprocessorList - Optional preprocessors to apply
   * @param filterList - Optional filters to apply before transforms
   * @param lintConfig - Optional lint configuration for this run
   * @returns Final tokens, resolution engine, and lint result
   */
  async resolve(
    resolver: string | ResolverDocument,
    modifierInputs: ModifierInputs,
    transformList?: Transform[],
    preprocessorList?: Preprocessor[],
    filterList?: Filter[],
    lintConfig?: LintBuildConfig,
  ): Promise<TokenPipelineResult> {
    const effectiveLintConfig = lintConfig ?? this.options.lint
    const stage1 = await this.loadResolver(resolver)
    const engine = this.createEngine(stage1)
    const result = await this.runPipelineStages(
      engine,
      modifierInputs,
      preprocessorList,
      filterList,
      transformList,
      effectiveLintConfig,
    )

    return {
      tokens: result.tokens,
      resolutionEngine: result.resolutionEngine,
      modifierInputs: result.modifierInputs,
      lintResult: result.lintResult,
    }
  }

  /**
   * Run pipeline stages 3-11 on a pre-created engine
   *
   * Shared by both `resolve()` (single permutation) and
   * `resolveAllPermutations()` (parallel permutations) to keep the
   * stage sequence defined in exactly one place.
   */
  private async runPipelineStages(
    engine: EngineReadyStage,
    modifierInputs: ModifierInputs,
    preprocessorList?: Preprocessor[],
    filterList?: Filter[],
    transformList?: Transform[],
    lintConfig?: LintBuildConfig,
  ): Promise<FinalStage> {
    const rawTokens = await this.resolveTokens(engine, modifierInputs)
    const preprocessed = await this.preprocessTokens(rawTokens, preprocessorList)
    const refResolved = await this.resolveReferences(preprocessed)
    const flattened = this.flattenTokens(refResolved)
    const aliasResolved = this.resolveAliases(flattened)
    const rootStripped = this.stripRootTokenNames(aliasResolved)
    const linted = await this.runLintStage(rootStripped, lintConfig)
    const filtered = this.applyFilterStage(linted, filterList)
    return this.applyTransformStage(filtered, transformList)
  }

  /**
   * Stage 1: Load and parse resolver document
   */
  private async loadResolver(
    resolver: string | ResolverDocument,
  ): Promise<LoadedResolverStage> {
    return await this.resolverLoader.load(resolver)
  }

  /**
   * Stage 2: Create resolution engine
   *
   * @param stage - Loaded resolver stage
   * @param sharedCache - Optional shared file cache for parallel-safe instantiation.
   *   When provided, the ReferenceResolver shares this cache with other instances
   *   while keeping an independent `visited` set for circular-reference detection.
   */
  private createEngine(
    stage: LoadedResolverStage,
    sharedCache?: Map<string, unknown>,
  ): EngineReadyStage {
    const refResolver = new ReferenceResolver(stage.baseDir, {
      validation: this.options.validation,
      cache: sharedCache,
    })
    const resolutionEngine = new ResolutionEngine(stage.resolverDoc, refResolver, {
      validation: this.options.validation,
    })
    return { ...stage, resolutionEngine, refResolver }
  }

  /**
   * Stage 3: Resolve tokens using modifier inputs
   */
  private async resolveTokens(
    stage: EngineReadyStage,
    modifierInputs: ModifierInputs,
  ): Promise<RawTokensStage> {
    const result = await stage.resolutionEngine.resolveWithInputs(modifierInputs)
    return {
      ...stage,
      rawTokens: result.tokens,
      modifierInputs: result.modifierInputs,
    }
  }

  /**
   * Stage 4: Apply preprocessors to raw tokens
   */
  private async preprocessTokens(
    stage: RawTokensStage,
    preprocessorList?: Preprocessor[],
  ): Promise<PreprocessedStage> {
    let preprocessedTokens = stage.rawTokens

    if (preprocessorList !== undefined && preprocessorList.length > 0) {
      preprocessedTokens = await this.applyPreprocessors(stage.rawTokens, preprocessorList)
    }

    const { rawTokens: _rawTokens, ...rest } = stage
    return { ...rest, preprocessedTokens }
  }

  /**
   * Stage 5: Resolve JSON Pointer references
   */
  private async resolveReferences(stage: PreprocessedStage): Promise<ReferenceResolvedStage> {
    try {
      const resolved = await stage.refResolver.resolveDeepTokenDocument(
        stage.preprocessedTokens,
        stage.preprocessedTokens,
      )
      const { preprocessedTokens: _preprocessedTokens, ...rest } = stage
      return {
        ...rest,
        referenceResolvedTokens: resolved as InternalTokenDocument,
        referenceResolution: 'resolved',
      }
    } catch (error) {
      return this.handleReferenceResolutionError(stage, error)
    }
  }

  /**
   * Stage 6: Parse and flatten token structure
   */
  private flattenTokens(stage: ReferenceResolvedStage): FlattenedStage {
    const flatTokens = this.tokenParser.flatten(stage.referenceResolvedTokens)

    const { referenceResolvedTokens: _referenceResolvedTokens, ...rest } = stage
    return { ...rest, flatTokens }
  }

  /**
   * Stage 7: Resolve alias references
   */
  private resolveAliases(stage: FlattenedStage): AliasResolvedStage {
    const aliasResolvedTokens = this.aliasResolver.resolve(stage.flatTokens)

    const { flatTokens: _flatTokens, ...rest } = stage
    return { ...rest, aliasResolvedTokens }
  }

  /**
   * Stage 8: Strip `$root` from token names and paths.
   *
   * `$root` is a DTCG structural mechanism that allows a group to carry a
   * default value alongside child tokens. References must use the full path
   * (`{color.action.brand.$root}`) for alias resolution, but `$root` should
   * be transparent in output. This stage re-keys tokens so downstream
   * consumers (filters, transforms, renderers) see clean names.
   */
  private stripRootTokenNames(stage: AliasResolvedStage): AliasResolvedStage {
    const tokens = stage.aliasResolvedTokens
    const result: InternalResolvedTokens = {}

    for (const [key, token] of Object.entries(tokens)) {
      const rewrittenOriginal = rewriteRootReferences(token.originalValue)

      if (!key.endsWith('.$root')) {
        result[key] =
          rewrittenOriginal !== token.originalValue
            ? { ...token, originalValue: rewrittenOriginal }
            : token
        continue
      }

      const strippedPath = token.path.filter((segment) => segment !== '$root')
      const strippedName = strippedPath.join('.')

      result[strippedName] = {
        ...token,
        path: strippedPath,
        name: strippedName,
        originalValue: rewrittenOriginal,
      }
    }

    return { ...stage, aliasResolvedTokens: result }
  }

  /**
   * Stage 9: Run lint rules against tokens
   *
   * Linting runs after alias resolution and $root stripping but before
   * filters and transforms. This ensures rules see the full token set
   * with resolved values.
   */
  private async runLintStage(
    stage: AliasResolvedStage,
    lintConfig?: LintBuildConfig,
  ): Promise<LintedStage> {
    // Linting disabled or not configured
    if (!lintConfig?.enabled) {
      return stage
    }

    // Initialize lint runner if needed
    if (!this.lintRunner || !this.isLintConfigEqual(this.lintConfigCache, lintConfig)) {
      this.lintRunner = new LintRunner({
        plugins: lintConfig.plugins,
        rules: lintConfig.rules,
        onWarn: (msg) => this.validationHandler.warn(msg),
      })
      this.lintConfigCache = lintConfig
    }

    // Run lint
    const lintResult = await this.lintRunner.run(stage.aliasResolvedTokens)

    // Handle errors
    if (lintResult.errorCount > 0 && lintConfig.failOnError !== false) {
      throw new LintError(lintResult.issues)
    }

    // Log warnings
    for (const issue of lintResult.issues.filter(i => i.severity === 'warn')) {
      this.validationHandler.warn(
        `[${issue.ruleId}] ${issue.message} (token: ${issue.tokenName})`,
      )
    }

    return { ...stage, lintResult }
  }

  private isLintConfigEqual(a: LintBuildConfig | null, b: LintBuildConfig | undefined): boolean {
    if (!a || !b) return false
    if (a.enabled !== b.enabled) return false
    if (a.failOnError !== b.failOnError) return false
    if (a.plugins !== b.plugins) return false
    if (a.rules !== b.rules) return false
    return true
  }

  /**
   * Stage 10: Apply filters to the linted token set
   */
  private applyFilterStage(stage: LintedStage, filterList?: Filter[]): LintedStage {
    let tokens = stage.aliasResolvedTokens

    if (filterList !== undefined && filterList.length > 0) {
      tokens = applyFilters(tokens, filterList)
    }

    return { ...stage, aliasResolvedTokens: tokens }
  }

  /**
   * Stage 11: Apply transforms to the filtered token set
   */
  private applyTransformStage(stage: LintedStage, transformList?: Transform[]): FinalStage {
    let tokens = stage.aliasResolvedTokens

    if (transformList !== undefined && transformList.length > 0) {
      tokens = applyTransforms(tokens, transformList)
    }

    const { aliasResolvedTokens: _aliasResolvedTokens, ...rest } = stage
    return { ...rest, tokens }
  }

  private handleReferenceResolutionError(
    stage: PreprocessedStage,
    error: unknown,
  ): ReferenceResolvedStage {
    const wrappedError = error instanceof Error ? error : new Error(String(error))
    this.validationHandler.handleIssue(wrappedError)

    const message = wrappedError.message
    this.validationHandler.warn(`Reference resolution skipped: ${message}`)

    const { preprocessedTokens: _preprocessedTokens, ...rest } = stage
    return {
      ...rest,
      referenceResolvedTokens: stage.preprocessedTokens,
      referenceResolution: 'skipped',
      referenceResolutionMessage: message,
    }
  }

  /**
   * Resolve tokens for all permutations (parallelized)
   *
   * Creates independent resolution engines per permutation that share a
   * common file cache. Each engine has its own `visited` set so concurrent
   * resolution cannot trigger false circular-reference errors.
   *
   * @param resolver - Either a file path (string) or an inline ResolverDocument object
   * @param transformList - Optional transforms to apply
   * @param preprocessorList - Optional preprocessors to apply
   * @param filterList - Optional filters to apply before transforms
   * @param lintConfig - Optional lint configuration for this run
   */
  async resolveAllPermutations(
    resolver: string | ResolverDocument,
    transformList?: Transform[],
    preprocessorList?: Preprocessor[],
    filterList?: Filter[],
    lintConfig?: LintBuildConfig,
  ): Promise<
    {
      tokens: InternalResolvedTokens
      modifierInputs: ModifierInputs
      lintResult?: LintResult
    }[]
  > {
    const effectiveLintConfig = lintConfig ?? this.options.lint

    // Stage 1: Load resolver once
    const stage1 = await this.loadResolver(resolver)

    // Create an initial engine just to discover permutations
    const discoveryEngine = this.createEngine(stage1)
    const permutationInputs = discoveryEngine.resolutionEngine.generatePermutations()

    // Shared file cache: all per-permutation engines read/cache the same
    // parsed files, avoiding redundant I/O without sharing mutable `visited` state.
    const sharedCache: Map<string, unknown> = new Map()

    // Resolve every permutation in parallel, each with its own engine
    return await Promise.all(
      permutationInputs.map(async (modifierInputs) => {
        const engine = this.createEngine(stage1, sharedCache)
        const result = await this.runPipelineStages(
          engine,
          modifierInputs,
          preprocessorList,
          filterList,
          transformList,
          effectiveLintConfig,
        )

        return {
          tokens: result.tokens,
          modifierInputs: result.modifierInputs,
          lintResult: result.lintResult,
        }
      }),
    )
  }

  /**
   * Apply preprocessors to raw tokens
   */
  private async applyPreprocessors(
    rawTokens: InternalTokenDocument,
    preprocessorList: Preprocessor[],
  ): Promise<InternalTokenDocument> {
    let result = rawTokens

    for (const preprocessor of preprocessorList) {
      result = await preprocessor.preprocess(result)
    }

    return result
  }
}
