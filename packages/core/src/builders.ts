/**
 * @license
 * Copyright (c) 2025 Dispersa Contributors
 * SPDX-License-Identifier: MIT
 */

/**
 * @fileoverview Builder functions for creating output configurations
 *
 * These builder functions provide a convenient way to create OutputConfig objects
 * with flattened options for better DX and discoverability.
 */

import type { FileFunction, LifecycleHooks, OutputConfig } from '@config/index'
import type { Filter } from '@processing/processors/filters/types'
import type { Transform } from '@processing/processors/transforms/types'
import { androidRenderer } from '@renderers/android'
import { cssRenderer } from '@renderers/css'
import { iosRenderer } from '@renderers/ios'
import { jsRenderer } from '@renderers/js-module'
import { jsonRenderer } from '@renderers/json'
import { tailwindRenderer } from '@renderers/tailwind'
import type {
  AndroidRendererOptions,
  CssRendererOptions,
  IosRendererOptions,
  JsModuleRendererOptions,
  JsonRendererOptions,
  TailwindRendererOptions,
} from '@renderers/types'

// ============================================================================
// BASE BUILDER CONFIGURATION
// ============================================================================

/**
 * Base configuration shared across all builders
 */
type BuilderConfigBase = {
  /** Unique identifier for this output */
  name: string

  /** Output file path (string, pattern with {placeholders}, or function) - optional for in-memory mode */
  file?: string | FileFunction

  /** Array of transform functions to apply */
  transforms?: Transform[]

  /** Array of filter functions to apply */
  filters?: Filter[]

  /** Per-output lifecycle hooks */
  hooks?: LifecycleHooks
}

// ============================================================================
// CSS BUILDER
// ============================================================================

/**
 * CSS builder configuration with flattened options
 */
export type CssBuilderConfig = BuilderConfigBase & CssRendererOptions

/**
 * Create CSS output configuration with flattened options
 *
 * Creates an OutputConfig for CSS custom properties output. All CSS-specific options
 * (selector, mediaQuery, etc.) are provided at the top level alongside common options
 * like name and file for improved discoverability.
 *
 * @param config - CSS builder configuration with flattened options
 * @returns Complete OutputConfig ready for use in build()
 *
 * @remarks
 * The preset defaults to 'bundle' for CSS, meaning all themes are combined into
 * one file with appropriate selectors. Use preset: 'standalone' for separate files.
 *
 * The `file` property is optional. When omitted, content is returned in-memory instead
 * of being written to disk. The `file` property is required when `buildPath` is provided
 * to `dispersa.build()`.
 *
 * @example Basic CSS bundle with transforms
 * ```typescript
 * import { css } from 'dispersa'
 * import { nameKebabCase } from 'dispersa/transforms'
 *
 * const config = css({
 *   name: 'css',
 *   file: 'tokens.css',
 *   preset: 'bundle',
 *   selector: ':root',
 *   transforms: [nameKebabCase()]
 * })
 * ```
 *
 * @example Standalone CSS with filters
 * ```typescript
 * import { css } from 'dispersa'
 * import { byType } from 'dispersa/filters'
 *
 * const config = css({
 *   name: 'css-colors',
 *   file: 'colors-{theme}.css',
 *   preset: 'standalone',
 *   selector: ':root',
 *   filters: [byType('color')]
 * })
 * ```
 *
 * @example In-memory mode without file output
 * ```typescript
 * import { css } from 'dispersa'
 *
 * const config = css({
 *   name: 'css',
 *   preset: 'bundle',
 *   selector: ':root'
 * })
 * // Use without buildPath to get content in-memory
 * const result = await dispersa.build({ outputs: [config] })
 * console.log(result.outputs[0].content)
 * ```
 */
export function css(config: CssBuilderConfig): OutputConfig<CssRendererOptions> {
  const {
    name,
    file,
    transforms,
    filters,
    hooks,
    preset = 'bundle',
    ...rendererOptions
  }: CssBuilderConfig = config

  return {
    name,
    file,
    renderer: cssRenderer(),
    options: { preset, ...rendererOptions },
    transforms,
    filters,
    hooks,
  }
}

// ============================================================================
// JSON BUILDER
// ============================================================================

/**
 * JSON builder configuration with flattened options
 */
export type JsonBuilderConfig = BuilderConfigBase & JsonRendererOptions

