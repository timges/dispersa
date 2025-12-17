/**
 * @fileoverview Figma Variables builder for multi-mode collections
 *
 * Handles the conversion of design tokens to Figma Variables JSON format,
 * supporting multiple modes (themes) within a single collection.
 */

import { createHash } from 'node:crypto'

import type { ResolvedToken } from '@config/index'
import {
  colorObjectToHex,
  isColorObject,
} from '@lib/processing/processors/transforms/built-in/color-converter'
import { isDimensionObject } from '@lib/processing/processors/transforms/built-in/dimension-converter'
import { extractModifierInfo } from '@lib/resolution/modifier-utils'
import type { ResolverDocument } from '@lib/resolution/resolution.types'
import { buildMetadata, normalizeModifierInputs } from '@renderers/bundlers/utils'
import type { PermutationData } from '@renderers/types'
import {
  formatDeprecationMessage,
  getPureAliasReferenceName,
  getSortedTokenEntries,
} from '@shared/utils/token-utils'

import type {
  FigmaCollection,
  FigmaOutput,
  FigmaResolvedType,
  FigmaValue,
  FigmaVariable,
} from './figma-types'

/**
 * Mode information with ID and modifier inputs
 */
type ModeInfo = {
  modeId: string
  name: string
  modifierInputs: Record<string, string>
}

/**
 * Token data organized by mode
 */
type TokenModeData = Map<string, { token: ResolvedToken; modifierInputs: Record<string, string> }>

/**
 * Builder for Figma Variables multi-mode collections
 */
export class FigmaVariablesBuilder {
  private collectionId: string
  private collectionName: string
  private modeMapping?: Record<string, string>
  private preserveReferences: boolean

  constructor(
    collectionName: string = 'Design Tokens',
    modeMapping?: Record<string, string>,
    preserveReferences: boolean = false,
  ) {
    this.collectionName = collectionName
    this.modeMapping = modeMapping
    this.preserveReferences = preserveReferences
    this.collectionId = this.generateId('collection')
  }

  /**
   * Build complete Figma Variables JSON from processed permutations
   */
  build(processedPermutations: PermutationData[], resolver: ResolverDocument): FigmaOutput {
    // Create modes and mode mapping
    const { modes, modeIdMap } = this.createModes(processedPermutations, resolver)

    // Create collection
    const collection: FigmaCollection = {
      id: this.collectionId,
      name: this.collectionName,
      modes: modes.map((m) => ({ modeId: m.modeId, name: m.name })),
    }

    // Collect tokens across all permutations
    const { allTokenNames, tokensByName } = this.collectTokens(processedPermutations, resolver)

    // Create variables from tokens
    const variables = this.createVariables(allTokenNames, tokensByName, modeIdMap)

    return {
      version: '1.0',
      collections: [collection],
      variables,
    }
  }

  /**
   * Create Figma modes from permutations
   */
  private createModes(
    processedPermutations: PermutationData[],
    resolver: ResolverDocument,
  ): {
    modes: ModeInfo[]
    modeIdMap: Record<string, string>
  } {
    const modes: ModeInfo[] = []
    const modeIdMap: Record<string, string> = {}
    const { dimensions, defaults } = buildMetadata(resolver)

    for (const { modifierInputs } of processedPermutations) {
      const normalizedInputs = normalizeModifierInputs(modifierInputs)
      const themeKey = dimensions
        .map((dimension) => normalizedInputs[dimension] ?? defaults[dimension] ?? '')
        .join('-')
      const [, context] = extractModifierInfo(modifierInputs, resolver)

      // Use friendly mode name from modifier info
      const baseName = context ? context.charAt(0).toUpperCase() + context.slice(1) : themeKey
      const mappedName =
        this.modeMapping && context && this.modeMapping[context]
          ? this.modeMapping[context]
          : baseName

      const modeId = this.generateId(`mode-${themeKey}`)
      modeIdMap[themeKey] = modeId
      modes.push({
        modeId,
        name: mappedName,
        modifierInputs,
      })
    }

    return { modes, modeIdMap }
  }

