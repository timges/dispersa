/**
 * @fileoverview Configuration types for Dispersa
 */

import type { Filter } from '@processing/processors/filters/types'
import type { Preprocessor } from '@processing/processors/preprocessors/types'
import type { Transform } from '@processing/processors/transforms/types'
import type { BuildResult, FormatOptions, Renderer } from '@renderers/types'
import type { ModifierInputs, ResolverDocument } from '@resolution/resolution.types'
import type { ValidationOptions } from '@shared/types/validation'
import type {
  BuildConfigBase,
  CssRendererOptions,
  JsModuleRendererOptions,
  JsonRendererOptions,
  OutputConfigBase,
  DispersaOptionsBase,
} from '@validation/config-schemas'

// Re-export for convenience
export type { Filter, Preprocessor, Transform }

// Re-export renderer types
export type { CssRendererOptions, JsModuleRendererOptions, JsonRendererOptions }

// ============================================================================
// LIFECYCLE HOOK TYPES
// ============================================================================

/**
 * Lifecycle hooks for the build process.
 *
 * The same hook type is used on both `BuildConfig.hooks` (global) and
 * `OutputConfig.hooks` (per-output). All hooks are optional and support
 * both sync and async functions.
 *
 * **Execution order:**
 * 1. Global `onBuildStart`
 * 2. For each output: per-output `onBuildStart` → process → per-output `onBuildEnd`
 * 3. Global `onBuildEnd`
 */
export type LifecycleHooks = {
  /** Called before permutation resolution and output processing begins */
  onBuildStart?: (context: {
    config: BuildConfig
    resolver: string | ResolverDocument
  }) => void | Promise<void>

  /** Called after all outputs have been processed (success or failure) */
  onBuildEnd?: (result: BuildResult) => void | Promise<void>
}

// Re-export resolver types
export type { ModifierInputs, ResolverDocument }

// Re-export from renderers
export type { BuildResult, Renderer } from '@renderers/types'

// Re-export from tokens
export type { ResolvedToken, ResolvedTokens } from '@tokens/types'

// Re-export validation types
export type { ValidationOptions } from '@shared/types/validation'

/**
 * Output configuration for a single build target
 *
 * Defines how tokens should be formatted and output for a specific target
 * format (CSS, JSON, JavaScript, etc.).
 *
 * **Processing Order:**
 * - Global filters (from BuildConfig) are applied first to all outputs
 * - Then output-specific filters are applied (AND logic with global filters)
 * - Global transforms are applied next
 * - Finally output-specific transforms are applied
 *
 * **Output File Names:**
 * The `file` field supports subdirectories and dynamic naming patterns.
 * Parent directories are created automatically.
 *
 * @example Using builder helpers (recommended)
 * ```typescript
 * import { css, json } from 'dispersa'
 * import { colorToHex, dimensionToPx } from 'dispersa/transforms'
 *
 * // CSS output with transforms
 * css({
 *   name: 'css',
 *   file: 'css/tokens.css',
 *   preset: 'bundle',
 *   selector: ':root',
 *   transforms: [colorToHex(), dimensionToPx()],
 * })
 *
 * // JSON output with static filename
 * json({
 *   name: 'json',
 *   file: 'json/tokens.json',
 *   preset: 'standalone',
 *   structure: 'flat',
 * })
 * ```
 *
 * @example Pattern-based and function-based filenames
 * ```typescript
 * import { css } from 'dispersa'
 *
 * // Standalone mode with pattern-based filename
 * css({
 *   name: 'css-standalone',
 *   file: 'tokens-{theme}-{platform}.css', // → tokens-light-web.css, tokens-dark-mobile.css
 *   preset: 'standalone',
 *   selector: ':root',
 * })
 *
 * // Function-based filename
 * css({
 *   name: 'css-custom',
 *   preset: 'standalone',
 *   selector: ':root',
 *   file: (modifierInputs) => {
 *     const parts = Object.entries(modifierInputs).map(([k, v]) => `${k}-${v}`)
 *     return `tokens-${parts.join('-')}.css`
 *   },
 * })
 * ```
 *
 * @see CssRendererOptions
 * @see JsonRendererOptions
 * @see JsModuleRendererOptions
 */
export type OutputConfig<TOptions extends FormatOptions = FormatOptions> = Omit<
  OutputConfigBase,
  'renderer' | 'transforms' | 'filters' | 'file'
