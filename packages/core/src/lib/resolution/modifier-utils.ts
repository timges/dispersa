/**
 * @fileoverview Utilities for extracting modifier information
 */

import type { ModifierInputs, ResolverDocument } from './resolution.types'

/**
 * Extract modifier dimension, current context, and default context from inputs
 *
 * Finds which modifier dimension differs from the default values.
 * This is used to generate appropriate CSS selectors and JSON/JS keys.
 *
 * @param modifierInputs - Modifier key-value pairs
 * @param resolver - Resolver document containing modifier definitions
 * @returns Tuple of [modifier, context, defaultContext]
 *
 * @example
 * // For inputs { brand: "primary", theme: "dark", platform: "web" }
 * // with defaults { brand: "primary", theme: "light", platform: "web" }
 * // Returns: ["theme", "dark", "light"]
 */
export function extractModifierInfo(
  modifierInputs: ModifierInputs,
  resolver: ResolverDocument,
): [modifier: string, context: string, defaultContext: string] {
  // Build defaults map
  const defaults: ModifierInputs = {}
  if (resolver.modifiers) {
    for (const [name, modifier] of Object.entries(resolver.modifiers)) {
      defaults[name] = modifier.default ?? Object.keys(modifier.contexts)[0] ?? ''
    }
  }

  // Find which modifier differs from default
  let differingModifierName = ''
  let differingModifierValue = ''
  let defaultValue = ''

  for (const [name, value] of Object.entries(modifierInputs)) {
    if (value !== defaults[name]) {
      differingModifierName = name
      differingModifierValue = value
      defaultValue = defaults[name] ?? ''
      break
    }
  }

  // If no difference found (base permutation), use first modifier
  if (!differingModifierName) {
    differingModifierName = Object.keys(modifierInputs)[0] ?? ''
    differingModifierValue = modifierInputs[differingModifierName] ?? ''
    defaultValue = defaults[differingModifierName] ?? ''
  }

  return [differingModifierName, differingModifierValue, defaultValue]
}