  /**
   * Collect all tokens across permutations, grouped by token name
   */
  private collectTokens(
    processedPermutations: PermutationData[],
    resolver: ResolverDocument,
  ): {
    allTokenNames: Set<string>
    tokensByName: Map<string, TokenModeData>
  } {
    const allTokenNames = new Set<string>()
    const tokensByName = new Map<string, TokenModeData>()
    const { dimensions, defaults } = buildMetadata(resolver)

    for (const { tokens, modifierInputs } of processedPermutations) {
      const normalizedInputs = normalizeModifierInputs(modifierInputs)
      const themeKey = dimensions
        .map((dimension) => normalizedInputs[dimension] ?? defaults[dimension] ?? '')
        .join('-')

      for (const [tokenName, token] of getSortedTokenEntries(tokens)) {
        allTokenNames.add(tokenName)

        if (!tokensByName.has(tokenName)) {
          tokensByName.set(tokenName, new Map())
        }
        const tokenMap = tokensByName.get(tokenName)
        if (tokenMap) {
          tokenMap.set(themeKey, {
            token,
            modifierInputs,
          })
        }
      }
    }

    return { allTokenNames, tokensByName }
  }

  /**
   * Create Figma variables from collected tokens
   */
  private createVariables(
    allTokenNames: Set<string>,
    tokensByName: Map<string, TokenModeData>,
    modeIdMap: Record<string, string>,
  ): FigmaVariable[] {
    const variables: FigmaVariable[] = []

    const sortedTokenNames = Array.from(allTokenNames).sort((a, b) => a.localeCompare(b))
    for (const tokenName of sortedTokenNames) {
      const tokenModes = tokensByName.get(tokenName)
      if (!tokenModes) {
        continue
      }

      const firstToken = Array.from(tokenModes.values())[0]?.token
      if (firstToken?.$type === 'shadow') {
        const shadowVars = this.decomposeShadowToken(tokenName, tokenModes, modeIdMap)
        variables.push(...shadowVars)
        continue
      }

      const variable = this.createVariable(tokenName, tokenModes, tokensByName, modeIdMap)
      if (variable) {
        variables.push(variable)
      }
    }

    return variables
  }

  /**
   * Create a single Figma variable from token data
   */
  private createVariable(
    tokenName: string,
    tokenModes: TokenModeData,
    tokensByName: Map<string, TokenModeData>,
    modeIdMap: Record<string, string>,
  ): FigmaVariable | null {
    // Get a representative token to determine type and metadata
    const firstToken = Array.from(tokenModes.values())[0]?.token
    if (!firstToken || !firstToken.$type) {
      return null
    }

    const resolvedType = this.getResolvedType(firstToken.$type)
    if (resolvedType === null) {
      return null
    }

    // Build valuesByMode
    const valuesByMode: Record<string, FigmaValue> = {}
    for (const [themeKey, { token }] of tokenModes) {
      const modeId = modeIdMap[themeKey]
      if (!modeId) {
        continue
      }

      const refName = getPureAliasReferenceName(token.originalValue)
      const refValue = this.buildAliasValue(refName, resolvedType, tokensByName, themeKey)
      if (this.preserveReferences && refValue !== null) {
        valuesByMode[modeId] = refValue
        continue
      }

      const value = this.tokenValueToFigmaValue(token.$value, resolvedType)
      if (value !== null) {
        valuesByMode[modeId] = value
      }
    }

    // Skip if no values
    if (Object.keys(valuesByMode).length === 0) {
      return null
    }

    // Build description
    const description = this.buildDescription(firstToken)

    return {
      id: this.generateId(tokenName),
      name: tokenName,
      variableCollectionId: this.collectionId,
      resolvedType,
      valuesByMode,
      description: description !== '' ? description : undefined,
      scopes: this.getScopes(firstToken.$type ?? ''),
    }
  }

  /**
   * Decompose a shadow token into individual Figma variables.
   *
   * Figma Variables API doesn't support a native shadow type, so we break
   * each shadow into its leaf properties:
   *   - color   -> COLOR
   *   - offsetX -> FLOAT
   *   - offsetY -> FLOAT
   *   - blur    -> FLOAT
   *   - spread  -> FLOAT
   *
   * Array shadows (multiple layers) get an index prefix:
   *   token.0.color, token.0.offsetX, token.1.color, ...
   */
  private decomposeShadowToken(
    tokenName: string,
    tokenModes: TokenModeData,
    modeIdMap: Record<string, string>,
  ): FigmaVariable[] {
    const firstToken = Array.from(tokenModes.values())[0]?.token
    if (!firstToken) {
      return []
    }

    const isArray = Array.isArray(firstToken.$value)
    const description = this.buildDescription(firstToken)

    if (isArray) {
      return this.decomposeShadowArray(tokenName, tokenModes, modeIdMap, description)
    }

    return this.decomposeSingleShadow(tokenName, tokenModes, modeIdMap, [], description)
  }

