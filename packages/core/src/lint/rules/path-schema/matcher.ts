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
  private strict: boolean

  constructor(config: PathSchemaConfig) {
    this.segments = config.segments ?? {}
    this.pathPatterns = this.compilePaths(config.paths ?? [], this.segments)
    this.transitionRules = this.compileTransitions(config.transitions ?? [])
    this.strict = config.strict ?? true
  }

  /**
   * Validate a token against the schema
   */
  validate(token: ResolvedToken): Violation[] {
    const violations: Violation[] = []
    const pathSegments = token.path

    // Check transitions if defined
    if (this.transitionRules.length > 0) {
      violations.push(...this.validateTransitions(pathSegments, token.name))
    }

    // Check against path patterns if defined
    if (this.pathPatterns.length > 0) {
      const matchesAny = this.pathPatterns.some((p) => this.matchPattern(p, pathSegments))
      if (!matchesAny && this.strict) {
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
   * Match path segments against a compiled pattern
   * The pattern may include '.' literals which are the implicit path separators
   * and '*' wildcards that match any single segment
   */
  private matchPattern(pattern: CompiledPattern, pathSegments: string[]): boolean {
    // Count segment placeholders and wildcards (not '.' separators)
    const segmentCount = pattern.filter((p) => p.type === 'segment' || p.type === 'wildcard').length
    if (segmentCount !== pathSegments.length) {
      return false
    }

    let pathIndex = 0
    for (const part of pattern) {
      if (part.type === 'literal') {
        // Literals in patterns represent path separators ('.')
        // We just validate they're '.' since paths are dot-separated
        if (part.value !== '.') {
          return false
        }
        continue
      }

      const value = pathSegments[pathIndex]
      pathIndex++

      if (value === undefined) {
        return false
      }

      // Wildcard matches any single segment
      if (part.type === 'wildcard') {
        continue
      }

      // At this point, part must be a segment placeholder
      // Segment placeholder - check if defined and matches
      const segment = this.segments[part.name]
      if (!segment) {
        // Undefined segment - skip validation (acts as wildcard)
        continue
      }

      if (!this.matchesSegmentDefinition(value, segment)) {
        return false
      }
    }

    return true
  }

  /**
   * Check if a value matches a segment definition
   */
  private matchesSegmentDefinition(value: string, definition: SegmentDefinition): boolean {
    const { values } = definition
    if (Array.isArray(values)) {
      return values.includes(value)
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
