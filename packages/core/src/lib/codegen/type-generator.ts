/**
 * @fileoverview TypeScript type definition generator for design tokens
 *
 * Generates comprehensive TypeScript type definitions from resolved tokens
 * including token name unions, value types, and nested structure types.
 */

import type { ResolvedTokens, ResolvedToken, TokenType } from '@lib/tokens/types'

/**
 * Options for TypeScript type generation
 */
export type TypeGeneratorOptions = {
  /** Export style: 'type' alias or 'interface' (default: 'type') */
  exportType?: 'type' | 'interface'

  /** Include token value types (default: false) */
  includeValues?: boolean

  /** Name for the main module type (default: 'Tokens') */
  moduleName?: string
}

/**
 * Generates TypeScript type definitions from design tokens
 *
 * Creates type-safe TypeScript definitions including:
 * - Token name string literal unions for autocomplete
 * - Value types mapped to token values
 * - Nested structure types matching token hierarchy
 *
 * @example
 * ```typescript
 * const generator = new TypeGenerator()
 * const types = generator.generate(tokens, {
 *   exportType: 'type',
 *   includeValues: true,
 *   moduleName: 'DesignTokens'
 * })
 *
 * // Output:
 * // export type TokenName = 'color.primary' | 'color.secondary' | ...
 * // export type DesignTokens = { color: { primary: string, ... } }
 * ```
 */
export class TypeGenerator {
  /**
   * Generates complete TypeScript type definitions from resolved tokens
   *
   * @param tokens - Resolved tokens to generate types from
   * @param options - Generation options
   * @returns TypeScript type definition string
   *
   * @example
   * ```typescript
   * const types = generator.generate(tokens, {
   *   moduleName: 'Tokens',
   *   includeValues: true
   * })
   * ```
   */
  generate(tokens: ResolvedTokens, options?: TypeGeneratorOptions): string {
    const opts = {
      exportType: 'type',
      includeValues: false,
      moduleName: 'Tokens',
      ...options,
    } as const

    const lines: string[] = []

    // Generate token names type
    lines.push(...this.generateTokenNamesType(tokens, 'TokenName'))
    lines.push('')

    // Generate token values type
    if (opts.includeValues) {
      lines.push(...this.generateTokenValuesType(tokens, `${opts.moduleName}Values`))
      lines.push('')
    }

    // Generate nested structure type
    lines.push(...this.generateStructureType(tokens, opts))

    return lines.join('\n')
  }

  /**
   * Generates a string literal union type of all token names
   *
   * Useful for creating type-safe token name variables.
   *
   * @param tokens - Resolved tokens
   * @param typeName - Name for the exported type (default: 'TokenName')
   * @returns Array of type definition lines
   *
   * @example
   * ```typescript
   * // Output:
   * // export type TokenName =
   * //   | "color.primary"
   * //   | "color.secondary"
   * ```
   */
  generateTokenNamesType(tokens: ResolvedTokens, typeName = 'TokenName'): string[] {
    const names = Object.keys(tokens)
    const lines: string[] = []

    if (names.length === 0) {
      lines.push(`export type ${typeName} = never`)
    } else {
      lines.push(`export type ${typeName} =`)
      for (let i = 0; i < names.length; i++) {
        const name = names[i]
        if (name == null) {
          continue
        }
        lines.push(`  | "${name}"`)
      }
    }

    return lines
  }

  /**
   * Generate token values type
   */
  generateTokenValuesType(tokens: ResolvedTokens, typeName = 'TokenValues'): string[] {
    const lines: string[] = []

    lines.push(`export type ${typeName} = {`)

    for (const [name, token] of Object.entries(tokens)) {
      if (token.$description) {
        lines.push(`  /** ${token.$description} */`)
      }

      const valueType = this.inferValueType(token)
      lines.push(`  "${name}": ${valueType}`)
    }

    lines.push('}')

    return lines
  }

