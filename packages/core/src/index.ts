/**
 * @license
 * Copyright (c) 2025 Dispersa Contributors
 * SPDX-License-Identifier: MIT
 */

/**
 * @fileoverview Dispersa - DTCG Design Token Processor
 * Main public API exports
 */

// ============================================================================
// PRIMARY API
// ============================================================================

export { Dispersa } from './dispersa'

// ============================================================================
// PUBLIC TYPES
// ============================================================================

// Config types
export type {
  OutputConfig,
  BuildConfig,
  LifecycleHooks,
  DispersaOptions,
  ValidationOptions,
} from '@config/index'

// Validation types
export type { ValidationMode } from '@shared/types/validation'

// Token types
export type {
  ResolvedToken,
  ResolvedTokens,
  DesignTokenValue,
  ColorToken,
  DimensionToken,
  ShadowToken,
  DurationToken,
  ColorValueObject,
  DimensionValue,
  ShadowValueObject,
  TypographyValue,
  BorderValue,
  TransitionValue,
  GradientValue,
  TokenType,
} from '@lib/tokens/types'

// Token type guards
export {
  isColorToken,
  isDimensionToken,
  isShadowToken,
  isTypographyToken,
  isBorderToken,
  isDurationToken,
  isTransitionToken,
  isGradientToken,
} from '@lib/tokens/types'

// Transform types
export type { Transform } from '@lib/processing/processors/transforms/types'

// Filter types
export type { Filter } from '@lib/processing/processors/filters/types'

// Preprocessor types
export type { Preprocessor } from '@lib/processing/processors/preprocessors/types'

// Renderer types
export type {
  BuildError,
  BuildOutput,
  BuildResult,
  CssRendererOptions,
  ErrorCode,
  FormatOptions,
  JsModuleRendererOptions,
  JsonRendererOptions,
  MediaQueryFunction,
  OutputTree,
  PermutationData,
  Renderer,
  RenderContext,
  RenderMeta,
  RenderOutput,
  SelectorFunction,
} from '@renderers/types'

// Resolver types
export type { ModifierInputs, ResolverDocument } from '@lib/resolution/resolution.types'

// ============================================================================
// OUTPUT BUILDERS
// ============================================================================

export { css, json, js } from './builders'
export type { CssBuilderConfig, JsonBuilderConfig, JsBuilderConfig } from './builders'

// ============================================================================
// CUSTOM RENDERER HELPERS
// ============================================================================

export { defineRenderer } from '@renderers/types'
export { outputTree, isOutputTree } from '@renderers/output-tree'

// ============================================================================
// ERROR CLASSES
// ============================================================================

export {
  DispersaError,
  TokenReferenceError,
  CircularReferenceError,
  ValidationError,
  ColorParseError,
  DimensionFormatError,
  FileOperationError,
  ConfigurationError,
  BasePermutationError,
  ModifierError,
} from '@shared/errors/index'
