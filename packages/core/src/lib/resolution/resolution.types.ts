/**
 * @fileoverview DTCG Resolver types (2025.10 specification)
 *
 * The resolver system allows defining token sources, modifiers (themes, modes),
 * and the order in which they should be resolved and merged.
 *
 * ResolverDocument type is defined here to match DTCG 2025.10.
 */

export type ReferenceObject = {
  $ref: string
}

export type TokenSource = ReferenceObject | Record<string, unknown>

export type Set = {
  sources: TokenSource[]
  description?: string
  $extensions?: Record<string, unknown>
}

export type Modifier = {
  contexts: Record<string, TokenSource[]>
  description?: string
  default?: string
  $extensions?: Record<string, unknown>
}

export type InlineSet = Set & {
  name: string
  type: 'set'
}

export type InlineModifier = Modifier & {
  name: string
  type: 'modifier'
}

export type ResolverDocument = {
  $schema?: string
  name?: string
  version: '2025.10'
  description?: string
  sets?: Record<string, Set>
  modifiers?: Record<string, Modifier>
  resolutionOrder: (ReferenceObject | InlineSet | InlineModifier)[]
  $defs?: Record<string, unknown>
}

/**
 * Information about a modifier (name and value)
 *
 * Used to pass current and default modifier context to output options functions.
 */
export type ModifierInfo = {
  /** Modifier name (e.g., "theme", "platform", "scale") */
  name: string

  /** Modifier value (e.g., "dark", "mobile", "large") */
  value: string
}

/**
 * Array of token sources
 *
 * Can contain inline token objects or references to external files.
 * Sources are merged in array order (later sources override earlier ones).
 */
export type SetSources = TokenSource[]

/**
 * Token sources for a specific modifier context
 *
 * Same structure as SetSources, used within modifier definitions.
 */
export type ModifierContext = SetSources

/**
 * Map of modifier names to selected context values
 *
 * Used to specify which variation of each modifier to use when resolving tokens.
 * Can be made type-safe by providing a generic type parameter.
 *
 * @template T - Optional specific type for modifier values (defaults to generic Record)
 *
 * @example
 * ```typescript
 * // Generic (default):
 * const inputs: ModifierInputs = {
 *   theme: 'dark',
 *   platform: 'mobile'
 * }
 *
 * // Type-safe:
 * type MyModifiers = { theme: 'light' | 'dark', platform: 'web' | 'mobile' }
 * const inputs: ModifierInputs<MyModifiers> = {
 *   theme: 'dark',  // ✅ Autocomplete!
 *   platform: 'mobile'
 * }
 * ```
 */
export type ModifierInputs<T extends Record<string, string> = Record<string, string>> = T

/**
 * Internal resolution state during token processing
 *
 * Tracks the current modifier selections and accumulated tokens
 * during the resolution pipeline.
 */
export type ResolutionContext = {
  /** Currently selected modifier context values */
  modifiers: ModifierInputs

  /** Base tokens before modifier application */
  baseTokens: Record<string, unknown>

  /** Tokens resolved so far in the pipeline */
  resolvedTokens: Record<string, unknown>
}

/**
 * A fully resolved permutation of tokens
 *
 * Represents one complete combination of modifier contexts and
 * their resulting token values.
 *
 * @example
 * ```typescript
 * const permutation: Permutation = {
 *   modifiers: { theme: 'dark', platform: 'mobile' },
 *   tokens: {
 *     'color.background': { $value: '#000000', $type: 'color', ... }
 *   }
 * }
 * ```
 */
export type Permutation = {
  /** Modifier context values for this permutation */
  modifiers: ModifierInputs

  /** Resolved token values for this combination */
  tokens: Record<string, unknown>
}