/**
 * Create JSON output configuration with flattened options
 *
 * Creates an OutputConfig for JSON token output. All JSON-specific options
 * (structure, includeMetadata, etc.) are provided at the top level for improved
 * discoverability and cleaner configuration.
 *
 * @param config - JSON builder configuration with flattened options
 * @returns Complete OutputConfig ready for use in build()
 *
 * @remarks
 * The preset defaults to 'standalone' for JSON, meaning separate files per theme.
 * Use preset: 'bundle' to combine all themes into one file with metadata.
 *
 * The `file` property is optional. When omitted, content is returned in-memory instead
 * of being written to disk. The `file` property is required when `buildPath` is provided
 * to `dispersa.build()`.
 *
 * @example Standalone JSON with flat structure
 * ```typescript
 * import { json } from 'dispersa'
 *
 * const config = json({
 *   name: 'json',
 *   file: 'tokens-{theme}.json',
 *   preset: 'standalone',
 *   structure: 'flat'
 * })
 * ```
 *
 * @example Bundle JSON with metadata
 * ```typescript
 * import { json } from 'dispersa'
 *
 * const config = json({
 *   name: 'json-bundle',
 *   file: 'tokens.json',
 *   preset: 'bundle',
 *   structure: 'nested',
 *   includeMetadata: true
 * })
 * ```
 *
 * @example In-memory mode without file output
 * ```typescript
 * import { json } from 'dispersa'
 *
 * const config = json({
 *   name: 'json',
 *   preset: 'standalone',
 *   structure: 'flat'
 * })
 * // Use without buildPath to get content in-memory
 * const result = await dispersa.build({ outputs: [config] })
 * console.log(result.outputs[0].content)
 * ```
 */
export function json(config: JsonBuilderConfig): OutputConfig<JsonRendererOptions> {
  const {
    name,
    file,
    transforms,
    filters,
    hooks,
    preset = 'standalone',
    ...rendererOptions
  } = config

  return {
    name,
    file,
    renderer: jsonRenderer(),
    options: { preset, ...rendererOptions },
    transforms,
    filters,
    hooks,
  }
}

// ============================================================================
// JS MODULE BUILDER
// ============================================================================

/**
 * JS module builder configuration with flattened options
 */
export type JsBuilderConfig = BuilderConfigBase & JsModuleRendererOptions

/**
 * Create JavaScript module output configuration with flattened options
 *
 * Creates an OutputConfig for JavaScript/TypeScript module output. All JS-specific
 * options (moduleName, generateHelper, etc.) are provided at the top level for
 * improved discoverability and cleaner configuration.
 *
 * @param config - JS module builder configuration with flattened options
 * @returns Complete OutputConfig ready for use in build()
 *
 * @remarks
 * The preset defaults to 'standalone' for JS, meaning separate files per theme.
 * Use preset: 'bundle' with generateHelper: true to create a single file with
 * a helper function for dynamic theme switching.
 *
 * The `file` property is optional. When omitted, content is returned in-memory instead
 * of being written to disk. The `file` property is required when `buildPath` is provided
 * to `dispersa.build()`.
 *
 * @example Bundle JS with helper function
 * ```typescript
 * import { js } from 'dispersa'
 * import { nameCamelCase } from 'dispersa/transforms'
 *
 * const config = js({
 *   name: 'js',
 *   file: 'tokens.js',
 *   preset: 'bundle',
 *   moduleName: 'tokens',
 *   generateHelper: true,
 *   transforms: [nameCamelCase()]
 * })
 * ```
 *
 * @example Standalone JS modules
 * ```typescript
 * import { js } from 'dispersa'
 *
 * const config = js({
 *   name: 'js-tokens',
 *   file: 'tokens-{theme}.js',
 *   preset: 'standalone',
 *   structure: 'flat'
 * })
 * ```
 *
 * @example In-memory mode without file output
 * ```typescript
 * import { js } from 'dispersa'
 *
 * const config = js({
 *   name: 'js',
 *   preset: 'standalone',
 *   structure: 'flat'
 * })
 * // Use without buildPath to get content in-memory
 * const result = await dispersa.build({ outputs: [config] })
 * console.log(result.outputs[0].content)
 * ```
 */
export function js(config: JsBuilderConfig): OutputConfig<JsModuleRendererOptions> {
  const {
    name,
    file,
    transforms,
    filters,
    hooks,
    preset = 'standalone',
    ...rendererOptions
  } = config

  return {
    name,
    file,
    renderer: jsRenderer(),
    options: { preset, ...rendererOptions },
    transforms,
    filters,
    hooks,
  }
}

// ============================================================================
// TAILWIND CSS v4 BUILDER
// ============================================================================

/**
 * Tailwind CSS v4 builder configuration with flattened options
 */
export type TailwindBuilderConfig = BuilderConfigBase & TailwindRendererOptions

/**
 * Create Tailwind CSS v4 output configuration with flattened options
 *
 * Creates an OutputConfig for Tailwind v4 @theme CSS output. All Tailwind-specific
 * options (includeImport, namespace, etc.) are provided at the top level for
 * improved discoverability.
 *
 * @param config - Tailwind builder configuration with flattened options
 * @returns Complete OutputConfig ready for use in build()
 *
 * @remarks
 * The preset defaults to 'bundle' for Tailwind, meaning the base permutation tokens
 * are used to define the @theme vocabulary. Use preset: 'standalone' for separate files.
 *
 * @example Bundle Tailwind theme with transforms
 * ```typescript
 * import { tailwind } from 'dispersa'
 * import { nameKebabCase } from 'dispersa/transforms'
 *
 * const config = tailwind({
 *   name: 'tailwind',
 *   file: 'theme.css',
 *   preset: 'bundle',
 *   includeImport: true,
 *   transforms: [nameKebabCase()]
 * })
 * ```
 *
 * @example Standalone files per theme
 * ```typescript
 * import { tailwind } from 'dispersa'
 *
 * const config = tailwind({
 *   name: 'tailwind',
 *   file: 'theme-{theme}.css',
 *   preset: 'standalone',
 *   includeImport: false,
 * })
 * ```
 */
