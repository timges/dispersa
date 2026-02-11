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

/** Minimum edit distance threshold for "did you mean?" suggestions */
const MIN_EDIT_DISTANCE = 2

/** Fraction of target string length used to auto-scale the max distance */
const SIMILARITY_THRESHOLD_FACTOR = 0.4

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

  const threshold =
    maxDistance ??
    Math.max(MIN_EDIT_DISTANCE, Math.ceil(target.length * SIMILARITY_THRESHOLD_FACTOR))

  const scored = candidates
    .map((candidate) => ({
      value: candidate,
      distance: levenshteinDistance(target.toLowerCase(), candidate.toLowerCase()),
    }))
    .filter((entry) => entry.distance <= threshold && entry.distance > 0)
    .sort((a, b) => a.distance - b.distance)

  return scored.slice(0, maxResults).map((entry) => entry.value)
}
