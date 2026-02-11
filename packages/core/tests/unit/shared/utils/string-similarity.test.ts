/**
 * @fileoverview Unit tests for string similarity utilities
 *
 * Tests Levenshtein distance calculation, similar string matching,
 * and suggestion formatting for "did you mean?" error hints.
 */

import { describe, expect, it } from 'vitest'

import { findSimilar, levenshteinDistance } from '../../../../src/shared/utils/string-similarity'

describe('levenshteinDistance', () => {
  it('should return 0 for identical strings', () => {
    expect(levenshteinDistance('color', 'color')).toBe(0)
  })

  it('should return length of other string when one is empty', () => {
    expect(levenshteinDistance('', 'abc')).toBe(3)
    expect(levenshteinDistance('abc', '')).toBe(3)
  })

  it('should return 0 for two empty strings', () => {
    expect(levenshteinDistance('', '')).toBe(0)
  })

  it('should count single character insertion', () => {
    expect(levenshteinDistance('color', 'colors')).toBe(1)
  })

  it('should count single character deletion', () => {
    expect(levenshteinDistance('colors', 'color')).toBe(1)
  })

  it('should count single character substitution', () => {
    expect(levenshteinDistance('color', 'coler')).toBe(1)
  })

  it('should handle transpositions as two edits', () => {
    // Levenshtein treats transposition as delete + insert = 2
    expect(levenshteinDistance('ab', 'ba')).toBe(2)
  })

  it('should handle completely different strings', () => {
    expect(levenshteinDistance('abc', 'xyz')).toBe(3)
  })

  it('should handle real-world token name typos', () => {
    expect(levenshteinDistance('color.primary', 'color.primery')).toBe(1)
    expect(levenshteinDistance('color.background', 'color.backgrund')).toBe(1)
    expect(levenshteinDistance('spacing.small', 'spacing.smal')).toBe(1)
  })

  it('should be symmetric', () => {
    expect(levenshteinDistance('kitten', 'sitting')).toBe(levenshteinDistance('sitting', 'kitten'))
  })
})

describe('findSimilar', () => {
  const tokenNames = [
    'color.primary',
    'color.primary.dark',
    'color.secondary',
    'color.background',
    'spacing.small',
    'spacing.medium',
    'spacing.large',
    'typography.heading',
    'typography.body',
  ]

  it('should find close matches for a typo', () => {
    const result = findSimilar('color.primery', tokenNames)
    expect(result).toContain('color.primary')
  })

  it('should return closest matches first', () => {
    const result = findSimilar('color.primary', [
      'color.primaries',
      'color.primary.dark',
      'color.primarey',
    ])
    // 'color.primarey' is distance 1, closest to 'color.primary'
    expect(result[0]).toBe('color.primarey')
  })

  it('should return empty array when no candidates match', () => {
    const result = findSimilar('completely.different', ['a', 'b', 'c'])
    expect(result).toEqual([])
  })

  it('should return empty array for empty candidates', () => {
    const result = findSimilar('anything', [])
    expect(result).toEqual([])
  })

  it('should respect maxResults limit', () => {
    const candidates = ['color.primar', 'color.primary', 'color.primarey', 'color.primari']
    const result = findSimilar('color.primar', candidates, undefined, 2)
    expect(result.length).toBeLessThanOrEqual(2)
  })

  it('should not include exact matches (distance 0)', () => {
    const result = findSimilar('color.primary', ['color.primary', 'color.secondary'])
    expect(result).not.toContain('color.primary')
  })

  it('should be case-insensitive in comparison', () => {
    const result = findSimilar('Color.Primary', ['color.primary', 'color.secondary'])
    // distance 0 case-insensitive, so excluded (exact match)
    expect(result).not.toContain('color.primary')
  })

  it('should handle custom maxDistance', () => {
    const result = findSimilar('abc', ['abcd', 'abcde', 'abcdef'], 1)
    // 'abcd' is distance 1, 'abcde' is distance 2 (excluded)
    expect(result).toEqual(['abcd'])
  })

  it('should find similar modifier names', () => {
    const modifiers = ['theme', 'platform', 'density', 'brand']
    const result = findSimilar('thme', modifiers)
    expect(result).toContain('theme')
  })

  it('should find similar context values', () => {
    const contexts = ['light', 'dark', 'high-contrast']
    const result = findSimilar('ligt', contexts)
    expect(result).toContain('light')
  })
})
