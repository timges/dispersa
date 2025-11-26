/**
 * @fileoverview Token types - extended from schema-generated types
 *
 * Base token types are defined manually to match DTCG 2025.10.
 * This keeps TypeScript types stable while runtime validation relies on
 * the vendored DTCG JSON Schemas.
 */

// ============================================================================
// DTCG TOKEN TYPES (MANUAL)
// ============================================================================

export type JsonPointerReferenceObject = {
  $ref: string
}

export type TokenValueReference = string | JsonPointerReferenceObject

export type Token = {
  $value?: TokenValue | TokenValueReference
  $ref?: string
  $type?: TokenType
  $description?: string
  $deprecated?: boolean | string
  $extensions?: Record<string, unknown>
}

/**
 * Internal token shape used by the resolver pipeline
 */
export type InternalToken = Token & {
  /** Internal: Source modifier tag for bundle outputs (not part of DTCG spec) */
  _sourceModifier?: string
}

type TokenGroupMetadataValue = string | boolean | Record<string, unknown> | undefined

type TokenGroupBase = {
  $type?: TokenType
  $description?: string
  $deprecated?: boolean | string
  $extensions?: Record<string, unknown>
  $extends?: string
  $root?: Token
}

// Note: interface used to allow recursive index signature (TS2456 with type alias).
export interface TokenGroup extends TokenGroupBase {
  [key: string]: Token | InternalToken | TokenGroup | TokenGroupMetadataValue
}

// ============================================================================
// HELPER TYPES (NOT SCHEMA-GENERATED)
// ============================================================================

/**
 * Token type discriminator - union of all valid token type strings
 *
 * Represents the possible values for the $type property in DTCG tokens.
 */
export type TokenType =
  | 'color'
  | 'dimension'
  | 'fontFamily'
  | 'fontWeight'
  | 'duration'
  | 'cubicBezier'
  | 'number'
  | 'shadow'
  | 'typography'
  | 'border'
  | 'strokeStyle'
  | 'transition'
  | 'gradient'

/**
 * Token value types - any valid value that can appear in a token
 *
 * Represents the possible types for the $value property in tokens.
 * Can be primitives, objects, or arrays depending on the token type.
 */
export type TokenValue = string | number | boolean | Record<string, unknown> | unknown[]

// ============================================================================
// VALUE TYPES FOR DEVELOPER CONVENIENCE
// ============================================================================

/**
 * Valid DTCG color space identifiers
 * All 14 color spaces from DTCG Color Module 2025-10
 */
export type ColorSpace =
  | 'srgb' // sRGB (IEC 61966-2-1:1999)
  | 'srgb-linear' // Linear sRGB
  | 'hsl' // Hue, Saturation, Lightness
  | 'hwb' // Hue, Whiteness, Blackness
  | 'lab' // CIELAB (CIE L*a*b*)
  | 'lch' // CIE LCH (Lightness, Chroma, Hue)
  | 'oklab' // Oklab perceptual color space
  | 'oklch' // Oklch (Lightness, Chroma, Hue)
  | 'display-p3' // Display P3 (DCI-P3 D65 whitepoint)
  | 'a98-rgb' // Adobe RGB (1998)
  | 'prophoto-rgb' // ProPhoto RGB (ROMM RGB)
  | 'rec2020' // Rec. 2020 (ITU-R BT.2020-2)
  | 'xyz-d65' // CIE XYZ with D65 whitepoint
  | 'xyz-d50' // CIE XYZ with D50 whitepoint

/**
 * Color component value: number or the "none" keyword for missing channels
 * Token references are handled separately via alias resolution
 */
export type ColorComponent = number | 'none'

/**
 * DTCG color object format with colorSpace and components
 * Each color space has different component meanings and ranges:
 * - RGB-based (srgb, srgb-linear, display-p3, a98-rgb, prophoto-rgb, rec2020): [R: 0-1, G: 0-1, B: 0-1]
 * - HSL: [H: angle, S: 0-100, L: 0-100]
 * - HWB: [H: angle, W: 0-100, B: 0-100]
 * - Lab/CIELab: [L: 0-100, a: -125 to 125, b: -125 to 125]
 * - LCH: [L: 0-100, C: 0-150, H: angle]
 * - OKLab: [L: 0-1, a: -0.4 to 0.4, b: -0.4 to 0.4]
 * - OKLCH: [L: 0-1, C: 0-0.4, H: angle]
 * - XYZ: [X: unbounded, Y: unbounded, Z: unbounded]
 */