  private decomposeShadowArray(
    tokenName: string,
    tokenModes: TokenModeData,
    modeIdMap: Record<string, string>,
    description: string,
  ): FigmaVariable[] {
    const variables: FigmaVariable[] = []

    // Determine layer count from the first mode's token
    const firstToken = Array.from(tokenModes.values())[0]?.token
    const layerCount = Array.isArray(firstToken?.$value) ? firstToken.$value.length : 0

    for (let i = 0; i < layerCount; i++) {
      const layerVars = this.decomposeSingleShadow(
        tokenName,
        tokenModes,
        modeIdMap,
        [String(i)],
        description,
        i,
      )
      variables.push(...layerVars)
    }

    return variables
  }

  private decomposeSingleShadow(
    tokenName: string,
    tokenModes: TokenModeData,
    modeIdMap: Record<string, string>,
    pathPrefix: string[],
    description: string,
    layerIndex?: number,
  ): FigmaVariable[] {
    const leafDefs: { key: string; type: FigmaResolvedType; scope: string[] }[] = [
      { key: 'color', type: 'COLOR', scope: ['ALL_FILLS'] },
      { key: 'offsetX', type: 'FLOAT', scope: ['EFFECT_FLOAT'] },
      { key: 'offsetY', type: 'FLOAT', scope: ['EFFECT_FLOAT'] },
      { key: 'blur', type: 'FLOAT', scope: ['EFFECT_FLOAT'] },
      { key: 'spread', type: 'FLOAT', scope: ['EFFECT_FLOAT'] },
    ]

    const variables: FigmaVariable[] = []

    for (const { key, type, scope } of leafDefs) {
      const varName = [...[tokenName], ...pathPrefix, key].join('.')
      const valuesByMode: Record<string, FigmaValue> = {}

      for (const [themeKey, { token }] of tokenModes) {
        const modeId = modeIdMap[themeKey]
        if (!modeId) {
          continue
        }

        const shadowObj = this.extractShadowObject(token.$value, layerIndex)
        if (!shadowObj) {
          continue
        }

        const leafValue = (shadowObj as Record<string, unknown>)[key]
        const figmaValue = this.shadowLeafToFigmaValue(leafValue, type)
        if (figmaValue != null) {
          valuesByMode[modeId] = figmaValue
        }
      }

      if (Object.keys(valuesByMode).length === 0) {
        continue
      }

      variables.push({
        id: this.generateId(varName),
        name: varName,
        variableCollectionId: this.collectionId,
        resolvedType: type,
        valuesByMode,
        description: description !== '' ? description : undefined,
        scopes: scope,
      })
    }

    return variables
  }

  private extractShadowObject(value: unknown, layerIndex?: number): unknown {
    if (layerIndex != null && Array.isArray(value)) {
      return value[layerIndex]
    }
    return typeof value === 'object' && value !== null ? value : undefined
  }

  private shadowLeafToFigmaValue(
    leafValue: unknown,
    resolvedType: FigmaResolvedType,
  ): FigmaValue | null {
    if (resolvedType === 'COLOR') {
      if (isColorObject(leafValue)) {
        return this.parseFigmaColor(colorObjectToHex(leafValue))
      }
      if (typeof leafValue === 'string') {
        return this.parseFigmaColor(leafValue)
      }
      return null
    }

    // FLOAT -- dimension objects or raw numbers
    if (isDimensionObject(leafValue)) {
      return leafValue.value
    }
    if (typeof leafValue === 'number') {
      return leafValue
    }
    return null
  }

  /**
   * Get Figma resolved type from token type
   */
  private getResolvedType(tokenType: string): FigmaResolvedType | null {
    switch (tokenType) {
      case 'color':
        return 'COLOR'
      case 'dimension':
      case 'number':
      case 'duration':
        return 'FLOAT'
      case 'fontFamily':
      case 'fontWeight':
      case 'cubicBezier':
        return 'STRING'
      default:
        return null
    }
  }

