/**
 * @fileoverview Transform types (re-exported from main types for convenience)
 */

import type { ResolvedToken } from '@tokens/types'

/**
 * Transform definition for modifying tokens during processing
 *
 * Transforms can modify any aspect of a token (name, value, metadata, etc.)
 * The transform function itself determines what gets modified.
 *
 * @example
 * ```typescript
 * const colorToHex: Transform = {
 *   matcher: (token) => token.$type === 'color',
 *   transform: (token) => ({
 *     ...token,
 *     $value: convertToHex(token.$value)
 *   })
 * }
 * ```
 */
export type Transform = {
  /**
   * Optional filter to determine which tokens this transform applies to
   * If omitted, transform applies to all tokens
   *
   * @param token - Token to test
   * @returns true if transform should be applied to this token
   */
  matcher?: (token: ResolvedToken) => boolean

  /**
   * Function that performs the transformation
   * Can modify name, value, or any other token property
   *
   * @param token - Token to transform
   * @returns Transformed token (must return a new token object)
   */
  transform: (token: ResolvedToken) => ResolvedToken
}
