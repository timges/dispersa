/**
 * @fileoverview JSON bundler for multi-theme output
 */

import type { ResolverDocument } from '@resolution/resolution.types'
import { ConfigurationError } from '@shared/errors/index'
import type { ResolvedTokens } from '@tokens/types'

import type { BundleDataItem } from './types'
import {
  buildMetadata,
  buildStablePermutationKey,
  normalizeModifierInputs,
  stripInternalMetadata,
} from './utils'

/**
 * Bundle tokens as JSON object with metadata for runtime lookup
 *
 * JSON-specific strategy: All combinations for dynamic theming
 * - Includes metadata with dimensions and defaults
 * - All permutations included (no filtering)
 * - Predictable keys for O(1) lookup
 */
export async function bundleAsJson(
  bundleData: BundleDataItem[],
  resolver: ResolverDocument,
  formatTokens?: (tokens: ResolvedTokens) => Promise<string>,
): Promise<string> {
  // Build metadata
  const metadata = buildMetadata(resolver)

  // Build tokens object
  const tokens: Record<string, unknown> = {}
  for (const { tokens: tokenSet, modifierInputs } of bundleData) {
    // Strip internal metadata before formatting
    const cleanTokens = stripInternalMetadata(tokenSet)

    // Generate key from full modifier inputs for all combinations
    if (!formatTokens) {
      throw new ConfigurationError('JSON formatter was not provided')
    }

    const normalizedInputs = normalizeModifierInputs(modifierInputs)
    const key = buildStablePermutationKey(normalizedInputs, metadata.dimensions)
    const themeJson = await formatTokens(cleanTokens)
    tokens[key] = JSON.parse(themeJson) as unknown
  }

  // Return complete bundle with metadata
  const bundle = {
    _meta: metadata,
    tokens,
  }

  return JSON.stringify(bundle, null, 2)
}
