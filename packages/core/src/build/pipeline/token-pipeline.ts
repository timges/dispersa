/**
 * @fileoverview Token resolution pipeline
 * Handles the flow: parse resolver → resolve tokens → preprocess → resolve $ref → flatten → resolve aliases → apply transforms
 *
 * Pipeline stages are explicitly typed to prevent temporal coupling and ensure
 * operations happen in the correct order.
 */

import { ResolverLoader } from '@adapters/filesystem/resolver-loader'
import type {
  Filter,
  ModifierInputs,
  Preprocessor,
  ResolverDocument,
  Transform,
} from '@config/index'
import type { ValidationOptions } from '@shared/types/validation'
import { ValidationHandler } from '@shared/utils/validation-handler'
import { applyFilters, applyTransforms } from '@lib/processing/token-modifier'
import { AliasResolver } from '@lib/resolution/alias-resolver'
import { ReferenceResolver } from '@lib/resolution/reference-resolver'
import { ResolutionEngine } from '@lib/resolution/resolution-engine'
import { TokenParser } from '@lib/tokens/token-parser'
import type { InternalResolvedTokens, InternalTokenDocument } from '@lib/tokens/types'
import type {
  AliasResolvedStage,
  EngineReadyStage,
  FinalStage,
  FlattenedStage,
  LoadedResolverStage,
  PreprocessedStage,
  ReferenceResolvedStage,
  RawTokensStage,
} from './pipeline-stages'

export type TokenPipelineOptions = {
  validation?: ValidationOptions
}

export class TokenPipeline {
  private options: TokenPipelineOptions
  private validationHandler: ValidationHandler
  private resolverLoader: ResolverLoader
  private tokenParser: TokenParser
  private aliasResolver: AliasResolver

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
   * 8. Apply filters (if provided) — runs first to remove tokens before transforms
   * 9. Apply transforms (if provided) — runs on the already-filtered token set
   *
   * Each stage is explicitly typed to ensure correct order and prevent temporal coupling.
   *
   * @param resolver - Either a file path (string) or an inline ResolverDocument object
   * @param modifierInputs - Modifier values for this permutation
   * @param transformList - Optional transforms to apply
   * @param preprocessorList - Optional preprocessors to apply
   * @param filterList - Optional filters to apply before transforms
   * @returns Final tokens and resolution engine
   */
  async resolve(
    resolver: string | ResolverDocument,
    modifierInputs: ModifierInputs,
    transformList?: Transform[],
    preprocessorList?: Preprocessor[],
    filterList?: Filter[],
  ): Promise<{
    tokens: InternalResolvedTokens
    resolutionEngine: ResolutionEngine
    modifierInputs: ModifierInputs
  }> {
    const stage1 = await this.loadResolver(resolver)
    const engine = this.createEngine(stage1)
    const result = await this.runPipelineStages(
      engine,
      modifierInputs,
      preprocessorList,
      filterList,
      transformList,
    )

    return {
      tokens: result.tokens,
      resolutionEngine: result.resolutionEngine,
      modifierInputs: result.modifierInputs,
    }
  }

  /**
   * Run pipeline stages 3-9 on a pre-created engine
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
  ): Promise<FinalStage> {
    const rawTokens = await this.resolveTokens(engine, modifierInputs)
    const preprocessed = await this.preprocessTokens(rawTokens, preprocessorList)
    const refResolved = await this.resolveReferences(preprocessed)
    const flattened = this.flattenTokens(refResolved)
    const aliasResolved = this.resolveAliases(flattened)
    const filtered = this.applyFilterStage(aliasResolved, filterList)
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
   * Stage 8: Apply filters to final tokens (before transforms to skip unnecessary work)
   */
  private applyFilterStage(stage: AliasResolvedStage, filterList?: Filter[]): AliasResolvedStage {
    let tokens = stage.aliasResolvedTokens

    if (filterList !== undefined && filterList.length > 0) {
      tokens = applyFilters(tokens, filterList)
    }

    return { ...stage, aliasResolvedTokens: tokens }
  }

  /**
   * Stage 9: Apply transforms to the filtered token set
   */
  private applyTransformStage(stage: AliasResolvedStage, transformList?: Transform[]): FinalStage {
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
   */
  async resolveAllPermutations(
    resolver: string | ResolverDocument,
    transformList?: Transform[],
    preprocessorList?: Preprocessor[],
    filterList?: Filter[],
  ): Promise<
    {
      tokens: InternalResolvedTokens
      modifierInputs: ModifierInputs
    }[]
  > {
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
        )

        return {
          tokens: result.tokens,
          modifierInputs: result.modifierInputs,
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
