/**
 * @fileoverview JSON Schemas for configuration validation
 *
 * Defines JSON schemas for validating user-provided configurations including
 * BuildConfig, OutputConfig, DispersaOptions, and custom plugin registrations.
 * Types are automatically generated from these schemas using json-schema-to-ts.
 */

import type { FromSchema, JSONSchema } from 'json-schema-to-ts'

import { resolverSchema } from './schemas'

const resolverSchemaRef = resolverSchema as unknown as JSONSchema

/**
 * Base plugin properties shared across all plugin types
 */
const basePluginProperties = {
  name: {
    type: 'string',
    minLength: 1,
    description: 'Unique identifier for the plugin',
  },
} as const

/**
 * Common renderer options shared across multiple renderers
 */
const commonRendererOptionsProperties = {
  minify: { type: 'boolean' },
} as const

/**
 * CSS Renderer Options Schema
 */
export const cssRendererOptionsSchema = {
  $schema: 'http://json-schema.org/draft-07/schema#',
  type: 'object',
  properties: {
    preset: { type: 'string', enum: ['bundle', 'standalone', 'modifier'] },
    selector: { type: 'string' },
    mediaQuery: { type: 'string' },
    preserveReferences: { type: 'boolean' },
    ...commonRendererOptionsProperties,
  },
  additionalProperties: true, // Allow custom properties for extended renderers
} as const

/**
 * JSON Renderer Options Schema
 */
export const jsonRendererOptionsSchema = {
  $schema: 'http://json-schema.org/draft-07/schema#',
  type: 'object',
  properties: {
    preset: { type: 'string', enum: ['bundle', 'standalone'] },
    structure: { type: 'string', enum: ['flat', 'nested'] },
    includeMetadata: { type: 'boolean' },
    ...commonRendererOptionsProperties,
  },
  additionalProperties: true, // Allow custom properties for extended renderers
} as const

/**
 * JS Module Renderer Options Schema
 */
export const jsModuleRendererOptionsSchema = {
  $schema: 'http://json-schema.org/draft-07/schema#',
  type: 'object',
  properties: {
    preset: { type: 'string', enum: ['bundle', 'standalone'] },
    structure: { type: 'string', enum: ['flat', 'nested'] },
    moduleName: { type: 'string' },
    generateHelper: {
      type: 'boolean',
      description: 'Generate helper function for token lookup (bundle mode only)',
    },
    ...commonRendererOptionsProperties,
  },
  additionalProperties: true, // Allow custom properties for extended renderers
} as const

/**
 * Tailwind CSS v4 Renderer Options Schema
 */
export const tailwindRendererOptionsSchema = {
  $schema: 'http://json-schema.org/draft-07/schema#',
  type: 'object',
  properties: {
    preset: { type: 'string', enum: ['bundle', 'standalone'] },
    includeImport: {
      type: 'boolean',
      description: 'Prepend @import "tailwindcss" to the output',
    },
    namespace: {
      type: 'string',
      description: 'Optional Tailwind namespace prefix for @theme',
    },
    selector: { type: 'string' },
    mediaQuery: { type: 'string' },
    ...commonRendererOptionsProperties,
  },
  additionalProperties: true,
} as const

/**
 * iOS/SwiftUI Renderer Options Schema
 */
export const iosRendererOptionsSchema = {
  $schema: 'http://json-schema.org/draft-07/schema#',
  type: 'object',
  properties: {
    preset: { type: 'string', enum: ['standalone'] },
    accessLevel: { type: 'string', enum: ['public', 'internal'] },
    structure: { type: 'string', enum: ['enum', 'grouped'] },
    enumName: {
      type: 'string',
      description: 'Root enum name for enum structure (default: DesignTokens)',
    },
    extensionNamespace: {
      type: 'string',
      description: 'Namespace enum name used in grouped mode (default: DesignTokens)',
    },
    colorSpace: {
      type: 'string',
      enum: ['sRGB', 'displayP3'],
      description: 'Color space for SwiftUI Color initializer',
    },
    swiftVersion: {
      type: 'string',
      enum: ['5.9', '6.0'],
      description: 'Target Swift language version (default: 5.9)',
    },
    indent: {
      type: 'number',
      minimum: 1,
      description: 'Number of spaces per indentation level (default: 4)',
    },
    frozen: {
      type: 'boolean',
      description: 'Add @frozen annotation to enums and structs for ABI stability (default: false)',
    },
  },
  additionalProperties: true,
} as const

