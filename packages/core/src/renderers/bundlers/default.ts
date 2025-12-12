/**
 * @fileoverview Default bundler for multi-theme output
 */

import type { ResolvedTokens } from '@lib/tokens/types'
import { ConfigurationError } from '@shared/errors/index'

import type { BundleDataItem } from './types'

/**
 * Bundle tokens with default format (concatenate with comments)
 *
 * Simple concatenation fallback for custom renderers
 */
export async function bundleAsDefault(
  bundleData: BundleDataItem[],
  formatTokens?: (tokens: ResolvedTokens) => Promise<string>,
): Promise<string> {
  const blocks = await Promise.all(
    bundleData.map(async ({ tokens, modifierInputs, isBase }) => {
      if (!formatTokens) {
        throw new ConfigurationError('Formatter was not provided')
      }

      const themeKey = Object.values(modifierInputs).join('-')
      const block = await formatTokens(tokens)
      const label = isBase ? 'Base theme' : 'Overrides'
      return `/* ${label}: ${themeKey} */\n${block}`
    }),
  )
  return blocks.join('\n\n')
}
