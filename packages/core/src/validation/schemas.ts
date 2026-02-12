/**
 * @fileoverview DTCG 2025.10 JSON Schemas (vendored, verbatim)
 */

import dtcgGroupSchema from './dtcg-schemas/2025.10/format/group.json' assert { type: 'json' }
import dtcgGroupOrTokenSchema from './dtcg-schemas/2025.10/format/groupOrToken.json' assert { type: 'json' }
import dtcgTokenSchema from './dtcg-schemas/2025.10/format/token.json' assert { type: 'json' }
import dtcgTokenTypeSchema from './dtcg-schemas/2025.10/format/tokenType.json' assert { type: 'json' }
import dtcgBorderValueSchema from './dtcg-schemas/2025.10/format/values/border.json' assert { type: 'json' }
import dtcgColorValueSchema from './dtcg-schemas/2025.10/format/values/color.json' assert { type: 'json' }
import dtcgCubicBezierValueSchema from './dtcg-schemas/2025.10/format/values/cubicBezier.json' assert { type: 'json' }
import dtcgDimensionValueSchema from './dtcg-schemas/2025.10/format/values/dimension.json' assert { type: 'json' }
import dtcgDurationValueSchema from './dtcg-schemas/2025.10/format/values/duration.json' assert { type: 'json' }
import dtcgFontFamilyValueSchema from './dtcg-schemas/2025.10/format/values/fontFamily.json' assert { type: 'json' }
import dtcgFontWeightValueSchema from './dtcg-schemas/2025.10/format/values/fontWeight.json' assert { type: 'json' }
import dtcgGradientValueSchema from './dtcg-schemas/2025.10/format/values/gradient.json' assert { type: 'json' }
import dtcgNumberValueSchema from './dtcg-schemas/2025.10/format/values/number.json' assert { type: 'json' }
import dtcgShadowValueSchema from './dtcg-schemas/2025.10/format/values/shadow.json' assert { type: 'json' }
import dtcgStrokeStyleValueSchema from './dtcg-schemas/2025.10/format/values/strokeStyle.json' assert { type: 'json' }
import dtcgTransitionValueSchema from './dtcg-schemas/2025.10/format/values/transition.json' assert { type: 'json' }
import dtcgTypographyValueSchema from './dtcg-schemas/2025.10/format/values/typography.json' assert { type: 'json' }
import dtcgFormatSchema from './dtcg-schemas/2025.10/format.json' assert { type: 'json' }
import dtcgResolverModifierSchema from './dtcg-schemas/2025.10/resolver/modifier.json' assert { type: 'json' }
import dtcgResolverResolutionOrderSchema from './dtcg-schemas/2025.10/resolver/resolutionOrder.json' assert { type: 'json' }
import dtcgResolverSetSchema from './dtcg-schemas/2025.10/resolver/set.json' assert { type: 'json' }
import dtcgResolverSchema from './dtcg-schemas/2025.10/resolver.json' assert { type: 'json' }

export const formatSchema = dtcgFormatSchema
export const tokenSchema = dtcgTokenSchema
export const tokenTypeSchema = dtcgTokenTypeSchema
export const groupSchema = dtcgGroupSchema
export const groupOrTokenSchema = dtcgGroupOrTokenSchema

export const colorValueSchema = dtcgColorValueSchema
export const dimensionValueSchema = dtcgDimensionValueSchema
export const fontFamilyValueSchema = dtcgFontFamilyValueSchema
export const fontWeightValueSchema = dtcgFontWeightValueSchema
export const durationValueSchema = dtcgDurationValueSchema
export const cubicBezierValueSchema = dtcgCubicBezierValueSchema
export const numberValueSchema = dtcgNumberValueSchema
export const strokeStyleValueSchema = dtcgStrokeStyleValueSchema
export const borderValueSchema = dtcgBorderValueSchema
export const transitionValueSchema = dtcgTransitionValueSchema
export const shadowValueSchema = dtcgShadowValueSchema
export const gradientValueSchema = dtcgGradientValueSchema
export const typographyValueSchema = dtcgTypographyValueSchema

export const resolverSchema = dtcgResolverSchema
export const resolverSetSchema = dtcgResolverSetSchema
export const resolverModifierSchema = dtcgResolverModifierSchema
export const resolverResolutionOrderSchema = dtcgResolverResolutionOrderSchema

export const dtcgSchemaRegistry = [
  formatSchema,
  tokenSchema,
  tokenTypeSchema,
  groupSchema,
  groupOrTokenSchema,
  colorValueSchema,
  dimensionValueSchema,
  fontFamilyValueSchema,
  fontWeightValueSchema,
  durationValueSchema,
  cubicBezierValueSchema,
  numberValueSchema,
  strokeStyleValueSchema,
  borderValueSchema,
  transitionValueSchema,
  shadowValueSchema,
  gradientValueSchema,
  typographyValueSchema,
  resolverSchema,
  resolverSetSchema,
  resolverModifierSchema,
  resolverResolutionOrderSchema,
]