  /**
   * Convert token value to Figma value format
   */
  private tokenValueToFigmaValue(
    value: unknown,
    resolvedType: FigmaResolvedType,
  ): FigmaValue | null {
    if (resolvedType === 'COLOR') {
      if (isColorObject(value)) {
        const hex = colorObjectToHex(value)
        return this.parseFigmaColor(hex)
      }
      return this.parseFigmaColor(String(value))
    }

    if (resolvedType === 'FLOAT') {
      if (isDimensionObject(value)) {
        return value.value
      }
      return typeof value === 'number' ? value : null
    }

    if (resolvedType === 'STRING') {
      if (Array.isArray(value)) {
        return value.join(', ')
      }
      return String(value)
    }

    return null
  }

  private buildAliasValue(
    refName: string | undefined,
    resolvedType: FigmaResolvedType,
    tokensByName: Map<string, TokenModeData>,
    themeKey: string,
  ): FigmaValue | null {
    if (!this.preserveReferences || refName === undefined) {
      return null
    }

    const referencedTokenModes = tokensByName.get(refName)
    const referencedToken = referencedTokenModes?.get(themeKey)?.token
    if (referencedToken?.$type != null) {
      const referencedResolvedType = this.getResolvedType(referencedToken.$type)
      if (referencedResolvedType !== resolvedType) {
        return null
      }
    }

    return {
      type: 'VARIABLE_ALIAS',
      id: this.generateId(refName),
    }
  }

  /**
   * Parse color string to Figma RGBA format
   */
  private parseFigmaColor(colorStr: string): { r: number; g: number; b: number; a: number } | null {
    const hex = colorStr.replace('#', '')

    if (hex.length === 6) {
      const r = Number.parseInt(hex.substring(0, 2), 16) / 255
      const g = Number.parseInt(hex.substring(2, 4), 16) / 255
      const b = Number.parseInt(hex.substring(4, 6), 16) / 255
      return { r, g, b, a: 1 }
    }

    if (hex.length === 8) {
      const r = Number.parseInt(hex.substring(0, 2), 16) / 255
      const g = Number.parseInt(hex.substring(2, 4), 16) / 255
      const b = Number.parseInt(hex.substring(4, 6), 16) / 255
      const a = Number.parseInt(hex.substring(6, 8), 16) / 255
      return { r, g, b, a }
    }

    return null
  }

  /**
   * Build Figma variable description with deprecation info
   */
  private buildDescription(token: ResolvedToken): string {
    return formatDeprecationMessage(token, token.$description ?? '', 'bracket')
  }

  /**
   * Get Figma scopes for a token type
   */
  private getScopes(tokenType: string): string[] {
    switch (tokenType) {
      case 'color':
        return ['ALL_FILLS', 'ALL_STROKES', 'FRAME_FILL', 'SHAPE_FILL', 'TEXT_FILL']
      case 'dimension':
        return [
          'WIDTH_HEIGHT',
          'GAP',
          'CORNER_RADIUS',
          'STROKE_FLOAT',
          'FONT_SIZE',
          'LINE_HEIGHT',
          'LETTER_SPACING',
        ]
      case 'number':
        return ['WIDTH_HEIGHT', 'FONT_WEIGHT']
      case 'fontFamily':
        return ['FONT_FAMILY']
      case 'fontWeight':
        return ['FONT_WEIGHT']
      default:
        return ['ALL_SCOPES']
    }
  }

  /**
   * Generate deterministic ID for Figma variables
   *
   * Uses Node.js crypto module (SHA-256) for stable, deterministic IDs across builds.
   *
   * @param name - Token name to hash
   * @returns Figma ID in format `VariableID:xxxxx` or `VariableCollectionID:xxxxx`
   */
  private generateId(name: string): string {
    // Use Node.js built-in crypto for deterministic hashing
    const hash = createHash('sha256').update(name).digest()

    // Take first 4 bytes (32 bits) and convert to unsigned integer
    const truncatedHash = hash.readUInt32BE(0)

    // Format as base36 for compact representation
    const idSuffix = truncatedHash.toString(36)

    // Return appropriate prefix based on name
    return name === 'collection' ? `VariableCollectionID:${idSuffix}` : `VariableID:${idSuffix}`
  }
}
