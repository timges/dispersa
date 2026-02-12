/**
 * @fileoverview Modifier input validation, normalization, and default filling
 *
 * Extracts the input processing concern from ResolutionEngine into a focused module.
 * Handles: type validation, case-insensitive normalization, input validation against
 * defined modifiers/contexts, and filling defaults for unspecified modifiers.
 */

import { ConfigurationError, ModifierError } from '@shared/errors/index'
import { CaseInsensitiveMap } from '@shared/utils/case-insensitive-map'
import { findSimilar } from '@shared/utils/string-similarity'
import { ValidationHandler } from '@shared/utils/validation-handler'

import type { Modifier, ModifierInputs, ResolverDocument } from './resolution.types'

export type PreparedInputs = {
  normalizedInputs: ModifierInputs
  resolvedInputs: ModifierInputs
}

type InputProcessorConfig = {
  modifiers: ResolverDocument['modifiers']
  validationHandler: ValidationHandler
  errorOnMissingDefault?: boolean
}

export class ModifierInputProcessor {
  private modifiers: ResolverDocument['modifiers']
  private validationHandler: ValidationHandler
  private errorOnMissingDefault: boolean | undefined

  constructor(config: InputProcessorConfig) {
    this.modifiers = config.modifiers
    this.validationHandler = config.validationHandler
    this.errorOnMissingDefault = config.errorOnMissingDefault
  }

  /**
   * Validate, normalize, and fill defaults for modifier inputs
   *
   * Processing order:
   * 1. Type-check values (must be strings)
   * 2. Normalize keys/values to lowercase (DTCG case-insensitive requirement)
   * 3. Validate against defined modifiers/contexts
   * 4. Fill defaults for unspecified modifiers
   *
   * @param modifierInputs - Raw user-supplied modifier inputs (e.g. `{ theme: 'dark' }`)
   * @returns Normalized inputs (lowercased) and resolved inputs (preserving original casing from resolver)
   */
  prepare(modifierInputs: ModifierInputs): PreparedInputs {
    if (this.validationHandler.shouldValidate()) {
      this.validateInputTypes(modifierInputs)
    }

    const originalInputMap = this.buildOriginalInputMap(modifierInputs)
    const normalizedInputs = this.normalizeInputs(modifierInputs)

    if (this.validationHandler.shouldValidate()) {
      this.validateInputs(normalizedInputs)
    }

    const normalizedWithDefaults = this.fillDefaults(normalizedInputs)
    const resolvedInputs = this.buildResolvedInputs(normalizedWithDefaults, originalInputMap)

    return { normalizedInputs: normalizedWithDefaults, resolvedInputs }
  }

  /**
   * Validate that all input values are strings (DTCG spec section 5.2)
   */
  private validateInputTypes(inputs: ModifierInputs): void {
    for (const [key, value] of Object.entries(inputs)) {
      if (typeof value !== 'string') {
        this.validationHandler.handleIssue(
          new ConfigurationError(
            `Invalid input type for modifier "${key}". Expected string but got ${typeof value}. ` +
              `All modifier inputs must be strings (e.g., { "beta": "true" } not { "beta": true }).`,
          ),
        )
      }
    }
  }

  /**
   * Normalize modifier inputs to be case-insensitive
   *
   * Per DTCG spec SHOULD requirement: inputs should be case-insensitive.
   * For example, { "theme": "dark" }, { "Theme": "Dark" }, and { "THEME": "DARK" }
   * should be treated as equivalent.
   */
  private normalizeInputs(inputs: ModifierInputs): ModifierInputs {
    const normalized: ModifierInputs = {}

    for (const [key, value] of Object.entries(inputs)) {
      if (typeof value !== 'string') {
        continue
      }
      normalized[key.toLowerCase()] = value.toLowerCase()
    }

    return normalized
  }

  private buildOriginalInputMap(
    inputs: ModifierInputs,
  ): Map<string, { key: string; value: string }> {
    const original = new Map<string, { key: string; value: string }>()
    for (const [key, value] of Object.entries(inputs)) {
      if (typeof value !== 'string') {
        continue
      }
      const lowerKey = key.toLowerCase()
      if (!original.has(lowerKey)) {
        original.set(lowerKey, { key, value })
      }
    }
    return original
  }

