/**
 * @license MIT
 * Copyright (c) 2025-present Dispersa Contributors
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

/**
 * @fileoverview JavaScript module bundler for multi-theme output
 */

import type { JsModuleRendererOptions } from '@renderers/types'
import type { ResolverDocument } from '@resolution/types'
import { ConfigurationError } from '@shared/errors/index'
import type { ResolvedTokens } from '@tokens/types'

import { buildModifierComment } from '../metadata'

import type { BundleDataItem } from './types'
import type { BundleMetadata } from './utils'
import { buildMetadata, normalizeModifierInputs, stripInternalMetadata } from './utils'

type StringTrackingState = {
  inString: boolean
  stringChar: string
  escaped: boolean
}

function updateStringTracking(state: StringTrackingState, char: string): void {
  if (!state.escaped && (char === '"' || char === "'" || char === '`')) {
    if (!state.inString) {
      state.inString = true
      state.stringChar = char
    } else if (char === state.stringChar) {
      state.inString = false
      state.stringChar = ''
    }
  }
  state.escaped = !state.escaped && char === '\\'
}

/**
 * Extract object literal from formatted JS module using balanced brace matching
 * More robust than regex for handling nested objects/arrays
 */
function extractObjectFromJsModule(formattedJs: string): string {
  const assignmentMatch = /const\s+\w+\s*=\s*\{/.exec(formattedJs)
  if (!assignmentMatch) {
    return '{}'
  }

  const startIndex = assignmentMatch.index + assignmentMatch[0].length - 1
  const state: StringTrackingState = { inString: false, stringChar: '', escaped: false }
  let braceCount = 0

  for (let i = startIndex; i < formattedJs.length; i++) {
    const char = formattedJs[i]!
    updateStringTracking(state, char)

    if (state.inString) {
      continue
    }

    if (char === '{') {
      braceCount++
    } else if (char === '}') {
      braceCount--
      if (braceCount === 0) {
        return formattedJs.substring(startIndex, i + 1)
      }
    }
  }

  return '{}'
}

function toCamelKey(key: string): string {
  if (key === '') {
    return ''
  }
  return key
    .split('-')
    .filter((part) => part !== '')
    .map((w, i) => (i === 0 ? w : w.charAt(0).toUpperCase() + w.slice(1)))
    .join('')
}

function buildStableDashKey(params: {
  modifierInputs: Record<string, string>
  dimensions: string[]
  defaults: Record<string, string>
}): string {
  const { modifierInputs, dimensions, defaults } = params
  const inputs = normalizeModifierInputs(modifierInputs)

  return dimensions
    .map((dimension) => {
      const value = inputs[dimension] ?? defaults[dimension] ?? ''
      return String(value)
    })
    .join('-')
}

/** Generate the optional getTokens helper function source */
function buildHelperFunction(dimensions: string[]): string {
  const dimensionOrder = dimensions.map((d) => JSON.stringify(d)).join(', ')
  return [
    `/**`,
    ` * Get tokens for a specific modifier combination`,
    ` * @param {Object} modifiers - Modifier values (e.g., { theme: 'dark', brand: 'partner-a' })`,
    ` * @returns {Object} Resolved tokens for the combination`,
    ` */`,
    `export function getTokens(modifiers = {}) {`,
    `  const key = [${dimensionOrder}]`,
    `    .map(dim => modifiers[dim] ?? tokenBundle._meta.defaults[dim])`,
    `    .join('-')`,
    `  const camelKey = key`,
    `    .split('-')`,
    `    .filter(Boolean)`,
    `    .map((w, i) => (i === 0 ? w : w.charAt(0).toUpperCase() + w.slice(1)))`,
    `    .join('')`,
    `  return tokenBundle.tokens[camelKey]`,
    `}`,
    ``,
    ``,
  ].join('\n')
}

/** Assemble the final JS bundle output string */
function assembleJsBundle(
  metadata: BundleMetadata,
  jsBlocks: string[],
  generateHelper: boolean,
): string {
  let output = `const tokenBundle = {\n`
  output += `  _meta: ${JSON.stringify(metadata, null, 2).replace(/\n/g, '\n  ')},\n`
  output += `  tokens: {\n${jsBlocks.join(',\n')}\n  }\n`
  output += `}\n\n`

  if (generateHelper) {
    output += buildHelperFunction(metadata.dimensions)
  }

  output += `export default tokenBundle\n`
  return output
}

/**
 * Bundle tokens as JS module with metadata and optional helper
 *
 * JS-specific strategy: All combinations for dynamic theming
 * - Includes metadata with dimensions and defaults
 * - All permutations included (no filtering)
 * - Optional helper function for key generation
 */
export async function bundleAsJsModule(
  bundleData: BundleDataItem[],
  resolver: ResolverDocument,
  options: JsModuleRendererOptions | undefined,
  formatTokens?: (tokens: ResolvedTokens) => Promise<string>,
): Promise<string> {
  if (!formatTokens) {
    throw new ConfigurationError('JS formatter was not provided')
  }

  const metadata = buildMetadata(resolver)
  const jsBlocks: string[] = []

  for (const { tokens, modifierInputs, isBase } of bundleData) {
    const cleanTokens = stripInternalMetadata(tokens)
    const key = buildStableDashKey({
      modifierInputs,
      dimensions: metadata.dimensions,
      defaults: metadata.defaults,
    })
    const camelKey = toCamelKey(key)

    const normalizedInputs = normalizeModifierInputs(modifierInputs)
    const modifierParts: string[] = []
    for (const dim of metadata.dimensions) {
      const value = normalizedInputs[dim.toLowerCase()]
      if (value) {
        modifierParts.push(`${dim}=${value}`)
      }
    }

    const formattedJs = await formatTokens(cleanTokens)
    const tokenObject = extractObjectFromJsModule(formattedJs)
    const indentedObject = tokenObject.replace(/\n/g, '\n  ')

    let comment: string
    if (modifierParts.length > 0) {
      const modifierPart = modifierParts[0]!
      const eqIndex = modifierPart.indexOf('=')
      const modifier = modifierPart.slice(0, eqIndex)
      const context = modifierPart.slice(eqIndex + 1)
      comment = buildModifierComment(modifier, context)
    } else if (isBase) {
      comment = '// Base permutation'
    } else {
      comment = `// ${key}`
    }

    jsBlocks.push(`  ${comment}\n  ${JSON.stringify(camelKey)}: ${indentedObject}`)
  }

  return assembleJsBundle(metadata, jsBlocks, options?.generateHelper ?? false)
}