export type ColorValueObject = {
  colorSpace: ColorSpace
  components: [ColorComponent, ColorComponent, ColorComponent]
  alpha?: number
  hex?: string
}

/**
 * DTCG 2025-10 compliant color value
 *
 * Per DTCG spec, color values must be one of:
 * 1. **Color object** with colorSpace and components (e.g., `{ colorSpace: 'srgb', components: [1, 0, 0] }`)
 * 2. **Token reference** using `{token.path}` or JSON Pointer object (e.g., `"{color.brand.primary}"`)
 *
 * ⚠️ **Important**: Arbitrary CSS color strings like `"#ff0000"`, `"rgb(255, 0, 0)"`, or `"red"`
 * are NOT valid per DTCG spec. String values MUST be alias references.
 *
 * @see {@link https://www.designtokens.org/tr/2025.10/color/ | DTCG Color Module}
 * @see {@link https://www.designtokens.org/tr/2025.10/format/#color-0 | DTCG Format: Color Type}
 *
 * @example Valid color values
 * ```typescript
 * // Object format (preferred)
 * const color1: ColorValue = {
 *   colorSpace: 'srgb',
 *   components: [1, 0, 0],
 *   alpha: 1
 * }
 *
 * // Alias reference (resolves to another token)
 * const color2: ColorValue = "{color.brand.primary}"
 * ```
 */
export type ColorValue = ColorValueObject | TokenValueReference

/**
 * DTCG 2025-10 compliant dimension value
 *
 * Per DTCG spec, dimension values MUST use object format with
 * numeric value and string unit properties.
 *
 * ⚠️ **Important**: String values like `"16px"` are NOT valid per DTCG spec.
 * Dimensions MUST be objects with separate value and unit properties.
 *
 * @see {@link https://www.designtokens.org/tr/2025.10/format/#dimension-0 | DTCG Format: Dimension Type}
 *
 * @example Valid dimension values
 * ```typescript
 * const spacing: DimensionValue = { value: 16, unit: 'px' }
 * const fontSize: DimensionValue = { value: 1.5, unit: 'rem' }
 * const borderWidth: DimensionValue = { value: 2, unit: 'px' }
 * ```
 */
export type DimensionValue = {
  value: number
  unit: 'px' | 'rem'
}

/**
 * Font family value - single string or array of fallback fonts
 */
export type FontFamilyValue = string | string[]

/**
 * Font weight value - numeric (1-1000) or named value
 */
export type FontWeightValue = number | string

/**
 * Duration value - DTCG duration object
 */
export type DurationValue = { value: number; unit: 'ms' | 's' }

/**
 * Cubic bezier value - 4-number array for animation easing
 */
export type CubicBezierValue = [number, number, number, number]

/**
 * Shadow value object (DTCG 2025.10 composite type - Section 9.6)
 *
 * Represents a shadow effect with color, offset, blur, and optional spread.
 * Uses proper ColorValue and DimensionValue types per DTCG spec.
 *
 * @example
 * ```json
 * {
 *   "$type": "shadow",
 *   "$value": {
 *     "color": { "colorSpace": "srgb", "components": [0, 0, 0], "alpha": 0.5 },
 *     "offsetX": { "value": 0, "unit": "px" },
 *     "offsetY": { "value": 4, "unit": "px" },
 *     "blur": { "value": 8, "unit": "px" },
 *     "spread": { "value": 0, "unit": "px" }
 *   }
 * }
 * ```
 */
export type ShadowValueObject = {
  /** Shadow color (color object or alias reference) */
  color: ColorValue
  /** Horizontal offset */
  offsetX: DimensionValue
  /** Vertical offset */
  offsetY: DimensionValue
  /** Blur radius */
  blur: DimensionValue
  /** Spread radius */
  spread: DimensionValue
  /** Whether shadow is inset */
  inset?: boolean
}

/**
 * Shadow value - single shadow or array of shadows
 */
export type ShadowValue = ShadowValueObject | ShadowValueObject[]

/**
 * Typography token type
 */
export type TypographyToken = Token & {
  $type: 'typography'
  $value: TypographyValue | TokenValueReference
}

/**
 * Border token type
 */
