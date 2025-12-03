/**
 * @fileoverview Preprocessor system types for raw token transformation
 */

import type { InternalTokenDocument } from '@lib/tokens/types'
import type { PreprocessorPluginBase } from '@lib/validation/config-schemas'

/**
 * Preprocessor definition for transforming raw token data
 *
 * Preprocessors operate on the raw token object before parsing and resolution.
 * They are useful for normalizing data, stripping metadata, or adapting tokens
 * from external sources to match expected formats.
 *
 * @example
 * ```typescript
 * const stripMetadata: Preprocessor = {
 *   name: 'strip-metadata',
 *   preprocess: (rawTokens) => {
 *     const { _metadata, ...tokens } = rawTokens
 *     return tokens
 *   }
 * }
 * ```
 */
export type Preprocessor = Pick<PreprocessorPluginBase, 'name'> & {
  /**
   * Function that transforms raw token data
   *
   * @param rawTokens - Raw token object before parsing
   * @returns Transformed token object (can be async)
   */
  preprocess: (
    rawTokens: InternalTokenDocument,
  ) => InternalTokenDocument | Promise<InternalTokenDocument>
}
