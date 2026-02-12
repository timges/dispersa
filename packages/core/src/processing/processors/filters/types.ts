/**
 * @fileoverview Filter system types for token selection
 */

import type { ResolvedToken } from '@tokens/types'

/**
 * Filter definition for selecting tokens
 *
 * Filters determine which tokens should be included in output configuration.
 * They are applied before transforms.
 *
 * @example
 * ```typescript
 * const colorsOnly: Filter = {
 *   filter: (token) => token.$type === 'color'
 * }
 * ```
 */
export type Filter = {
  /**
   * Function that determines if a token should be included
   *
   * @param token - Token to test
   * @returns true if token should be included in output, false otherwise
   */
  filter: (token: ResolvedToken) => boolean
}
