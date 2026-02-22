/**
 * @license MIT
 * Copyright (c) 2025-present Dispersa
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

/**
 * @fileoverview Shared glob pattern matching utilities for lint rules
 *
 * Provides bounded caching to prevent memory leaks in long-running processes.
 */

const MAX_CACHE_SIZE = 1000

const cache = new Map<string, RegExp>()

/**
 * Convert a glob pattern to a RegExp
 *
 * Supports `*` as a wildcard that matches any characters.
 * Results are cached with a bounded cache to prevent memory leaks.
 *
 * @param pattern - Glob pattern (e.g., 'color-*', '*.primary')
 * @returns Compiled RegExp
 *
 * @example
 * ```typescript
 * const regex = globToRegex('color-*')
 * regex.test('color-primary') // true
 * regex.test('spacing-base') // false
 * ```
 */
export function globToRegex(pattern: string): RegExp {
  const cached = cache.get(pattern)
  if (cached) {
    cache.delete(pattern)
    cache.set(pattern, cached)
    return cached
  }

  const regex = new RegExp(
    '^' +
      pattern
        .split('*')
        .map((part) => part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
        .join('.*') +
      '$',
  )

  if (cache.size >= MAX_CACHE_SIZE) {
    const oldest = cache.keys().next().value
    if (oldest !== undefined) {
      cache.delete(oldest)
    }
  }

  cache.set(pattern, regex)
  return regex
}

/**
 * Check if a name matches any of the given glob patterns
 *
 * @param name - String to test
 * @param patterns - Array of glob patterns
 * @returns true if name matches any pattern
 *
 * @example
 * ```typescript
 * matchesGlob('color-primary', ['color-*', 'spacing-*']) // true
 * matchesGlob('typography-base', ['color-*']) // false
 * ```
 */
export function matchesGlob(name: string, patterns: string[]): boolean {
  return patterns.some((pattern) => globToRegex(pattern).test(name))
}

/**
 * Clear the glob pattern cache
 *
 * Useful for testing or when memory needs to be reclaimed.
 */
export function clearGlobCache(): void {
  cache.clear()
}
