/**
 * @fileoverview Validation configuration types
 */

/** Controls how validation issues are reported */
export type ValidationMode = 'error' | 'warn' | 'off'

/**
 * Options that control token and resolver validation behavior.
 *
 * @example
 * ```typescript
 * const dispersa = new Dispersa({
 *   validation: { mode: 'warn' },
 * })
 * ```
 */
export type ValidationOptions = {
  /**
   * Validation mode.
   * - `'error'` (default) – throw on validation failures
   * - `'warn'` – log warnings via `console.warn` but continue processing
   * - `'off'` – skip validation entirely
   */
  mode?: ValidationMode
}
