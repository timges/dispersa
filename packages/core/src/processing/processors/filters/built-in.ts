/**
 * @fileoverview Built-in token filters
 *
 * Provides commonly used filters for token selection. These filters can be
 * used in output configurations to control which tokens are included in output.
 */

import { AliasResolver } from '@resolution/alias-resolver'
import type { TokenType } from '@tokens/types'

import type { Filter } from './types'

/**
 * Factory function to create a filter for a specific token type
 *
 * @param type - Token type to filter for
 * @returns Filter that includes only tokens of the specified type
 *
 * @example
 * ```typescript
 * const shadowFilter = byType('shadow')
 * dispersa.registerFilter(shadowFilter)
 *
 * outputs: [{
 *   css({
 *     name: 'css',
 *     file: 'tokens.css',
 *     preset: 'bundle',
 *     filters: [shadowFilter],
 *   }),
 * }]
 * ```
 */
export function byType(type: TokenType): Filter {
  return {
    filter: (token) => token.$type === type,
  }
}

/**
 * Factory function to create a filter based on path pattern
 *
 * @param pattern - Regular expression or string to match against token path
 * @returns Filter that includes only tokens matching the path pattern
 *
 * @example
 * ```typescript
 * // Filter tokens in 'color.semantic' namespace
 * const semanticColors = byPath(/^color\.semantic/)
 * dispersa.registerFilter(semanticColors)
 *
 * // Filter tokens starting with 'spacing'
 * const spacingTokens = byPath('spacing')
 * dispersa.registerFilter(spacingTokens)
 * ```
 */
export function byPath(pattern: RegExp | string): Filter {
  const regex = typeof pattern === 'string' ? new RegExp(`^${pattern}`) : pattern
  return {
    filter: (token) => {
      const fullPath = token.path.join('.')
      return regex.test(fullPath)
    },
  }
}

/**
 * Filter to include only alias tokens (tokens that reference other tokens)
 *
 * Useful for shipping only semantic/alias tokens to consumers while keeping
 * base/primitive tokens internal to the design system.
 *
 * @example
 * ```typescript
 * {
 *   name: 'web-semantic',
 *   renderer: cssRenderer(),
 *   options: { preset: 'bundle' },
 *   filters: [isAlias()], // Only tokens that were originally references
 *   transforms: [nameKebabCase()]
 * }
 * ```
 */
export function isAlias(): Filter {
  return {
    filter: (token) => AliasResolver.hasAliases(token.originalValue),
  }
}

/**
 * Filter to include only base tokens (tokens with direct values, not aliases)
 *
 * Useful for internal documentation or extracting only primitive/foundation tokens.
 *
 * @example
 * ```typescript
 * {
 *   name: 'design-primitives',
 *   renderer: jsonRenderer(),
 *   options: { preset: 'standalone' },
 *   filters: [isBase()], // Only tokens with direct values
 * }
 * ```
 */
export function isBase(): Filter {
  return {
    filter: (token) => !AliasResolver.hasAliases(token.originalValue),
  }
}
