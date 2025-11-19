/**
 * @fileoverview String similarity utilities for "did you mean?" suggestions
 *
 * Uses Levenshtein distance to find close matches when users reference
 * nonexistent tokens, modifiers, or contexts.
 */

/**
 * Compute the Levenshtein edit distance between two strings.
 *
 * Uses the classic dynamic-programming algorithm with O(min(a,b)) space.
 *
 * @param a - First string
 * @param b - Second string
 * @returns Number of single-character edits (insert, delete, replace)
 */
export function levenshteinDistance(a: string, b: string): number {
  if (a === b) {
    return 0
  }
  if (a.length === 0) {
    return b.length
  }
  if (b.length === 0) {
    return a.length
  }

  // Ensure `a` is the shorter string for O(min(a,b)) space
  if (a.length > b.length) {
    ;[a, b] = [b, a]
  }

  const aLen = a.length
  const bLen = b.length

  // Single row of the DP matrix
  let prev = Array.from({ length: aLen + 1 }, (_, i) => i)

  for (let j = 1; j <= bLen; j++) {
    const curr = [j] as number[]
    for (let i = 1; i <= aLen; i++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      curr[i] = Math.min(
        curr[i - 1]! + 1, // insertion
        prev[i]! + 1, // deletion
        prev[i - 1]! + cost, // substitution
      )
    }
    prev = curr
  }

  return prev[aLen]!
}

/**
 * Find strings from `candidates` that are similar to `target`.
 *
 * Returns candidates sorted by distance (closest first), filtered to
 * those within `maxDistance`. A good default for maxDistance is roughly
 * 40% of the target length (minimum 2).
 *
 * @param target - The string the user typed
 * @param candidates - Available valid strings to match against
 * @param maxDistance - Maximum edit distance to consider (default: auto-scaled)
 * @returns Array of similar strings, closest first (at most `maxResults`)
 */
export function findSimilar(
  target: string,
  candidates: string[],
  maxDistance?: number,
  maxResults = 3,
): string[] {
  if (candidates.length === 0) {
    return []
  }

  const threshold = maxDistance ?? Math.max(2, Math.ceil(target.length * 0.4))

  const scored = candidates
    .map((candidate) => ({
      value: candidate,
      distance: levenshteinDistance(target.toLowerCase(), candidate.toLowerCase()),
    }))
    .filter((entry) => entry.distance <= threshold && entry.distance > 0)
    .sort((a, b) => a.distance - b.distance)

  return scored.slice(0, maxResults).map((entry) => entry.value)
}

/**
 * Format a "Did you mean?" hint for error messages.
 *
 * @param suggestions - Array of suggested strings
 * @returns Formatted hint string, or empty string if no suggestions
 *
 * @example
 * ```typescript
 * formatSuggestions(['color.primary', 'color.primary-dark'])
 * // → ' Did you mean "color.primary" or "color.primary-dark"?'
 * ```
 */
export function formatSuggestions(suggestions: string[]): string {
  if (suggestions.length === 0) {
    return ''
  }
  if (suggestions.length === 1) {
    return ` Did you mean "${suggestions[0]}"?`
  }

  const quoted = suggestions.map((s) => `"${s}"`)
  const last = quoted.pop()!
  return ` Did you mean ${quoted.join(', ')} or ${last}?`
}