/**
 * Android/Jetpack Compose Renderer Options Schema
 */
export const androidRendererOptionsSchema = {
  $schema: 'http://json-schema.org/draft-07/schema#',
  type: 'object',
  required: ['packageName'],
  properties: {
    preset: { type: 'string', enum: ['standalone', 'bundle'] },
    packageName: {
      type: 'string',
      minLength: 1,
      description: 'Kotlin package name (required, e.g., com.example.tokens)',
    },
    objectName: {
      type: 'string',
      description: 'Root object name (default: DesignTokens)',
    },
    colorFormat: {
      type: 'string',
      enum: ['argb_hex', 'argb_float', 'argb8', 'argb_floats'],
      description:
        'Color output format: argb_hex for Color(0xAARRGGBB), argb_float for Color(r, g, b, a). Legacy aliases: argb8 → argb_hex, argb_floats → argb_float',
    },
    colorSpace: {
      type: 'string',
      enum: ['sRGB', 'displayP3'],
      description: 'Color space for Color initializers (default: sRGB)',
    },
    structure: {
      type: 'string',
      enum: ['nested', 'flat'],
      description:
        'Token organization: nested mirrors path hierarchy, flat groups by $type (default: nested)',
    },
    visibility: {
      type: 'string',
      enum: ['public', 'internal'],
      description: 'Kotlin visibility modifier for generated declarations',
    },
    indent: {
      type: 'number',
      minimum: 1,
      description: 'Number of spaces per indentation level (default: 4)',
    },
  },
  additionalProperties: true,
  errorMessage: {
    required: {
      packageName: 'Android renderer requires a "packageName" property',
    },
  },
} as const

/**
 * Transform Plugin Schema
 *
 * Validates structure of Transform objects at registration time.
 * Note: Function properties cannot be fully validated via JSON schema,
 * but we can ensure the object has the required structure.
 *
 * Additional properties are allowed to support class instances and custom metadata.
 */
export const transformPluginSchema = {
  $schema: 'http://json-schema.org/draft-07/schema#',
  type: 'object',
  required: ['transform'],
  properties: {
    ...basePluginProperties,
    matcher: {
      description: 'Optional filter function (validated at runtime)',
    },
    transform: {
      description: 'Transform function (validated at runtime)',
    },
  },
  additionalProperties: true,
  errorMessage: {
    required: {
      name: 'Transform must have a "name" property',
      transform: 'Transform must have a "transform" function property',
    },
  },
} as const

/**
 * Renderer Plugin Schema
 *
 * Validates structure of Renderer objects at registration time.
 * Renderers can implement either format() for simple formatting or build() for advanced build logic.
 * Additional properties are allowed to support class instances and custom metadata.
 */
export const rendererPluginSchema = {
  $schema: 'http://json-schema.org/draft-07/schema#',
  type: 'object',
  required: ['format'],
  properties: {
    ...basePluginProperties,
    preset: {
      type: 'string',
      description: 'Preset identifier (e.g., "bundle", "standalone", "modifier")',
    },
    format: {
      description: 'Format function for token-to-output conversion (validated at runtime)',
    },
  },
  additionalProperties: true,
  errorMessage: {
    required: {
      format: 'Renderer must have a "format" function property',
    },
  },
} as const

/**
 * Filter Plugin Schema
 *
 * Validates structure of Filter objects at registration time.
 * Additional properties are allowed to support class instances and custom metadata.
 */
export const filterPluginSchema = {
  $schema: 'http://json-schema.org/draft-07/schema#',
  type: 'object',
  required: ['filter'],
  properties: {
    ...basePluginProperties,
    filter: {
      description: 'Filter function (validated at runtime)',
    },
  },
  additionalProperties: true,
  errorMessage: {
    required: {
      filter: 'Filter must have a "filter" function property',
    },
  },
} as const

/**
 * Preprocessor Plugin Schema
 *
 * Validates structure of Preprocessor objects at registration time.
 * Additional properties are allowed to support class instances and custom metadata.
 */
