/**
 * @license MIT
 * Copyright (c) 2025-present Dispersa
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

/**
 * @fileoverview Path schema matcher implementation
 */

import { matchesGlob } from '@lint/utils'
import type { ResolvedToken } from '@tokens/types'

import type { PathSchemaConfig, SegmentDefinition, TransitionRule } from './types'

export type Violation = {
  type: 'INVALID_PATH' | 'UNKNOWN_SEGMENT' | 'FORBIDDEN_TRANSITION'
  data: Record<string, string | number>
}

type Pattern = string | string[] | RegExp

type CompiledPattern = Array<
  { type: 'segment'; name: string } | { type: 'literal'; value: string } | { type: 'wildcard' }
>

type CompiledTransition = {
  from: Pattern
  to: Pattern
  allow: boolean
}

export { matchesGlob }

/**
 * Compiles and validates token paths against a schema
 */
export class PathSchemaMatcher {
  private segments: Record<string, SegmentDefinition>
  private pathPatterns: CompiledPattern[]
  private transitionRules: CompiledTransition[]

  constructor(config: PathSchemaConfig) {
    this.segments = config.segments ?? {}
    this.pathPatterns = this.compilePaths(config.paths ?? [], this.segments)
    this.transitionRules = this.compileTransitions(config.transitions ?? [])
  }

  /**
   * Validate a token against the schema
   */
  validate(token: ResolvedToken): Violation[] {
    const violations: Violation[] = []
    const pathSegments = token.path
    const hasPaths = this.pathPatterns.length > 0
    const hasTransitions = this.transitionRules.length > 0

    // Check transitions if defined
    if (hasTransitions) {
      const transitionViolations = this.validateTransitions(pathSegments, token.name)
      violations.push(...transitionViolations)
    }

    // Check against path patterns if defined
    if (hasPaths) {
      const matchesAny = this.pathPatterns.some((p) => this.matchPattern(p, pathSegments))
      if (!matchesAny) {
        violations.push({
          type: 'INVALID_PATH',
          data: { path: token.name },
        })
      }
    }

    return violations
  }

  /**
   * Validate transitions between segments.
   *
   * Deny rules are checked independently (any match = violation).
   * Allow rules use OR semantics: at least one must match.
   */
  private validateTransitions(segments: string[], tokenName: string): Violation[] {
    const violations: Violation[] = []

    for (let i = 0; i < segments.length - 1; i++) {
      const from = segments[i]
      const to = segments[i + 1]

      if (!from || !to) {
        continue
      }

      const applicableRules = this.transitionRules.filter((r) => this.matchesPattern(from, r.from))

      if (applicableRules.length === 0) {
        continue
      }

      const denyRules = applicableRules.filter((r) => r.allow === false)
      const allowRules = applicableRules.filter((r) => r.allow !== false)

      for (const rule of denyRules) {
        if (this.matchesPattern(to, rule.to)) {
          violations.push({
            type: 'FORBIDDEN_TRANSITION',
            data: { from, to, path: tokenName },
          })
        }
      }

      if (allowRules.length > 0) {
        const anyAllowMatches = allowRules.some((r) => this.matchesPattern(to, r.to))
        if (!anyAllowMatches) {
          violations.push({
            type: 'FORBIDDEN_TRANSITION',
            data: { from, to, path: tokenName },
          })
        }
      }
    }

    return violations
  }

  /**
   * Check if a value matches a pattern
   */
  private matchesPattern(value: string, pattern: Pattern): boolean {
    if (typeof pattern === 'string') {
      return value === pattern
    }
    if (Array.isArray(pattern)) {
      return pattern.includes(value)
    }
    return pattern.test(value)
  }

  /**
   * Compile path patterns into matcher structures
   */
  private compilePaths(
    patterns: string[],
    segments: Record<string, SegmentDefinition>,
  ): CompiledPattern[] {
    return patterns.map((p) => this.parsePattern(p, segments))
  }

  /**
   * Parse a path pattern string into compiled form
   * - `{name}` is a segment placeholder
   * - `*` is a wildcard that matches any single segment
   * - `.` is the path separator (implicit between segments)
   */
  private parsePattern(
    pattern: string,
    _segments: Record<string, SegmentDefinition>,
  ): CompiledPattern {
    const parts: CompiledPattern = []
    const regex = /\{(\w+)\}|(\*)|([^{}*]+)/g
    let match

    while ((match = regex.exec(pattern)) !== null) {
      if (match[1]) {
        parts.push({ type: 'segment', name: match[1] })
      } else if (match[2]) {
        parts.push({ type: 'wildcard' })
      } else if (match[3]) {
        parts.push({ type: 'literal', value: match[3] })
      }
    }

    return parts
  }

