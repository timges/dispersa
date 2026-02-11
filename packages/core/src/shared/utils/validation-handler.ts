/**
 * @fileoverview Shared validation handler for consistent validation mode behavior
 *
 * Provides a single source of truth for validation mode checking, error handling,
 * and warning dispatch across all Dispersa components.
 */

import type { ValidationMode, ValidationOptions } from '@shared/types/validation'

/**
 * Centralized validation handler that all components share.
 *
 * Caches the warning handler and mode at construction time so that
 * repeated calls avoid re-reading options on every invocation.
 */
export class ValidationHandler {
  private mode: ValidationMode

  constructor(options?: ValidationOptions) {
    this.mode = options?.mode ?? 'error'
  }

  /**
   * Whether validation checks should run (mode is not 'off')
   */
  shouldValidate(): boolean {
    return this.mode !== 'off'
  }

  /**
   * Whether the current mode is 'error' (strictest)
   */
  isStrict(): boolean {
    return this.mode === 'error'
  }

  /**
   * Handle a validation issue: throw in 'error' mode, warn in 'warn' mode, ignore in 'off' mode
   */
  handleIssue(error: Error): void {
    if (this.mode === 'error') {
      throw error
    }
    if (this.mode === 'warn') {
      // eslint-disable-next-line no-console
      console.warn(error.message)
    }
  }

  /**
   * Emit a warning (in 'error' and 'warn' modes, skip in 'off')
   */
  warn(message: string): void {
    if (this.mode === 'off') {
      return
    }
    // eslint-disable-next-line no-console
    console.warn(message)
  }
}