export const preprocessorPluginSchema = {
  $schema: 'http://json-schema.org/draft-07/schema#',
  type: 'object',
  required: ['preprocess'],
  properties: {
    ...basePluginProperties,
    preprocess: {
      description: 'Preprocess function (validated at runtime)',
    },
  },
  additionalProperties: true,
  errorMessage: {
    required: {
      preprocess: 'Preprocessor must have a "preprocess" function property',
    },
  },
} as const

/**
 * Lint Configuration Schema
 *
 * Validates lint configuration including plugins, rules, and settings.
 * Plugins can be objects (validated at runtime) or strings (module paths).
 */
export const lintConfigSchema = {
  $schema: 'http://json-schema.org/draft-07/schema#',
  type: 'object',
  properties: {
    enabled: {
      type: 'boolean',
      description: 'Enable linting (default: false, opt-in)',
    },
    failOnError: {
      type: 'boolean',
      description: 'Fail build on lint errors (default: true)',
    },
    plugins: {
      type: 'object',
      description: 'Plugins to load (by object or module path string)',
      additionalProperties: {
        oneOf: [{ type: 'string' }, { type: 'object' }],
      },
    },
    rules: {
      type: 'object',
      description: 'Rule configurations',
      additionalProperties: {
        oneOf: [
          { type: 'string', enum: ['off', 'warn', 'error'] },
          {
            type: 'array',
            minItems: 2,
            items: [{ type: 'string', enum: ['off', 'warn', 'error'] }, { type: 'object' }],
          },
        ],
      },
    },
  },
  additionalProperties: false,
} as const

/**
 * Output Configuration Schema
 *
 * Validates output-specific configuration including renderer,
 * output file path, transforms, and filters.
 */
export const outputConfigSchema = {
  $schema: 'http://json-schema.org/draft-07/schema#',
  type: 'object',
  required: ['name', 'renderer'],
  properties: {
    name: {
      type: 'string',
      minLength: 1,
      description: 'Unique identifier for this output',
    },
    renderer: rendererPluginSchema,
    filters: {
      type: 'array',
      items: filterPluginSchema,
      description: 'Array of filter objects to apply',
    },
    transforms: {
      type: 'array',
      items: transformPluginSchema,
      description: 'Array of transform objects to apply',
    },
    file: {
      // No type constraint - allows string or function
      // Functions cannot be validated by JSON Schema (not JSON-serializable)
      // TypeScript type provides compile-time validation for function signatures
      description:
        'Output file path relative to buildPath. Supports subdirectories (e.g., "css/tokens.css"), pattern strings (e.g., "tokens-{theme}.css"), or function for dynamic naming',
    },
    options: {
      type: 'object',
      description: 'Renderer-specific options passed to the formatter',
      additionalProperties: true,
    },
    hooks: {
      type: 'object',
      description: 'Per-output lifecycle hooks (functions, validated at runtime)',
      additionalProperties: true,
    },
  },
  errorMessage: {
    required: {
      name: 'Output must have a "name" property',
      renderer: 'Output must have a "renderer" property',
    },
  },
  additionalProperties: false,
} as const

/**
 * Dispersa Options Schema
 *
 * Validates constructor options for Dispersa instance.
 * When resolver is an object, it's validated against the resolver schema via $ref.
 */
export const dispersaOptionsSchema = {
  $schema: 'http://json-schema.org/draft-07/schema#',
  type: 'object',
  properties: {
    resolver: {
      oneOf: [
        { type: 'string', minLength: 1 },
        resolverSchemaRef, // Reference to resolver schema for inline ResolverDocument objects
      ],
      description:
        'Default resolver configuration - file path or ResolverDocument object (optional if provided at build time)',
    },
    buildPath: {
      type: 'string',
      description: 'Default output directory for generated files',
    },
    validation: {
      type: 'object',
      properties: {
        mode: { type: 'string', enum: ['error', 'warn', 'off'] },
      },
      additionalProperties: true,
    },
  },
  additionalProperties: false,
} as const

/**
 * Build Configuration Schema
 *
 * Validates complete build configuration including outputs array,
 * global transforms, preprocessors, and permutations.
 * When resolver is an object, it's validated against the resolver schema via $ref.
 */