  /**
   * Generate nested structure type
   */
  private generateStructureType(
    tokens: ResolvedTokens,
    options: Required<TypeGeneratorOptions>,
  ): string[] {
    const lines: string[] = []
    const structure = this.buildNestedStructure(tokens)

    if (options.exportType === 'type') {
      lines.push(`export type ${options.moduleName} = {`)
      this.addStructureProperties(lines, structure, 1)
      lines.push('}')
    } else {
      lines.push(`export interface ${options.moduleName} {`)
      this.addStructureProperties(lines, structure, 1)
      lines.push('}')
    }

    return lines
  }

  /**
   * Build nested structure from flat tokens
   */
  private buildNestedStructure(tokens: ResolvedTokens): Record<string, unknown> {
    const result: Record<string, unknown> = {}

    for (const token of Object.values(tokens)) {
      const parts = token.path
      if (!parts || parts.length === 0) {
        continue
      }

      let current = result

      for (let i = 0; i < parts.length - 1; i++) {
        const part = parts[i]
        if (part == null) {
          continue
        }
        if (!(part in current)) {
          current[part] = {}
        }
        current = current[part] as Record<string, unknown>
      }

      const lastPart = parts[parts.length - 1]
      if (lastPart != null) {
        current[lastPart] = token
      }
    }

    return result
  }

  /**
   * Add structure properties to lines
   */
  private addStructureProperties(
    lines: string[],
    structure: Record<string, unknown>,
    indent: number,
  ): void {
    const indentStr = '  '.repeat(indent)

    for (const [key, value] of Object.entries(structure)) {
      if (this.isToken(value)) {
        const token = value
        if (token.$description) {
          lines.push(`${indentStr}/** ${token.$description} */`)
        }

        const valueType = this.inferValueType(token)
        lines.push(`${indentStr}${this.quoteKey(key)}: ${valueType}`)
      } else {
        lines.push(`${indentStr}${this.quoteKey(key)}: {`)
        this.addStructureProperties(lines, value as Record<string, unknown>, indent + 1)
        lines.push(`${indentStr}}`)
      }
    }
  }

  /**
   * Infer TypeScript type from token
   */
  private inferValueType(token: ResolvedToken): string {
    const value = token.$value

    // Use token type if available
    if (token.$type) {
      return this.tokenTypeToTsType(token.$type)
    }

    // Infer from value
    if (typeof value === 'string') {
      return 'string'
    }
    if (typeof value === 'number') {
      return 'number'
    }
    if (typeof value === 'boolean') {
      return 'boolean'
    }

    if (Array.isArray(value)) {
      if (value.length === 0) {
        return 'unknown[]'
      }
      const itemType = typeof value[0]
      return `${itemType}[]`
    }

    if (typeof value === 'object' && value !== null) {
      return 'Record<string, unknown>'
    }

    return 'unknown'
  }

  /**
   * Map a DTCG token type to its TypeScript type representation.
   *
   * Covers the standard DTCG types (color, dimension, shadow, etc.).
   * Falls back to `string` for unrecognised types.
   */
  private tokenTypeToTsType(tokenType: TokenType): string {
    switch (tokenType) {
      case 'color':
      case 'dimension':
      case 'fontFamily':
      case 'duration':
        return 'string'
      case 'fontWeight':
        return 'string | number'
      case 'number':
        return 'number'
      case 'cubicBezier':
        return '[number, number, number, number]'
      case 'shadow':
        return '{ color: string; offsetX: string; offsetY: string; blur: string; spread: string; inset?: boolean } | Array<{ color: string; offsetX: string; offsetY: string; blur: string; spread: string; inset?: boolean }>'
      default:
        return 'string'
    }
  }

  /**
   * Quote key if necessary
   */
  private quoteKey(key: string): string {
    if (/^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(key)) {
      return key
    }
    return `"${key}"`
  }

  /**
   * Check if value is a token
   */
  private isToken(value: unknown): value is ResolvedToken {
    return (
      typeof value === 'object' &&
      value !== null &&
      '$value' in value &&
      'path' in value &&
      'name' in value
    )
  }
}
