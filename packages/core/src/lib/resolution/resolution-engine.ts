/**
 * @fileoverview Resolution engine for applying sets and modifiers
 */

import type { InternalTokenDocument } from '@lib/tokens/types'
import { ConfigurationError, ModifierError } from '@shared/errors/index'
import type { ValidationOptions } from '@shared/types/validation'
import { CaseInsensitiveMap } from '@shared/utils/case-insensitive-map'
import { ValidationHandler } from '@shared/utils/validation-handler'

import { ModifierInputProcessor } from './modifier-input-processor'
import { ReferenceResolver } from './reference-resolver'
import type {
  Modifier,
  ModifierInputs,
  ReferenceObject,
  ResolverDocument,
  Set,
} from './resolution.types'

const JSON_POINTER_SETS_PREFIX = '#/sets/'
const JSON_POINTER_MODIFIERS_PREFIX = '#/modifiers/'

export type ResolutionOptions = {
  errorOnMissingDefault?: boolean
  validation?: ValidationOptions
}

export class ResolutionEngine {
  private resolver: ResolverDocument
  private refResolver: ReferenceResolver
  private validationHandler: ValidationHandler
  private inputProcessor: ModifierInputProcessor

  /** Pre-built reverse lookup from Modifier reference → modifier name */
  private modifierNameCache: Map<Modifier, string>

  constructor(
    resolver: ResolverDocument,
    refResolver: ReferenceResolver,
    options: ResolutionOptions = {},
  ) {
    this.resolver = resolver
    this.refResolver = refResolver
    this.validationHandler = new ValidationHandler(options.validation)
    this.inputProcessor = new ModifierInputProcessor({
      modifiers: resolver.modifiers,
      validationHandler: this.validationHandler,
      errorOnMissingDefault: options.errorOnMissingDefault,
    })
    this.modifierNameCache = this.buildModifierNameCache()
  }

  private buildModifierNameCache(): Map<Modifier, string> {
    const cache = new Map<Modifier, string>()
    if (!this.resolver.modifiers) {
      return cache
    }
    for (const [name, mod] of Object.entries(this.resolver.modifiers)) {
      cache.set(mod as Modifier, name)
    }
    return cache
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
    return this.inputProcessor.prepare(modifierInputs)
  }

  private async resolveWithPreparedInputs(inputs: ModifierInputs): Promise<InternalTokenDocument> {
    // Process resolution order
    let tokens: InternalTokenDocument = {}

    for (const item of this.resolver.resolutionOrder) {
      if (ReferenceResolver.isReference(item)) {
        const ref = item.$ref

        if (ref.startsWith(JSON_POINTER_SETS_PREFIX)) {
          const setName = ref.slice(JSON_POINTER_SETS_PREFIX.length)
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
      if (!item.$ref.startsWith(JSON_POINTER_MODIFIERS_PREFIX)) {
        continue
      }

      const name = item.$ref.slice(JSON_POINTER_MODIFIERS_PREFIX.length)
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
      const taggedTokens = this.tagTokens(sourceTokens, '_sourceSet', setName ?? 'set')
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
    return this.modifierNameCache.get(modifier)
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
      const taggedTokens = this.tagTokens(sourceTokens, '_sourceModifier', sourceTag)
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
   * Tag all tokens in a collection with a metadata property.
   * Used for bundle mode to track which set or modifier defined each token.
   */
  private tagTokens(
    tokens: InternalTokenDocument,
    property: '_sourceModifier' | '_sourceSet',
    value: string,
  ): InternalTokenDocument {
    const result: InternalTokenDocument = {}

    for (const [key, entry] of Object.entries(tokens)) {
      if (typeof entry === 'object' && entry !== null && !Array.isArray(entry)) {
        if ('$value' in entry) {
          result[key] = { ...entry, [property]: value }
        } else {
          result[key] = this.tagTokens(entry as InternalTokenDocument, property, value)
        }
      } else {
        result[key] = entry
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
