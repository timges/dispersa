/**
 * @license MIT
 * Copyright (c) 2025-present Dispersa
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

/**
 * @fileoverview Rule: no-going-back
 *
 * Enforces semantic layering - tokens can only reference tokens in the same
 * or lower layers, not higher layers.
 */

import { createRule } from '@lint/create-rule'
import { extractReferences, matchesGlob } from '@lint/utils'

export const NoGoingBackMessages = {
  LAYER_VIOLATION: 'LAYER_VIOLATION',
  INVALID_LAYER: 'INVALID_LAYER',
} as const

export type NoGoingBackOptions = {
  /**
   * Layer hierarchy definition.
   * Keys are layer names, values are numeric ranks (lower = more primitive).
   * Default: { base: 0, semantic: 1, component: 2 }
   */
  layers?: Record<string, number>
  /**
   * Index of path segment that indicates the layer.
   * Default: 1 (second segment, e.g., color.base.primary -> base)
   */
  layerIndex?: number
  /** Token name patterns to ignore (glob patterns) */
  ignore?: string[]
}

const DEFAULT_LAYERS: Record<string, number> = {
  base: 0,
  semantic: 1,
  component: 2,
}

export const noGoingBack = createRule<
  (typeof NoGoingBackMessages)[keyof typeof NoGoingBackMessages],
  NoGoingBackOptions
>({
  meta: {
    name: 'no-going-back',
    description: 'Enforce semantic layering - tokens can only reference same or lower layers',
    messages: {
      LAYER_VIOLATION:
        "Token '{{name}}' in layer '{{layer}}' references '{{ref}}' in higher layer '{{refLayer}}'",
      INVALID_LAYER:
        "Token '{{name}}' has unknown layer '{{layer}}'. Valid layers: {{validLayers}}",
    },
  },
  defaultOptions: {},
  create({ tokens, options, report }) {
    const layers = options.layers ?? DEFAULT_LAYERS
    const layerIndex = options.layerIndex ?? 1
    const ignore = options.ignore ?? []

    function getLayer(token: { path: string[] }): {
      name: string
      rank: number | null
    } {
      const layerName = token.path[layerIndex]
      if (layerName === undefined) {
        return { name: 'unknown', rank: null }
      }
      const rank = layers[layerName]
      return { name: layerName, rank: rank ?? null }
    }

    for (const token of Object.values(tokens)) {
      if (ignore.length > 0 && matchesGlob(token.name, ignore)) {
        continue
      }

      const { name: tokenLayer, rank: tokenRank } = getLayer(token)

      if (tokenRank === null) {
        continue
      }

      const refs = extractReferences(token.originalValue)

      for (const ref of refs) {
        const refToken = tokens[ref]
        if (!refToken) {
          continue
        }

        const { name: refLayer, rank: refRank } = getLayer(refToken)

        if (refRank === null) {
          continue
        }

        if (refRank > tokenRank) {
          report({
            token,
            messageId: 'LAYER_VIOLATION',
            data: {
              name: token.name,
              layer: tokenLayer,
              ref,
              refLayer,
            },
          })
        }
      }
    }
  },
})
