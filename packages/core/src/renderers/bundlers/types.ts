/**
 * @fileoverview Types for bundlers
 */

import type { ResolvedTokens } from '@config/index'

export type BundleDataItem = {
  tokens: ResolvedTokens
  modifierInputs: Record<string, string>
  isBase: boolean
}