> & {
  /** Renderer instance (created via renderer factory function) */
  renderer: Renderer<TOptions>

  /**
   * Array of filter objects to apply
   * Filters are applied before transforms (to select which tokens to process)
   */
  filters?: Filter[]

  /** Array of transform objects to apply */
  transforms?: Transform[]

  /**
   * Output file path, can be static or dynamic
   *
   * Supports subdirectories (e.g., "css/tokens.css").
   * In standalone preset (one file per permutation), supports:
   * - Pattern strings with placeholders: `tokens-{theme}-{platform}.css`
   * - Function that receives modifierInputs: `(modifierInputs) => \`tokens-${...}.css\``
   * - Plain string (applies default pattern with all modifiers)
   *
   * @example
   * ```typescript
   * // Static filename (bundle preset or single permutation)
   * file: 'tokens.css'
   *
   * // With subdirectory
   * file: 'css/tokens.css'
   *
   * // Pattern with placeholders (standalone preset)
   * file: 'tokens-{theme}-{platform}.css'
   *
   * // Function for complex logic (standalone preset)
   * file: (modifierInputs) => {
   *   const parts = Object.entries(modifierInputs).map(([k, v]) => `${k}-${v}`)
   *   return `output/${parts.join('-')}/tokens.css`
   * }
   * ```
   */
  file?: string | ((modifierInputs: ModifierInputs) => string)

  /**
   * Renderer-specific options passed to the formatter.
   */
  options?: TOptions

  /**
   * Lifecycle hooks for this output.
   *
   * Per-output hooks fire in addition to global hooks on BuildConfig.
   * `onBuildStart` fires before this output is processed,
   * `onBuildEnd` fires after this output finishes (success or failure).
   */
  hooks?: LifecycleHooks
}

/**
 * Complete build configuration for Dispersa
 *
 * Defines all aspects of the token build process including input sources,
 * output targets, transforms, and permutation handling.
 *
 * **Complete Token Processing Pipeline:**
 *
 * 1. **Preprocessors** (BuildConfig.preprocessors)
 *    - Operate on raw JSON before parsing
 *    - Transform raw data structures
 *    - Example: strip custom metadata, inject env vars
 *
 * 2. **Parse & Resolve**
 *    - Parse token files according to DTCG spec
 *    - Resolve references between tokens
 *    - Apply modifiers (themes, modes, etc.)
 *    - Output: ResolvedTokens
 *
 * 3. **Global Filters** (BuildConfig.filters)
 *    - Applied to all tokens for all outputs
 *    - Example: exclude deprecated tokens globally
 *
 * 4. **Global Transforms** (BuildConfig.transforms)
 *    - Applied to all tokens for all outputs
 *    - Example: global naming conventions
 *
 * 5. **Per-Output Processing** (for each OutputConfig):
 *    a. **Output Filters** - Select which tokens to include (AND logic)
 *    b. **Output Transforms** - Modify selected tokens only
 *    c. **Renderer** - Generate output format and bundle output
 *
 * All transforms and filters are applied in array order.
 *
 * @example Basic usage with global filters and transforms
 * ```typescript
 * import { Dispersa, css, json } from 'dispersa'
 * import { byType } from 'dispersa/filters'
 * import { colorToHex, nameKebabCase } from 'dispersa/transforms'
 *
 * await dispersa.build({
 *   outputs: [
 *     css({ name: 'css', preset: 'bundle', selector: ':root' }),
 *     json({ name: 'json', preset: 'standalone', structure: 'flat' }),
 *   ],
 *   filters: [byType('color')], // Global filter - only include color tokens for all outputs
 *   transforms: [nameKebabCase(), colorToHex()], // Global transforms for all outputs
 * })
 * ```
 *
 * @example Combining global and output-specific filters
 * ```typescript
 * import { css, json } from 'dispersa'
 * import { byType } from 'dispersa/filters'
 * import { nameKebabCase } from 'dispersa/transforms'
 *
 * await dispersa.build({
 *   outputs: [
 *     css({
 *       name: 'css',
 *       preset: 'bundle',
 *       selector: ':root',
 *     }),
 *     json({
 *       name: 'json',
 *       preset: 'standalone',
 *       structure: 'flat',
 *     }),
 *   ],
 *   filters: [byType('color')],
 *   transforms: [nameKebabCase()],
 * })
 * ```
 */
export type BuildConfig = Omit<
  BuildConfigBase,
  'outputs' | 'filters' | 'transforms' | 'preprocessors' | 'permutations'
> & {
  /** Resolver configuration - file path or inline ResolverDocument */
  resolver?: string | ResolverDocument

  /** Output directory for generated files */
  buildPath?: string

  /** Array of output configurations defining target formats */
  outputs: OutputConfig[]

  /** Global filters to apply to all outputs before output-specific filters */
  filters?: Filter[]

  /** Global transforms to apply to all tokens before output-specific transforms */
  transforms?: Transform[]

  /** Global preprocessors to apply to raw token data before parsing */
  preprocessors?: Preprocessor[]

  /** Explicit permutations to build (modifier inputs) */
  permutations?: ModifierInputs[]

  /** Global lifecycle hooks for the build process */
  hooks?: LifecycleHooks
}

/**
 * Global options for Dispersa instance behavior
 *
 * Uses the generated base type from schemas - all properties match exactly.
 */
/**
 * Dispersa options with runtime-only validation helpers
 *
 * Schema validation supports "validation.mode" but cannot validate functions.
 */
export type DispersaOptions = Omit<DispersaOptionsBase, 'validation'> & {
  /** Resolver configuration - file path or inline ResolverDocument */
  resolver?: string | ResolverDocument

  /** Default output directory for generated files */
  buildPath?: string

  validation?: ValidationOptions
}
