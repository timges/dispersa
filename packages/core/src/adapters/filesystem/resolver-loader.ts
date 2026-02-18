/**
 * @fileoverview Utility for loading and parsing resolver documents
 * Eliminates duplication of resolver parsing logic across the codebase
 */

import * as path from 'node:path'

import type { ResolverDocument } from '@resolution/types'
import type { ValidationOptions } from '@shared/types/validation'

import { ResolverParser } from './resolver-parser'

export type ResolverLoaderOptions = {
  /**
   * Enable validation of the resolver document
   * @default true
   */
  /**
   * Base directory for resolving relative paths
   * @default process.cwd()
   */
  baseDir?: string
  validation?: ValidationOptions
}

/**
 * Loads and parses resolver documents from file paths or inline objects
 *
 * Centralizes the logic for handling resolver inputs that can be either:
 * - A file path string (resolved relative to baseDir)
 * - An inline ResolverDocument object (validated if enabled)
 *
 * @example
 * ```typescript
 * const loader = new ResolverLoader({  })
 *
 * // Load from file
 * const resolver1 = await loader.load('./tokens.resolver.json')
 *
 * // Load from inline object
 * const resolver2 = await loader.load({
 *   resolutionOrder: ['tokens.json']
 * })
 * ```
 */
export class ResolverLoader {
  private options: { baseDir: string; validation?: ValidationOptions }
  private parser: ResolverParser

  constructor(options: ResolverLoaderOptions = {}) {
    this.options = {
      baseDir: options.baseDir ?? process.cwd(),
      validation: options.validation,
    }
    this.parser = new ResolverParser({ validation: options.validation })
  }

  /**
   * Load and parse a resolver document
   *
   * @param resolver - Either a file path (string) or an inline ResolverDocument object
   * @returns Tuple of [parsed resolver document, base directory for file resolution]
   *
   * @example
   * ```typescript
   * const loader = new ResolverLoader()
   * const [resolverDoc, baseDir] = await loader.load('./tokens.resolver.json')
   * ```
   */
  async load(resolver: string | ResolverDocument): Promise<{
    resolverDoc: ResolverDocument
    baseDir: string
  }> {
    if (typeof resolver !== 'string') {
      const resolverDoc = this.parser.parseInline(resolver)
      return { resolverDoc, baseDir: this.options.baseDir }
    }

    const absolutePath = path.resolve(this.options.baseDir, resolver)
    const resolverDoc = await this.parser.parseFile(absolutePath)
    const baseDir = path.dirname(absolutePath)
    return { resolverDoc, baseDir }
  }

  /**
   * Load only the resolver document (without base directory)
   *
   * Convenience method for cases where only the parsed document is needed.
   *
   * @param resolver - Either a file path or an inline ResolverDocument object
   * @returns Parsed resolver document
   */
  async loadDocument(resolver: string | ResolverDocument): Promise<ResolverDocument> {
    const { resolverDoc } = await this.load(resolver)
    return resolverDoc
  }

  /**
   * Update the base directory for path resolution
   *
   * @param baseDir - New base directory
   */
  setBaseDir(baseDir: string): void {
    this.options.baseDir = baseDir
  }
}
