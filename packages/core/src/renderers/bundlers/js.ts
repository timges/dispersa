/**
 * @fileoverview JavaScript module bundler for multi-theme output
 */

import type { ResolverDocument } from '@lib/resolution/resolution.types'
import type { ResolvedTokens } from '@lib/tokens/types'
import type { JsModuleRendererOptions } from '@renderers/types'
import { ConfigurationError } from '@shared/errors/index'

import type { BundleDataItem } from './types'
import { buildMetadata, normalizeModifierInputs, stripInternalMetadata } from './utils'

/**
 * Extract object literal from formatted JS module using balanced brace matching
 * More robust than regex for handling nested objects/arrays
 */
function extractObjectFromJsModule(formattedJs: string): string {
  // Find the start of the object assignment: "const name = {"
  const assignmentMatch = /const\s+\w+\s*=\s*\{/.exec(formattedJs)
  if (!assignmentMatch) {
    return '{}'
  }

  const startIndex = assignmentMatch.index + assignmentMatch[0].length - 1 // Include the opening brace
  let braceCount = 0
  let inString = false
  let stringChar = ''
  let escaped = false

  for (let i = startIndex; i < formattedJs.length; i++) {
    const char = formattedJs[i]

    // Handle string literals (ignore braces inside strings)
    if (!escaped && (char === '"' || char === "'" || char === '`')) {
      if (!inString) {
        inString = true
        stringChar = char
      } else if (char === stringChar) {
        inString = false
        stringChar = ''
      }
    }

    // Track escape sequences
    escaped = !escaped && char === '\\'

    // Count braces when not in a string
    if (!inString) {
      if (char === '{') {
        braceCount++
      } else if (char === '}') {
        braceCount--
        if (braceCount === 0) {
          // Found the matching closing brace
          return formattedJs.substring(startIndex, i + 1)
        }
      }
    }
  }

  // Fallback if no matching brace found
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
  metadata: ReturnType<typeof buildMetadata>,
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

  for (const { tokens, modifierInputs } of bundleData) {
    const cleanTokens = stripInternalMetadata(tokens)
    const key = buildStableDashKey({
      modifierInputs,
      dimensions: metadata.dimensions,
      defaults: metadata.defaults,
    })
    const camelKey = toCamelKey(key)
    const formattedJs = await formatTokens(cleanTokens)
    const tokenObject = extractObjectFromJsModule(formattedJs)
    const indentedObject = tokenObject.replace(/\n/g, '\n  ')
    jsBlocks.push(`  // ${key}\n  ${JSON.stringify(camelKey)}: ${indentedObject}`)
  }

  return assembleJsBundle(metadata, jsBlocks, options?.generateHelper ?? false)
}
