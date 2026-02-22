/**
 * @license MIT
 * Copyright (c) 2025-present Dispersa
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

/**
 * @fileoverview Rule: path-schema
 *
 * Enforces token path structure using segment definitions and patterns.
 */

import { createRule } from '@lint/create-rule'

import { PathSchemaMatcher, matchesGlob } from './matcher'
import type { PathSchemaConfig } from './types'

export { type PathSchemaConfig, type SegmentDefinition, type TransitionRule } from './types'

export const PathSchemaMessages = {
  INVALID_PATH: 'INVALID_PATH',
  UNKNOWN_SEGMENT: 'UNKNOWN_SEGMENT',
  FORBIDDEN_TRANSITION: 'FORBIDDEN_TRANSITION',
} as const

export const pathSchema = createRule<
  (typeof PathSchemaMessages)[keyof typeof PathSchemaMessages],
  PathSchemaConfig
>({
  meta: {
    name: 'path-schema',
    description: 'Enforce token path segment structure',
    messages: {
      INVALID_PATH: "Token path '{{path}}' does not match any defined pattern",
      UNKNOWN_SEGMENT: "Segment '{{segment}}' at position {{position}} in '{{path}}' is not valid",
      FORBIDDEN_TRANSITION: "Segment '{{to}}' cannot follow '{{from}}' in path '{{path}}'",
    },
  },
  defaultOptions: {
    segments: {},
    paths: [],
    transitions: [],
    strict: true,
  },
  create({ tokens, options, report }) {
    const ignore = options.ignore ?? []

    // Skip if no patterns or transitions defined
    if (
      (!options.paths || options.paths.length === 0) &&
      (!options.transitions || options.transitions.length === 0)
    ) {
      return
    }

    const matcher = new PathSchemaMatcher(options)

    for (const token of Object.values(tokens)) {
      // Skip ignored tokens
      if (ignore.length > 0 && matchesGlob(token.name, ignore)) {
        continue
      }

      const violations = matcher.validate(token)

      for (const violation of violations) {
        report({
          token,
          messageId: violation.type,
          data: violation.data as Record<string, string>,
        })
      }
    }
  },
})
