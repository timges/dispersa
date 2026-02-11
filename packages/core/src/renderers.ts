/**
 * @license
 * Copyright (c) 2025 Dispersa Contributors
 * SPDX-License-Identifier: MIT
 */

/**
 * @fileoverview Renderers subpath export
 * Import from: dispersa/renderers
 *
 * Provides renderer types for implementing custom renderers,
 * plus the outputTree helper for multi-file output.
 */

// ============================================================================
// RENDERER TYPES
// ============================================================================

export type {
  BuildError,
  BuildResult,
  CssRendererOptions,
  ErrorCode,
  FigmaVariablesOptions,
  FormatOptions,
  JsModuleRendererOptions,
  JsonRendererOptions,
  OutputTree,
  Renderer,
  RenderContext,
  RenderMeta,
  RenderOutput,
} from '@renderers/types'

// ============================================================================
// CUSTOM RENDERER HELPERS
// ============================================================================

export { defineRenderer } from '@renderers/types'
export { outputTree, isOutputTree } from '@renderers/output-tree'