  private buildResolvedInputs(
    normalizedInputs: ModifierInputs,
    originalInputMap: Map<string, { key: string; value: string }>,
  ): ModifierInputs {
    const resolved: ModifierInputs = {}
    const seenNormalized = new Set<string>()

    if (this.modifiers) {
      for (const [modifierName, modifier] of Object.entries(this.modifiers)) {
        const normalizedName = modifierName.toLowerCase()
        const normalizedValue = normalizedInputs[normalizedName]
        if (normalizedValue == null) {
          continue
        }
        seenNormalized.add(normalizedName)
        const contextMap = new CaseInsensitiveMap<string>()
        for (const contextName of Object.keys(modifier.contexts)) {
          contextMap.set(contextName, contextName)
        }
        const originalContext = contextMap.getOriginalKey(normalizedValue)
        const fallbackValue = originalInputMap.get(normalizedName)?.value ?? normalizedValue
        resolved[modifierName] = originalContext ?? fallbackValue
      }
    }

    for (const [normalizedName, normalizedValue] of Object.entries(normalizedInputs)) {
      if (seenNormalized.has(normalizedName)) {
        continue
      }
      const originalEntry = originalInputMap.get(normalizedName)
      resolved[originalEntry?.key ?? normalizedName] = originalEntry?.value ?? normalizedValue
    }

    return resolved
  }

  /**
   * Validate modifier inputs against defined modifiers and contexts
   * Note: inputs should already be normalized to lowercase before calling
   */
  private validateInputs(inputs: ModifierInputs): void {
    if (!this.modifiers) {
      if (Object.keys(inputs).length > 0) {
        throw new ConfigurationError('No modifiers defined in resolver document')
      }
      return
    }

    const modifierMap = new CaseInsensitiveMap<{ name: string; modifier: Modifier }>()
    for (const [name, modifier] of Object.entries(this.modifiers)) {
      modifierMap.set(name, { name, modifier: modifier as Modifier })
    }

    const allModifierNames = Object.keys(this.modifiers)

    for (const [modifierName, contextValue] of Object.entries(inputs)) {
      const modifierEntry = modifierMap.get(modifierName)

      if (modifierEntry === undefined) {
        const suggestions = findSimilar(modifierName, allModifierNames)
        this.validationHandler.handleIssue(new ModifierError(modifierName, undefined, suggestions))
        continue
      }

      const contextMap = new CaseInsensitiveMap<string>()
      for (const contextName of Object.keys(modifierEntry.modifier.contexts)) {
        contextMap.set(contextName, contextName)
      }

      if (!contextMap.has(contextValue)) {
        const validContexts = Object.keys(modifierEntry.modifier.contexts)
        this.validationHandler.handleIssue(
          new ModifierError(modifierName, contextValue, validContexts),
        )
      }
    }
  }

  /**
   * Fill in default values for missing modifiers
   * Note: inputs should already be normalized to lowercase before calling
   */
  private fillDefaults(inputs: ModifierInputs): ModifierInputs {
    if (!this.modifiers) {
      return { ...inputs }
    }

    const result = { ...inputs }

    for (const [modifierName, modifier] of Object.entries(this.modifiers)) {
      const normalizedModifierName = modifierName.toLowerCase()

      if (normalizedModifierName in result) {
        continue
      }

      if (modifier.default) {
        result[normalizedModifierName] = modifier.default.toLowerCase()
        continue
      }

      if (this.shouldErrorOnMissingDefault()) {
        throw new ConfigurationError(`No default value for modifier: ${modifierName}`)
      }

      this.validationHandler.warn(
        `Missing modifier input for "${modifierName}". Using first context.`,
      )
      const firstContext = Object.keys(modifier.contexts)[0]
      if (firstContext) {
        result[normalizedModifierName] = firstContext.toLowerCase()
      }
    }

    return result
  }

  private shouldErrorOnMissingDefault(): boolean {
    if (this.errorOnMissingDefault !== undefined) {
      return this.errorOnMissingDefault
    }
    return this.validationHandler.isStrict()
  }
}