  /**
   * Match path segments against a compiled pattern using dynamic programming.
   * Supports optional segments via DP table.
   *
   * DP[i][j] = can we match path[0..i) with pattern[0..j)?
   */
  private matchPattern(pattern: CompiledPattern, pathSegments: string[]): boolean {
    // Extract pattern parts that consume segments (segments + wildcards)
    // But include literals that are NOT just path separators (single dots)
    const patternParts = pattern.filter((p) => {
      if (p.type === 'segment' || p.type === 'wildcard') {
        return true
      }
      if (p.type === 'literal') {
        // Keep literals that are more than just separators (e.g., '.palette.')
        // Single '.' or sequences of '.' are path separators, not meaningful literals
        return p.value !== '.' && !/^\.+$/.test(p.value)
      }
      return false
    })
    const pathLen = pathSegments.length
    const patternLen = patternParts.length

    // DP table: dp[i][j] = can we match first i path segments with first j pattern parts?
    // Initialize with false values
    const dp: boolean[][] = []
    for (let i = 0; i <= pathLen; i++) {
      dp[i] = []
      for (let j = 0; j <= patternLen; j++) {
        dp[i]![j] = false
      }
    }

    // Base case: empty path matches empty pattern
    dp[0]![0] = true

    // Fill DP table
    for (let i = 0; i <= pathLen; i++) {
      for (let j = 0; j <= patternLen; j++) {
        const currentState = dp[i]![j]
        if (!currentState) {
          continue
        }

        // If we've consumed all path segments, we can still skip remaining optional pattern parts
        if (i === pathLen) {
          // Can skip remaining optional pattern parts
          if (j < patternLen && this.isPartOptional(patternParts[j]!)) {
            dp[i]![j + 1] = true
          }
          continue
        }

        // If we've consumed all pattern parts, we can only continue if path is also exhausted
        if (j === patternLen) {
          if (i === pathLen) {
            dp[i]![j] = true
          }
          continue
        }

        const part = patternParts[j]!

        // ALWAYS try to match current path segment with current pattern part first
        if (i < pathLen && this.matchPatternPart(part, pathSegments[i]!)) {
          dp[i + 1]![j + 1] = true
        }

        // THEN try skipping current pattern part if it's optional
        // (this is separate from matching - both can be valid)
        if (this.isPartOptional(part)) {
          dp[i]![j + 1] = true
        }
      }
    }

    // Path matches if we can reach any state where both path and pattern are consumed
    return dp[pathLen]![patternLen] ?? false
  }

  /**
   * Check if a pattern part is optional based on its segment definition
   */
  private isPartOptional(part: { type: string; name?: string }): boolean {
    if (part.type !== 'segment' || !part.name) {
      return false // Wildcards and literals are not optional
    }
    const segmentDef = this.segments[part.name]
    return segmentDef?.optional ?? false
  }

  /**
   * Match a single pattern part against a path segment value
   */
  private matchPatternPart(
    part: { type: string; name?: string; value?: string },
    value: string,
  ): boolean {
    if (part.type === 'wildcard') {
      return true
    }

    if (part.type === 'literal' && part.value !== undefined) {
      // Strip leading/trailing dots from literal for comparison
      // e.g., '.palette.' should match 'palette'
      const literalValue = part.value.replace(/^\.+|\.+$/g, '')
      return literalValue === value
    }

    if (part.type === 'segment' && part.name) {
      const segment = this.segments[part.name]
      if (!segment) {
        return true
      }
      return this.matchesSegmentDefinition(value, segment)
    }

    return false
  }

  /**
   * Check if a value matches a segment definition
   */
  private matchesSegmentDefinition(value: string, definition: SegmentDefinition): boolean {
    const { values } = definition
    if (Array.isArray(values)) {
      return values.some((v) => (typeof v === 'string' ? v === value : v.test(value)))
    }
    return values.test(value)
  }

  /**
   * Compile transition rules
   */
  private compileTransitions(transitions: TransitionRule[]): CompiledTransition[] {
    return transitions.map((t) => ({
      from: t.from,
      to: t.to,
      allow: t.allow ?? true,
    }))
  }
}
