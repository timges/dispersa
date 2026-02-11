/**
 * @fileoverview Output tree helpers for custom renderers
 */

import type { OutputTree } from './types'

/**
 * Create an {@link OutputTree} from a map of file paths to content strings.
 *
 * Use this when building a custom renderer that produces multiple output files
 * (e.g. one file per theme or permutation).
 *
 * @param files - Record mapping relative file paths to their string content
 * @returns An `OutputTree` that the build orchestrator can write to disk or return in-memory
 *
 * @example
 * ```typescript
 * import { defineRenderer, outputTree } from 'dispersa/renderers'
 *
 * const myRenderer = defineRenderer((context) => {
 *   return outputTree({
 *     'light.css': '/* light tokens *\/',
 *     'dark.css': '/* dark tokens *\/',
 *   })
 * })
 * ```
 */
export const outputTree = (files: Record<string, string>): OutputTree => {
  return {
    kind: 'outputTree',
    files,
  }
}

/**
 * Type guard that checks whether a value is an {@link OutputTree}.
 *
 * @param value - The value to check
 * @returns `true` if the value is an `OutputTree`
 */
export const isOutputTree = (value: unknown): value is OutputTree => {
  return (
    typeof value === 'object' &&
    value !== null &&
    (value as { kind?: unknown }).kind === 'outputTree'
  )
}