export type BorderToken = Token & {
  $type: 'border'
  $value: BorderValue | TokenValueReference
}

/**
 * Stroke style token type
 */
export type StrokeStyleToken = Token & {
  $type: 'strokeStyle'
  $value: StrokeStyleValue | TokenValueReference
}

/**
 * Transition token type
 */
export type TransitionToken = Token & {
  $type: 'transition'
  $value: TransitionValue | TokenValueReference
}

/**
 * Gradient token type
 */
export type GradientToken = Token & {
  $type: 'gradient'
  $value: GradientValue | TokenValueReference
}

/**
 * Stroke style value object
 */
export type StrokeStyleValueObject = {
  dashArray: DimensionValue[]
  lineCap: 'round' | 'butt' | 'square'
}

/**
 * Stroke style value
 */
export type StrokeStyleValue = string | StrokeStyleValueObject

/**
 * Border value object
 */
export type BorderValue = {
  color: ColorValue
  width: DimensionValue
  style: StrokeStyleValue
}

/**
 * Typography value object
 */
export type TypographyValue = {
  fontFamily: FontFamilyValue
  fontSize: DimensionValue
  fontWeight: FontWeightValue
  letterSpacing: DimensionValue
  lineHeight: number
}

/**
 * Transition value object
 */
export type TransitionValue = {
  duration: DurationValue
  delay: DurationValue
  timingFunction: CubicBezierValue
}

/**
 * Gradient stop value object
 */
export type GradientStop = {
  color: ColorValue
  position: number
}

/**
 * Gradient value
 */
export type GradientValue = GradientStop[]

// ============================================================================
// NARROWED VALUE TYPE (FOR CONSUMER USE)
// ============================================================================

/**
 * Union of all known DTCG token value types.
 *
 * Provides narrower typing than `TokenValue` for consumers who want
 * better autocomplete and type checking when working with resolved tokens.
 *
 * Use the type guard helpers (`isColorToken`, `isDimensionToken`, etc.)
 * to narrow a `ResolvedToken` to a specific value type.
 *
 * @example
 * ```typescript
 * import type { ResolvedToken } from 'dispersa'
 * import { isColorToken, isDimensionToken } from 'dispersa'
 *
 * function process(token: ResolvedToken) {
 *   if (isColorToken(token)) {
 *     // token.$value is narrowed to ColorValue
 *   }
 *   if (isDimensionToken(token)) {
 *     // token.$value is narrowed to DimensionValue
 *   }
 * }
 * ```
 */
export type DesignTokenValue =
  | ColorValueObject
  | DimensionValue
  | DurationValue
  | CubicBezierValue
  | ShadowValueObject
  | ShadowValueObject[]
  | TypographyValue
  | BorderValue
  | StrokeStyleValueObject
  | StrokeStyleValue
  | TransitionValue
  | GradientValue
  | FontFamilyValue
  | FontWeightValue
  | number
  | boolean

// ============================================================================
// TOKEN TYPE GUARDS
// ============================================================================

/** Type-narrowed token whose `$value` is a `ColorValueObject` or color string */
export type ColorToken = ResolvedToken & { $type: 'color' }

/** Type-narrowed token whose `$value` is a `DimensionValue` */
export type DimensionToken = ResolvedToken & { $type: 'dimension' }

/** Type-narrowed token whose `$value` is a `ShadowValue` */
export type ShadowToken = ResolvedToken & { $type: 'shadow' }

/** Type-narrowed token whose `$value` is a `TypographyValue` */
export type TypographyTokenNarrowed = ResolvedToken & { $type: 'typography' }

/** Type-narrowed token whose `$value` is a `BorderValue` */
export type BorderTokenNarrowed = ResolvedToken & { $type: 'border' }

/** Type-narrowed token whose `$value` is a `DurationValue` */
export type DurationToken = ResolvedToken & { $type: 'duration' }

/** Type-narrowed token whose `$value` is a `TransitionValue` */
export type TransitionTokenNarrowed = ResolvedToken & { $type: 'transition' }

/** Type-narrowed token whose `$value` is a `GradientValue` */
export type GradientTokenNarrowed = ResolvedToken & { $type: 'gradient' }

/** Check if a resolved token is a color token */
export function isColorToken(token: ResolvedToken): token is ColorToken {
  return token.$type === 'color'
}

