/**
 * @fileoverview Pipeline stage types and interfaces
 *
 * Defines explicit types for each stage of the token resolution pipeline.
 * This prevents temporal coupling by making the order explicit through types.
 */

import type { ReferenceResolver } from '@resolution/reference-resolver'
import type { ResolutionEngine } from '@resolution/resolution-engine'
import type { ModifierInputs, ResolverDocument } from '@config/index'
import type { InternalResolvedTokens, InternalTokenDocument } from '@tokens/types'

/**
 * Stage 1: Loaded resolver with base directory
 */
export type LoadedResolverStage = {
  resolverDoc: ResolverDocument
  baseDir: string
}

/**
 * Stage 2: Resolution engine ready to resolve tokens
 */
export type EngineReadyStage = LoadedResolverStage & {
  resolutionEngine: ResolutionEngine
  refResolver: ReferenceResolver
}

/**
 * Stage 3: Raw tokens resolved from the engine
 */
export type RawTokensStage = EngineReadyStage & {
  rawTokens: InternalTokenDocument
  modifierInputs: ModifierInputs
}

/**
 * Stage 4: Preprocessed tokens (after preprocessors applied)
 */
export type PreprocessedStage = Omit<RawTokensStage, 'rawTokens'> & {
  preprocessedTokens: InternalTokenDocument
}

/**
 * Stage 5: Reference-resolved tokens (after $ref resolution)
 */
export type ReferenceResolvedStage = Omit<PreprocessedStage, 'preprocessedTokens'> & {
  referenceResolvedTokens: InternalTokenDocument
  referenceResolution: 'resolved' | 'skipped'
  referenceResolutionMessage?: string
}

/**
 * Stage 6: Flattened tokens (after parsing and flattening)
 */
export type FlattenedStage = Omit<ReferenceResolvedStage, 'referenceResolvedTokens'> & {
  flatTokens: InternalResolvedTokens
}

/**
 * Stage 7: Alias-resolved tokens
 */
export type AliasResolvedStage = Omit<FlattenedStage, 'flatTokens'> & {
  aliasResolvedTokens: InternalResolvedTokens
}

/**
 * Stage 8: Final tokens (after transforms applied)
 */
export type FinalStage = Omit<AliasResolvedStage, 'aliasResolvedTokens'> & {
  tokens: InternalResolvedTokens
}

/**
 * Pipeline stage marker to ensure operations happen in the correct order
 */
export type PipelineStage =
  | LoadedResolverStage
  | EngineReadyStage
  | RawTokensStage
  | PreprocessedStage
  | ReferenceResolvedStage
  | FlattenedStage
  | AliasResolvedStage
  | FinalStage