export const buildConfigSchema = {
  $schema: 'http://json-schema.org/draft-07/schema#',
  type: 'object',
  required: ['outputs'],
  properties: {
    outputs: {
      type: 'array',
      minItems: 1,
      items: { type: 'object' }, // Each output validated separately with outputConfigSchema
      description: 'Array of output configurations defining target formats',
    },
    filters: {
      type: 'array',
      items: filterPluginSchema,
      description: 'Global filters to apply to all outputs',
    },
    transforms: {
      type: 'array',
      items: transformPluginSchema,
      description: 'Global transforms to apply to all tokens',
    },
    preprocessors: {
      type: 'array',
      items: preprocessorPluginSchema,
      description: 'Global preprocessors to apply before parsing',
    },
    permutations: {
      type: 'array',
      items: {
        type: 'object',
        description: 'Modifier inputs object (e.g., { theme: "dark" })',
      },
      description: 'Explicit permutations to build',
    },
    // Can also include DispersaOptions fields
    resolver: {
      oneOf: [
        { type: 'string', minLength: 1 },
        resolverSchemaRef, // Reference to resolver schema for inline ResolverDocument objects
      ],
      description: 'Resolver configuration - file path or ResolverDocument object',
    },
    buildPath: { type: 'string' },
    hooks: {
      type: 'object',
      description: 'Global build lifecycle hooks (functions, validated at runtime)',
      additionalProperties: true,
    },
    lint: {
      ...lintConfigSchema,
      description: 'Linting configuration',
    },
  },
  additionalProperties: false,
} as const

// ============================================================================
// GENERATED TYPES FROM SCHEMAS
// ============================================================================

/**
 * CSS Renderer Options type generated from cssRendererOptionsSchema
 *
 * Note: This type is overridden in @renderers/types to support function-based
 * selector and mediaQuery options, which cannot be represented in JSON Schema.
 * This schema-based type is used for JSON validation only.
 */
export type CssRendererOptions = FromSchema<typeof cssRendererOptionsSchema>

/**
 * JSON Renderer Options type generated from jsonRendererOptionsSchema
 */
export type JsonRendererOptions = FromSchema<typeof jsonRendererOptionsSchema>

/**
 * JS Module Renderer Options type generated from jsModuleRendererOptionsSchema
 */
export type JsModuleRendererOptions = FromSchema<typeof jsModuleRendererOptionsSchema>

/**
 * Output Config type generated from outputConfigSchema
 *
 * Note: This is a base type. The actual OutputConfig type in config/index.ts
 * extends this with additional TypeScript features like conditional types for options.
 */
export type OutputConfigBase = FromSchema<typeof outputConfigSchema>

/**
 * Dispersa Options type generated from dispersaOptionsSchema
 */
export type DispersaOptionsBase = FromSchema<typeof dispersaOptionsSchema>

/**
 * Build Config type generated from buildConfigSchema
 *
 * Note: This is a base type. The actual BuildConfig type in config/index.ts
 * may extend this with additional features.
 */
export type BuildConfigBase = FromSchema<typeof buildConfigSchema>

/**
 * Preprocessor Plugin type generated from preprocessorPluginSchema
 */
export type PreprocessorPluginBase = FromSchema<typeof preprocessorPluginSchema>

/**
 * Tailwind CSS v4 Renderer Options type generated from tailwindRendererOptionsSchema
 */
export type TailwindRendererOptionsBase = FromSchema<typeof tailwindRendererOptionsSchema>

/**
 * iOS/SwiftUI Renderer Options type generated from iosRendererOptionsSchema
 */
export type IosRendererOptionsBase = FromSchema<typeof iosRendererOptionsSchema>

/**
 * Android/Jetpack Compose Renderer Options type generated from androidRendererOptionsSchema
 */
export type AndroidRendererOptionsBase = FromSchema<typeof androidRendererOptionsSchema>

/**
 * Lint Config type generated from lintConfigSchema
 *
 * Note: This is a base type. The actual LintBuildConfig type in lint/types.ts
 * extends this with proper LintPlugin typing.
 */
export type LintConfigBase = FromSchema<typeof lintConfigSchema>
