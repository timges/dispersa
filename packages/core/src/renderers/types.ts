/**
 * @fileoverview Renderer system types for token output generation
 */

import type { ModifierInputs, OutputConfig, ResolverDocument } from '@config/index'
import type { ResolvedTokens } from '@lib/tokens/types'

/**
 * Generic options object for renderers
 *
 * Each renderer can define its own specific options that extend this base type.
 */
export type FormatOptions = Record<string, unknown>

/**
 * Data for a single permutation (combination of modifier values)
 */
export type PermutationData = {
  tokens: ResolvedTokens
  modifierInputs: ModifierInputs
}

/**
 * Metadata for renderers to reason about modifier dimensions.
 */
export type RenderMeta = {
  dimensions: string[]
  defaults: Record<string, string>
  basePermutation: ModifierInputs
}

/**
 * Context provided to renderer formatters.
 */
export type RenderContext<TOptions extends FormatOptions = FormatOptions> = {
  permutations: PermutationData[]
  output: OutputConfig<TOptions>
  resolver: ResolverDocument
  meta: RenderMeta
  buildPath?: string
}

/**
 * Multi-file output representation for renderers.
 */
export type OutputTree = {
  kind: 'outputTree'
  files: Record<string, string>
}

export type RenderOutput = string | OutputTree

/**
 * Output from a build operation
 */
export type BuildOutput = {
  name: string
  /** File path where output was written (undefined for in-memory mode) */
  path?: string
  content: string
}

/**
 * Renderer definition for converting tokens to output format
 *
 * Renderers implement a single `format()` method that can return either
 * a single string or an OutputTree for multi-file outputs.
 *
 * @example Simple renderer with format()
 * ```typescript
 * const scssRenderer: Renderer = {
 *   format: (context) => {
 *     const tokens = context.permutations[0]?.tokens ?? {}
 *     return Object.entries(tokens)
 *       .map(([name, token]) => `$${name}: ${token.$value};`)
 *       .join('\n')
 *   },
 * }
 * ```
 */
export type Renderer<TOptions extends FormatOptions = FormatOptions> = {
  /**
   * Preset identifier (e.g., 'bundle', 'standalone', 'modifier')
   * Indicates which variant of the renderer this is
   */
  preset?: string

  /**
   * Convert tokens to output content.
   *
   * Renderers receive all resolved permutations and modifier metadata via context.
   * They can return either a single string (single output file) or an OutputTree
   * for multi-file outputs.
   */
  format: (
    context: RenderContext<TOptions>,
    options?: TOptions,
  ) => RenderOutput | Promise<RenderOutput>
}

/**
 * Helper for defining custom renderers with full type inference.
 *
 * Works like Vue's `defineComponent()` or Vite's `defineConfig()` --
 * an identity function that enables TypeScript to infer the options type
 * from the generic parameter, giving you autocomplete and type-checking
 * on both `context` and `options` inside `format()`.
 *
 * @example
 * ```typescript
 * import { defineRenderer } from 'dispersa/renderers'
 *
 * type MyOptions = { prefix: string; minify?: boolean }
 *
 * const myRenderer = defineRenderer<MyOptions>({
 *   format(context, options) {
 *     // options is typed as MyOptions | undefined
 *     // context.output.options is typed as MyOptions | undefined
 *     const prefix = options?.prefix ?? 'token'
 *     return Object.entries(context.permutations[0]?.tokens ?? {})
 *       .map(([name, token]) => `${prefix}-${name}: ${token.$value}`)
 *       .join('\n')
 *   },
 * })
 * ```
 */
export function defineRenderer<T extends FormatOptions>(renderer: Renderer<T>): Renderer<T> {
  return renderer
}

/**
 * Function type for dynamically generating CSS selectors based on modifier context
 *
 * @param modifierName - Name of the modifier (e.g., 'theme', 'breakpoint')
 * @param context - Context value of the modifier (e.g., 'dark', 'mobile')
 * @param isBase - Whether this is the base permutation
 * @param allModifierInputs - All modifier inputs for this permutation
 * @returns CSS selector string (e.g., '[data-theme="dark"]')
 */
export type SelectorFunction = (
  modifierName: string,
  context: string,
  isBase: boolean,
  allModifierInputs: Record<string, string>,
) => string

