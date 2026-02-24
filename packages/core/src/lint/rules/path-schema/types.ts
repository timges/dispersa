/**
 * @license MIT
 * Copyright (c) 2025-present Dispersa
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

/**
 * @fileoverview Types for path-schema rule
 */

/**
 * Definition of a named path segment
 */
export type SegmentDefinition = {
  /** Allowed values (array of strings or regex pattern, or single regex) */
  values: string[] | RegExp | Array<string | RegExp>
  /** Human-readable description */
  description?: string
  /** Whether this segment is optional */
  optional?: boolean
}

/**
 * Transition rule for context-aware segment validation
 */
export type TransitionRule = {
  /** Segment value or pattern to match (from) */
  from: string | string[] | RegExp
  /** Allowed/forbidden segment values or patterns (to) */
  to: string | string[] | RegExp
  /** Whether transition is allowed. Default: true */
  allow?: boolean
}

/**
 * Path pattern (string with {segment} placeholders)
 */
export type PathPattern = string

/**
 * Configuration for path-schema rule
 */
export type PathSchemaConfig = {
  /**
   * Named segment definitions.
   * Maps segment name to allowed values/description.
   *
   * @example
   * ```typescript
   * {
   *   domain: { values: ['color', 'spacing'], description: 'Token domain' },
   *   layer: { values: ['base', 'semantic', 'component'] },
   *   scale: { values: ['xs', 'sm', 'md', 'lg', 'xl'] },
   *   brand: { values: /^[a-z]+$/, description: 'Brand name' },
   * }
   * ```
   */
  segments?: Record<string, SegmentDefinition>

  /**
   * Valid path patterns using {segment} placeholders.
   *
   * @example
   * ```typescript
   * [
   *   'color.base.{brand}',
   *   'color.semantic.{element}.{role}',
   *   'color.component.{component}.{element}.{state}',
   * ]
   * ```
   */
  paths?: PathPattern[]

  /**
   * Context-aware transition rules.
   * Alternative to patterns - define which segments can follow which.
   *
   * @example
   * ```typescript
   * [
   *   { from: 'color', to: ['base', 'semantic', 'component'] },
   *   { from: 'semantic', to: ['text', 'bg', 'border'] },
   *   { from: 'semantic', to: 'component', allow: false },
   * ]
   * ```
   */
  transitions?: TransitionRule[]

  /**
   * Token name patterns to ignore (glob patterns)
   */
  ignore?: string[]
}
