/**
 * @fileoverview Resolution engine for applying sets and modifiers
 */

import type { InternalTokenDocument } from '@lib/tokens/types'
import { ConfigurationError, ModifierError } from '@shared/errors/index'
import type { ValidationOptions } from '@shared/types/validation'
import { CaseInsensitiveMap } from '@shared/utils/case-insensitive-map'
import { findSimilar } from '@shared/utils/string-similarity'
import { ValidationHandler } from '@shared/utils/validation-handler'

import { ReferenceResolver } from './reference-resolver'
import type {
  Modifier,
  ModifierInputs,
  ReferenceObject,
  ResolverDocument,
  Set,
} from './resolution.types'

export type ResolutionOptions = {
  errorOnMissingDefault?: boolean
  validation?: ValidationOptions
}

export class ResolutionEngine {
  private resolver: ResolverDocument
  private refResolver: ReferenceResolver
  private options: ResolutionOptions
  private validationHandler: ValidationHandler

  constructor(
    resolver: ResolverDocument,
    refResolver: ReferenceResolver,
    options: ResolutionOptions = {},
  ) {
    this.resolver = resolver
    this.refResolver = refResolver
    this.options = {
      ...options,
    }
    this.validationHandler = new ValidationHandler(options.validation)
  }

  /**
   * Get the resolver document
   */
  getResolver(): ResolverDocument {
    return this.resolver
  }

  /**
   * Resolve tokens for given modifier inputs
   */
  async resolve(modifierInputs: ModifierInputs = {}): Promise<InternalTokenDocument> {
    const { normalizedInputs } = this.prepareInputs(modifierInputs)
    return this.resolveWithPreparedInputs(normalizedInputs)
  }

  async resolveWithInputs(modifierInputs: ModifierInputs = {}): Promise<{
    tokens: InternalTokenDocument
    modifierInputs: ModifierInputs
  }> {
    const { normalizedInputs, resolvedInputs } = this.prepareInputs(modifierInputs)
    const tokens = await this.resolveWithPreparedInputs(normalizedInputs)
    return { tokens, modifierInputs: resolvedInputs }
  }

  prepareInputs(modifierInputs: ModifierInputs): {
    normalizedInputs: ModifierInputs
    resolvedInputs: ModifierInputs
  } {
    // Validate input types (DTCG spec section 5.2: inputs MUST be strings)
    if (this.validationHandler.shouldValidate()) {
      this.validateInputTypes(modifierInputs)
    }

    const originalInputMap = this.buildOriginalInputMap(modifierInputs)

    // Normalize inputs to be case-insensitive per DTCG spec (SHOULD requirement)
    const normalizedInputs = this.normalizeInputs(modifierInputs)

    // Validate inputs
    if (this.validationHandler.shouldValidate()) {
      this.validateInputs(normalizedInputs)
    }

    // Fill in defaults for missing modifiers
    const normalizedWithDefaults = this.fillDefaults(normalizedInputs)
    const resolvedInputs = this.buildResolvedInputs(normalizedWithDefaults, originalInputMap)
    return { normalizedInputs: normalizedWithDefaults, resolvedInputs }
  }

  private async resolveWithPreparedInputs(inputs: ModifierInputs): Promise<InternalTokenDocument> {
    // Process resolution order
    let tokens: InternalTokenDocument = {}

    for (const item of this.resolver.resolutionOrder) {
      if (ReferenceResolver.isReference(item)) {
        const ref = item.$ref

        if (ref.startsWith('#/sets/')) {
          const setName = ref.slice('#/sets/'.length)
          const resolved = await this.refResolver.resolve(item, this.resolver)
          if (this.isSet(resolved)) {
            const setTokens = await this.resolveSet(resolved, inputs, setName)
            tokens = this.mergeTokens(tokens, setTokens)
            continue
          }
        }

        const resolved = await this.resolveReference(item, inputs)
        tokens = this.mergeTokens(tokens, resolved)
      } else if (this.isSet(item)) {
        const resolved = await this.resolveSet(item, inputs, this.getInlineName(item, 'set'))
        tokens = this.mergeTokens(tokens, resolved)
      } else if (this.isModifier(item)) {
        const resolved = await this.resolveModifier(item, inputs)
        tokens = this.mergeTokens(tokens, resolved)
      }
    }

    return tokens
  }