/** Check if a resolved token is a dimension token */
export function isDimensionToken(token: ResolvedToken): token is DimensionToken {
  return token.$type === 'dimension'
}

/** Check if a resolved token is a shadow token */
export function isShadowToken(token: ResolvedToken): token is ShadowToken {
  return token.$type === 'shadow'
}

/** Check if a resolved token is a typography token */
export function isTypographyToken(token: ResolvedToken): token is TypographyTokenNarrowed {
  return token.$type === 'typography'
}

/** Check if a resolved token is a border token */
export function isBorderToken(token: ResolvedToken): token is BorderTokenNarrowed {
  return token.$type === 'border'
}

/** Check if a resolved token is a duration token */
export function isDurationToken(token: ResolvedToken): token is DurationToken {
  return token.$type === 'duration'
}

/** Check if a resolved token is a transition token */
export function isTransitionToken(token: ResolvedToken): token is TransitionTokenNarrowed {
  return token.$type === 'transition'
}

/** Check if a resolved token is a gradient token */
export function isGradientToken(token: ResolvedToken): token is GradientTokenNarrowed {
  return token.$type === 'gradient'
}

// ============================================================================
// COMPOSED TYPES (NOT SCHEMA-GENERATED)
// ============================================================================

/**
 * Top-level collection of tokens and groups
 *
 * Maps token/group names to their definitions. This is the structure
 * of a raw token file before resolution.
 */
export type TokenCollection = Record<string, Token | TokenGroup>

/**
 * Token document nodes used during resolution
 */
export type TokenNode = Token | TokenGroup

/**
 * Internal token document nodes used during resolution
 */
export type InternalTokenNode = InternalToken | TokenGroup

/**
 * Token document structure (pre-resolution)
 */
export type TokenDocument = Record<string, TokenNode>

/**
 * Internal token document structure (pre-resolution, with internal metadata)
 */
export type InternalTokenDocument = Record<string, InternalTokenNode>

/**
 * Fully resolved token with computed metadata
 *
 * After resolution, tokens include additional metadata like their
 * full path in the token hierarchy and the original value before
 * any alias or reference resolution.
 *
 * @example
 * ```typescript
 * {
 *   $value: "#ff0000",
 *   $type: "color",
 *   path: ["color", "brand", "primary"],
 *   name: "color.brand.primary",
 *   originalValue: "{color.red.500}" // Before alias resolution
 * }
 * ```
 */
export type ResolvedToken = Token & {
  /** Hierarchical path segments (e.g., ['color', 'brand', 'primary']) */
  path: string[]

  /** Fully qualified token name (e.g., 'color.brand.primary') */
  name: string

  /**
   * The raw value before any alias or reference resolution.
   *
   * For alias tokens this contains the alias reference string
   * (e.g., `"{color.primary}"`) or a composite value with embedded
   * alias references. For non-alias tokens this equals `$value`.
   *
   * Use the built-in `isAlias()` / `isBase()` filters or inspect
   * this value with `getPureAliasReferenceName()` to determine
   * whether the token was originally an alias.
   */
  originalValue: TokenValue
}

/**
 * Collection of resolved tokens indexed by name
 *
 * Maps token names to their resolved definitions. This is the primary
 * format used throughout Dispersa after token resolution.
 *
 * @example
 * ```typescript
 * {
 *   "color.brand.primary": {
 *     $value: "#ff0000",
 *     $type: "color",
 *     path: ["color", "brand", "primary"],
 *     name: "color.brand.primary",
 *     originalValue: "#ff0000"
 *   }
 * }
 * ```
 */
export type ResolvedTokens = Record<string, ResolvedToken>

/**
 * Internal resolved token with metadata used by the pipeline and bundlers
 *
 * These fields are not part of the DTCG spec and should be stripped before
 * returning tokens to public callers or rendering output.
 */
export type InternalResolvedToken = ResolvedToken & {
  /** Internal: Whether this token was originally an alias (not part of DTCG spec) */
  _isAlias?: boolean
  /** Internal: Source modifier tag for bundle outputs (not part of DTCG spec) */
  _sourceModifier?: string
  /** Internal: Source set name for bundle outputs (not part of DTCG spec) */
  _sourceSet?: string
}

/**
 * Internal collection of resolved tokens (with internal metadata)
 */
export type InternalResolvedTokens = Record<string, InternalResolvedToken>