/**
 * Function type for dynamically generating media queries based on modifier context
 *
 * @param modifierName - Name of the modifier (e.g., 'theme', 'breakpoint')
 * @param context - Context value of the modifier (e.g., 'dark', 'mobile')
 * @param isBase - Whether this is the base permutation
 * @param allModifierInputs - All modifier inputs for this permutation
 * @returns Media query string (e.g., '(max-width: 768px)') or empty string for no media query
 */
export type MediaQueryFunction = (
  modifierName: string,
  context: string,
  isBase: boolean,
  allModifierInputs: Record<string, string>,
) => string

/**
 * Options for CSS custom properties renderer
 *
 * Controls how tokens are converted to CSS custom properties (CSS variables).
 *
 * **Note:** Token naming is controlled through transforms, not renderer options.
 * Use `nameKebabCase()` and `namePrefix()` for naming control.
 *
 * @example String-based selectors
 * ```typescript
 * css({
 *   name: 'tokens',
 *   file: 'tokens.css',
 *   transforms: [nameKebabCase(), namePrefix('ds-')],
 *   preset: 'bundle',
 *   selector: ':root',
 * })
 * ```
 *
 * @example Function-based selectors
 * ```typescript
 * outputs: [{
 *   renderer: cssRenderer(),
 *   options: {
 *     preset: 'bundle',
 *     selector: (modifier, context, isBase, allInputs) => {
 *       if (isBase) return ':root'
 *       return `[data-${modifier}="${context}"]`
 *     },
 *     mediaQuery: (modifier, context) => {
 *       if (modifier === 'breakpoint' && context === 'mobile') {
 *         return '(max-width: 768px)'
 *       }
 *       return ''
 *     }
 *   }
 * }]
 * ```
 */
export type CssRendererOptions = {
  preset?: 'bundle' | 'standalone' | 'modifier'
  selector?: string | SelectorFunction
  mediaQuery?: string | MediaQueryFunction
  minify?: boolean
  preserveReferences?: boolean
}

/**
 * Options for JSON renderer
 *
 * Controls the structure and formatting of JSON token output.
 *
 * @example
 * ```typescript
 * {
 *   structure: 'flat',
 *   minify: true,
 *   includeMetadata: true
 * }
 * ```
 */
export type { JsonRendererOptions } from '@lib/validation/config-schemas'

/**
 * Options for JavaScript module renderer
 *
 * Generates JavaScript modules for direct import in applications.
 * Aligned with JSON renderer options for consistency.
 *
 * @example
 * ```typescript
 * {
 *   structure: 'nested',
 *   minify: false,
 *   moduleName: 'designTokens'
 * }
 * ```
 */
export type { JsModuleRendererOptions } from '@lib/validation/config-schemas'

/**
 * Result of a token build operation
 *
 * Contains success status, generated output files, and any errors encountered.
 *
 * @example
 * ```typescript
 * const result = await dispersa.build(config)
 * if (result.success) {
 *   result.outputs.forEach(output => {
 *     console.log(`Generated ${output.name}: ${output.path}`)
 *   })
 * } else {
 *   console.error('Build errors:', result.errors)
 * }
 * ```
 */
/**
 * Error code identifying the type of build error
 */
export type ErrorCode =
  | 'TOKEN_REFERENCE'
  | 'CIRCULAR_REFERENCE'
  | 'VALIDATION'
  | 'COLOR_PARSE'
  | 'DIMENSION_FORMAT'
  | 'FILE_OPERATION'
  | 'CONFIGURATION'
  | 'BASE_PERMUTATION'
  | 'MODIFIER'
  | 'UNKNOWN'

/**
 * Structured error from a build operation
 *
 * Preserves typed context from the error hierarchy so consumers
 * can programmatically react to specific failure modes.
 */
export type BuildError = {
  /** Human-readable error message */
  message: string

  /** Machine-readable error code identifying the failure type */
  code: ErrorCode

  /** File path where the error occurred (for file operation errors) */
  path?: string

  /** Token path where the error occurred (e.g. 'color.primary') */
  tokenPath?: string

  /** Error severity */
  severity: 'error' | 'warning'

  /** Suggested alternatives (e.g. similar token names for TOKEN_REFERENCE errors) */
  suggestions?: string[]
}

export type BuildResult = {
  /** Whether the build completed successfully */
  success: boolean

  /** Array of generated output files */
  outputs: BuildOutput[]

  /** Array of errors encountered during build (only present if success is false) */
  errors?: BuildError[]
}