  /**
   * Generate all possible permutations based on modifiers
   */
  generatePermutations(): ModifierInputs[] {
    if (!this.resolver.modifiers) {
      return [{}]
    }

    const modifierEntries = this.getOrderedModifierEntries()
    if (modifierEntries.length === 0) {
      return [{}]
    }

    // Generate all combinations
    const combinations: ModifierInputs[] = [{}]

    for (const [modifierName, modifier] of modifierEntries) {
      const contexts = Object.keys(modifier.contexts)
      const newCombinations: ModifierInputs[] = []

      for (const combination of combinations) {
        for (const context of contexts) {
          newCombinations.push({
            ...combination,
            [modifierName]: context,
          })
        }
      }

      combinations.length = 0
      combinations.push(...newCombinations)
    }

    return combinations
  }

  private getOrderedModifierEntries(): [string, Modifier][] {
    const modifiers = this.resolver.modifiers
    if (!modifiers) {
      return []
    }

    const seen = new Set<string>()
    const ordered: [string, Modifier][] = []

    for (const item of this.resolver.resolutionOrder) {
      if (!ReferenceResolver.isReference(item)) {
        continue
      }

      // resolutionOrder references are JSON Pointers; we care about "#/modifiers/<name>"
      if (!item.$ref.startsWith('#/modifiers/')) {
        continue
      }

      const name = item.$ref.slice('#/modifiers/'.length)
      const modifier = modifiers[name]
      if (!modifier || seen.has(name)) {
        continue
      }

      ordered.push([name, modifier as Modifier])
      seen.add(name)
    }

    // Append any modifiers not listed in resolutionOrder to preserve behavior
    for (const [name, modifier] of Object.entries(modifiers)) {
      if (seen.has(name)) {
        continue
      }
      ordered.push([name, modifier as Modifier])
      seen.add(name)
    }

    return ordered
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

    if (this.resolver.modifiers) {
      for (const [modifierName, modifier] of Object.entries(this.resolver.modifiers)) {
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
   * Validate modifier inputs
   * Note: inputs should already be normalized to lowercase before calling this method
   */
  private validateInputs(inputs: ModifierInputs): void {
    if (!this.resolver.modifiers) {
      if (Object.keys(inputs).length > 0) {
        throw new ConfigurationError('No modifiers defined in resolver document')
      }
      return
    }

    // Create case-insensitive map of modifiers
    // Note: Type assertion needed because generated ResolverDocument type has looser
    // type for modifiers (unknown[]) than our Modifier type. See DX-COMPARISON.md
    const modifierMap = new CaseInsensitiveMap<{ name: string; modifier: Modifier }>()
    for (const [name, modifier] of Object.entries(this.resolver.modifiers)) {
      modifierMap.set(name, { name, modifier: modifier as Modifier })
    }

    const allModifierNames = Object.keys(this.resolver.modifiers)

    for (const [modifierName, contextValue] of Object.entries(inputs)) {
      const modifierEntry = modifierMap.get(modifierName)

      if (modifierEntry === undefined) {
        const suggestions = findSimilar(modifierName, allModifierNames)
        this.validationHandler.handleIssue(new ModifierError(modifierName, undefined, suggestions))
        continue
      }

      // Create case-insensitive map of contexts
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
   * Note: inputs should already be normalized to lowercase before calling this method
   */
  private fillDefaults(inputs: ModifierInputs): ModifierInputs {
    if (!this.resolver.modifiers) {
      return { ...inputs }
    }

    const result = { ...inputs }

    for (const [modifierName, modifier] of Object.entries(this.resolver.modifiers)) {
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
      // Use first context as default
      const firstContext = Object.keys(modifier.contexts)[0]
      if (firstContext) {
        result[normalizedModifierName] = firstContext.toLowerCase()
      }
    }

    return result
  }

  private shouldErrorOnMissingDefault(): boolean {
    if (this.options.errorOnMissingDefault !== undefined) {
      return this.options.errorOnMissingDefault
    }
    return this.validationHandler.isStrict()
  }

  /**
   * Resolve a reference object
   */
  private async resolveReference(
    ref: ReferenceObject,
    inputs: ModifierInputs,
  ): Promise<InternalTokenDocument> {
    const resolved = await this.refResolver.resolve(ref, this.resolver)

    if (this.isSet(resolved)) {
      return this.resolveSet(resolved, inputs)
    }

    if (this.isModifier(resolved)) {
      return this.resolveModifier(resolved, inputs)
    }

    // Assume it's a token collection
    return resolved as InternalTokenDocument
  }

  /**
   * Resolve a set
   */
  private async resolveSet(
    set: Set,
    _modifierInputs: ModifierInputs,
    setName?: string,
  ): Promise<InternalTokenDocument> {
    let tokens: InternalTokenDocument = {}

    for (const source of set.sources) {
      let sourceTokens: InternalTokenDocument
      if (ReferenceResolver.isReference(source)) {
        const resolved = await this.refResolver.resolve(source, this.resolver)
        sourceTokens = resolved as InternalTokenDocument
      } else {
        sourceTokens = source as InternalTokenDocument
      }

      // Tag tokens with their source set name (for bundle grouping)
      const taggedTokens = this.tagTokensWithSet(sourceTokens, setName ?? 'set')
      tokens = this.mergeTokens(tokens, taggedTokens)
    }

    return tokens
  }

  private getInlineName(node: unknown, fallback: string): string {
    if (typeof node !== 'object' || node === null) {
      return fallback
    }
    const name = (node as { name?: unknown }).name
    return typeof name === 'string' && name !== '' ? name : fallback
  }

  /**
   * Resolve a modifier based on inputs
   * Note: inputs are normalized to lowercase for case-insensitive matching
   */
  private async resolveModifier(
    modifier: Modifier,
    inputs: ModifierInputs,
  ): Promise<InternalTokenDocument> {
    const modifierName = this.findModifierName(modifier)
    const contextValue = this.resolveContextValue(modifier, inputs, modifierName)
    const { actualContextKey, context } = this.resolveContext(modifier, modifierName, contextValue)
    const sourceTag = this.buildSourceTag(modifierName, actualContextKey)

    return await this.resolveContextSources(context, sourceTag)
  }

  private findModifierName(modifier: Modifier): string | undefined {
    if (!this.resolver.modifiers) {
      return undefined
    }

    for (const [name, mod] of Object.entries(this.resolver.modifiers)) {
      if (mod === modifier) {
        return name
      }
    }

    return undefined
  }

  private resolveContextValue(
    modifier: Modifier,
    inputs: ModifierInputs,
    modifierName?: string,
  ): string {
    const inputValue = modifierName ? inputs[modifierName.toLowerCase()] : undefined
    const fallback =
      modifier.default?.toLowerCase() ?? Object.keys(modifier.contexts)[0]?.toLowerCase()
    const contextValue = inputValue ?? fallback

    if (!contextValue) {
      throw new ConfigurationError('Cannot determine context for modifier')
    }

    return contextValue
  }

  private resolveContext(
    modifier: Modifier,
    modifierName: string | undefined,
    contextValue: string,
  ): { actualContextKey: string; context: unknown[] } {
    const contextMap = new CaseInsensitiveMap<unknown>()
    for (const [key, value] of Object.entries(modifier.contexts)) {
      contextMap.set(key, value)
    }

    const availableContexts = Object.keys(modifier.contexts)

    const actualContextKey = contextMap.getOriginalKey(contextValue)
    if (actualContextKey === undefined) {
      throw new ModifierError(modifierName ?? 'unknown', contextValue, availableContexts)
    }

    const context = modifier.contexts[actualContextKey]
    if (context === undefined) {
      throw new ModifierError(modifierName ?? 'unknown', contextValue, availableContexts)
    }

    return { actualContextKey, context }
  }

  private buildSourceTag(modifierName: string | undefined, actualContextKey: string): string {
    if (modifierName && actualContextKey) {
      return `${modifierName}-${actualContextKey}`
    }
    return 'modifier'
  }

  private async resolveContextSources(
    context: unknown[],
    sourceTag: string,
  ): Promise<InternalTokenDocument> {
    let tokens: InternalTokenDocument = {}

    for (const source of context) {
      const sourceTokens = await this.resolveSourceTokens(source)
      const taggedTokens = this.tagTokensWithSource(sourceTokens, sourceTag)
      tokens = this.mergeTokens(tokens, taggedTokens)
    }

    return tokens
  }

  private async resolveSourceTokens(source: unknown): Promise<InternalTokenDocument> {
    if (ReferenceResolver.isReference(source)) {
      const resolved = await this.refResolver.resolve(source, this.resolver)
      return resolved as InternalTokenDocument
    }

    return source as InternalTokenDocument
  }

  /**
   * Merge two token objects (later values override earlier ones)
   */
  private mergeTokens(
    target: InternalTokenDocument,
    source: InternalTokenDocument,
  ): InternalTokenDocument {
    const result = { ...target }

    for (const [key, value] of Object.entries(source)) {
      if (
        typeof value === 'object' &&
        value !== null &&
        !Array.isArray(value) &&
        !('$value' in value)
      ) {
        // Recursively merge groups
        result[key] = this.mergeTokens(
          ((result[key] as InternalTokenDocument | undefined) ?? {}) as InternalTokenDocument,
          value as InternalTokenDocument,
        )
      } else {
        // Override token values
        result[key] = value
      }
    }

    return result
  }

  /**
   * Tag all tokens in a collection with their source modifier
   * Used for bundle mode to track which modifier defined each token
   */
  private tagTokensWithSource(
    tokens: InternalTokenDocument,
    sourceModifier: string,
  ): InternalTokenDocument {
    const result: InternalTokenDocument = {}

    for (const [key, value] of Object.entries(tokens)) {
      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        if ('$value' in value) {
          // This is a token - tag it with source
          result[key] = {
            ...value,
            _sourceModifier: sourceModifier,
          }
        } else {
          // This is a group - recursively tag children
          result[key] = this.tagTokensWithSource(value as InternalTokenDocument, sourceModifier)
        }
      } else {
        // Keep non-object values as-is
        result[key] = value
      }
    }

    return result
  }

  private tagTokensWithSet(
    tokens: InternalTokenDocument,
    sourceSet: string,
  ): InternalTokenDocument {
    const result: InternalTokenDocument = {}

    for (const [key, value] of Object.entries(tokens)) {
      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        if ('$value' in value) {
          result[key] = {
            ...value,
            _sourceSet: sourceSet,
          }
        } else {
          result[key] = this.tagTokensWithSet(value as InternalTokenDocument, sourceSet)
        }
      } else {
        result[key] = value
      }
    }

    return result
  }

  /**
   * Type guard for Set
   */
  private isSet(obj: unknown): obj is Set {
    return (
      typeof obj === 'object' &&
      obj !== null &&
      'sources' in obj &&
      Array.isArray((obj as { sources: unknown }).sources)
    )
  }

  /**
   * Type guard for Modifier
   */
  private isModifier(obj: unknown): obj is Modifier {
    return (
      typeof obj === 'object' &&
      obj !== null &&
      'contexts' in obj &&
      typeof (obj as { contexts: unknown }).contexts === 'object'
    )
  }
}