export function tailwind(config: TailwindBuilderConfig): OutputConfig<TailwindRendererOptions> {
  const { name, file, transforms, filters, hooks, preset = 'bundle', ...rendererOptions } = config

  return {
    name,
    file,
    renderer: tailwindRenderer(),
    options: { preset, ...rendererOptions },
    transforms,
    filters,
    hooks,
  }
}

// ============================================================================
// iOS / SWIFTUI BUILDER
// ============================================================================

/**
 * iOS/SwiftUI builder configuration with flattened options
 */
export type IosBuilderConfig = BuilderConfigBase & IosRendererOptions

/**
 * Create iOS/SwiftUI output configuration with flattened options
 *
 * Creates an OutputConfig for Swift code generation targeting SwiftUI (iOS 17+, Swift 6).
 * All iOS-specific options (accessLevel, structure, etc.) are provided at the top level.
 *
 * @param config - iOS builder configuration with flattened options
 * @returns Complete OutputConfig ready for use in build()
 *
 * @remarks
 * Only standalone preset is supported. Each permutation generates a separate Swift file.
 *
 * @example Enum-based SwiftUI tokens
 * ```typescript
 * import { ios } from 'dispersa'
 *
 * const config = ios({
 *   name: 'ios',
 *   file: 'DesignTokens-{theme}.swift',
 *   accessLevel: 'public',
 *   structure: 'enum',
 *   enumName: 'DesignTokens',
 *   colorSpace: 'sRGB',
 * })
 * ```
 *
 * @example Grouped SwiftUI tokens (namespace enum + extensions per group)
 * ```typescript
 * import { ios } from 'dispersa'
 *
 * const config = ios({
 *   name: 'ios-tokens',
 *   file: 'Tokens-{theme}.swift',
 *   structure: 'grouped',
 *   colorSpace: 'displayP3',
 * })
 * ```
 */
export function ios(config: IosBuilderConfig): OutputConfig<IosRendererOptions> {
  const {
    name,
    file,
    transforms,
    filters,
    hooks,
    preset = 'standalone',
    ...rendererOptions
  } = config

  return {
    name,
    file,
    renderer: iosRenderer(),
    options: { preset, ...rendererOptions },
    transforms,
    filters,
    hooks,
  }
}

// ============================================================================
// ANDROID / JETPACK COMPOSE BUILDER
// ============================================================================

/**
 * Android/Jetpack Compose builder configuration with flattened options
 */
export type AndroidBuilderConfig = BuilderConfigBase & AndroidRendererOptions

/**
 * Create Android/Jetpack Compose output configuration with flattened options
 *
 * Creates an OutputConfig for Kotlin code generation targeting Jetpack Compose
 * with Material 3. All Android-specific options (packageName, objectName, etc.)
 * are provided at the top level.
 *
 * @experimental This builder is experimental. Options and generated output may change.
 * @param config - Android builder configuration with flattened options
 * @returns Complete OutputConfig ready for use in build()
 *
 * @remarks
 * The `packageName` option is required (Kotlin convention). Supports both
 * `'standalone'` (default, one file per permutation) and `'bundle'` (all
 * permutations in a single file) presets.
 *
 * @example Standalone Compose tokens with hex colors
 * ```typescript
 * import { android } from 'dispersa'
 *
 * const config = android({
 *   name: 'android',
 *   file: 'DesignTokens-{theme}.kt',
 *   packageName: 'com.example.tokens',
 *   objectName: 'DesignTokens',
 *   colorFormat: 'argb_hex',
 * })
 * ```
 *
 * @example Flat structure with Display P3 colors
 * ```typescript
 * import { android } from 'dispersa'
 *
 * const config = android({
 *   name: 'android-tokens',
 *   file: 'Tokens-{theme}.kt',
 *   packageName: 'com.example.design',
 *   structure: 'flat',
 *   colorSpace: 'displayP3',
 *   colorFormat: 'argb_float',
 * })
 * ```
 *
 * @example Bundle mode — all themes in one file
 * ```typescript
 * import { android } from 'dispersa'
 *
 * const config = android({
 *   name: 'android-bundle',
 *   file: 'DesignTokens.kt',
 *   packageName: 'com.example.tokens',
 *   preset: 'bundle',
 *   structure: 'flat',
 * })
 * ```
 */
export function android(config: AndroidBuilderConfig): OutputConfig<AndroidRendererOptions> {
  const {
    name,
    file,
    transforms,
    filters,
    hooks,
    preset = 'standalone',
    ...rendererOptions
  } = config

  return {
    name,
    file,
    renderer: androidRenderer(),
    options: { preset, ...rendererOptions },
    transforms,
    filters,
    hooks,
  }
}
