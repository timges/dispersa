/**
 * @license MIT
 * Copyright (c) 2025-present Dispersa
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

/**
 * @fileoverview Plugin loader for lint plugins
 *
 * Supports loading plugins from:
 * - Inline plugin objects
 * - String module paths (package names or file paths)
 */

import { createRequire } from 'node:module'
import { isAbsolute, resolve } from 'node:path'
import process from 'node:process'

import { ConfigurationError } from '@shared/errors'
import { createJiti } from 'jiti'

import type { LintPlugin } from './types'

export type PluginLoaderOptions = {
  /**
   * Base directory for resolving relative plugin paths
   * @default process.cwd()
   */
  cwd?: string
}

/**
 * Loads lint plugins from various sources
 *
 * Handles:
 * - Inline `LintPlugin` objects (returned as-is)
 * - Package names (e.g., '@dispersa/lint-plugin-a11y')
 * - Relative file paths (e.g., './plugins/my-plugin.ts')
 * - Absolute file paths
 *
 * @security **Warning**: Loading plugins from external packages or file paths
 * executes arbitrary code. Only load plugins from trusted sources.
 * For programmatic usage, prefer passing plugin objects directly rather than
 * strings that trigger dynamic imports.
 *
 * @example
 * ```typescript
 * const loader = new PluginLoader({ cwd: process.cwd() })
 *
 * // Load from inline object
 * const plugin1 = await loader.load(myPlugin)
 *
 * // Load from package
 * const plugin2 = await loader.load('@dispersa/lint-plugin-a11y')
 *
 * // Load from file
 * const plugin3 = await loader.load('./plugins/custom.ts')
 * ```
 */
export class PluginLoader {
  private cwd: string
  private jiti: ReturnType<typeof createJiti> | null = null
  private cache: Map<string, LintPlugin> = new Map()

  constructor(options: PluginLoaderOptions = {}) {
    this.cwd = options.cwd ?? process.cwd()
  }

  /**
   * Load a plugin from an inline object or module path
   *
   * @param source - Plugin object or module path string
   * @returns Loaded plugin
   * @throws {ConfigurationError} If plugin cannot be loaded or is invalid
   */
  async load(source: LintPlugin | string): Promise<LintPlugin> {
    // Inline plugin object - return as-is
    if (this.isPluginObject(source)) {
      this.validatePlugin(source)
      return source
    }

    // String path - load module
    const modulePath = source as string
    const cached = this.cache.get(modulePath)
    if (cached) {
      return cached
    }

    const plugin = await this.loadFromModule(modulePath)
    this.validatePlugin(plugin)
    this.cache.set(modulePath, plugin)
    return plugin
  }

  /**
   * Load multiple plugins
   *
   * @param plugins - Record of namespace to plugin source
   * @returns Record of namespace to loaded plugin
   */
  async loadAll(plugins: Record<string, LintPlugin | string>): Promise<Record<string, LintPlugin>> {
    const entries = Object.entries(plugins)
    const loaded = await Promise.all(
      entries.map(async ([namespace, source]) => [namespace, await this.load(source)] as const),
    )
    return Object.fromEntries(loaded)
  }

  /**
   * Check if source is an inline plugin object
   */
  private isPluginObject(source: LintPlugin | string): source is LintPlugin {
    return typeof source !== 'string'
  }

  /**
   * Load a plugin from a module path
   */
  private async loadFromModule(modulePath: string): Promise<LintPlugin> {
    // Resolve relative paths from cwd
    const resolvedPath = isAbsolute(modulePath) ? modulePath : resolve(this.cwd, modulePath)

    // Check if it's a file path or package name
    const isFilePath =
      modulePath.startsWith('./') || modulePath.startsWith('../') || isAbsolute(modulePath)

    try {
      if (isFilePath) {
        return await this.loadFromFile(resolvedPath)
      }
      return await this.loadFromPackage(modulePath)
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      throw new ConfigurationError(`Failed to load lint plugin '${modulePath}': ${message}`)
    }
  }

  /**
   * Load a plugin from a file path using jiti (supports TypeScript)
   */
  private async loadFromFile(filePath: string): Promise<LintPlugin> {
    this.jiti ??= createJiti(this.cwd, {
      interopDefault: true,
    })

    const loaded = await this.jiti(filePath)
    const plugin = this.extractPlugin(loaded)

    if (!plugin) {
      throw new ConfigurationError(`Plugin file '${filePath}' does not export a valid LintPlugin`)
    }

    return plugin
  }

  /**
   * Load a plugin from a package name
   */
  private async loadFromPackage(packageName: string): Promise<LintPlugin> {
    // Try to require the package
    const require = createRequire(this.cwd)

    let resolvedPath: string
    try {
      resolvedPath = require.resolve(packageName, { paths: [this.cwd] })
    } catch {
      // Fallback: try from this module's location
      try {
        resolvedPath = require.resolve(packageName)
      } catch {
        throw new ConfigurationError(
          `Cannot find package '${packageName}'. Make sure it is installed.`,
        )
      }
    }

    // Use jiti to support ESM/CJS interoperability
    this.jiti ??= createJiti(this.cwd, {
      interopDefault: true,
    })

    const loaded = await this.jiti(resolvedPath)
    const plugin = this.extractPlugin(loaded)

    if (!plugin) {
      throw new ConfigurationError(`Package '${packageName}' does not export a valid LintPlugin`)
    }

    return plugin
  }

  /**
   * Extract plugin from loaded module
   *
   * Supports multiple export patterns:
   * - export default plugin
   * - export const plugin = {...}
   * - module.exports = plugin (CJS)
   */
  private extractPlugin(loaded: unknown): LintPlugin | null {
    if (!loaded || typeof loaded !== 'object') {
      return null
    }

    const module = loaded as Record<string, unknown>

    // Priority 1: default export
    if (module.default && this.isValidPluginStructure(module.default)) {
      return module.default as LintPlugin
    }

    // Priority 2: named export 'plugin'
    if (module.plugin && this.isValidPluginStructure(module.plugin)) {
      return module.plugin as LintPlugin
    }

    // Priority 3: module is the plugin itself (CJS module.exports = plugin)
    if (this.isValidPluginStructure(loaded)) {
      return loaded as LintPlugin
    }

    return null
  }

  /**
   * Check if object has required plugin structure
   */
  private isValidPluginStructure(obj: unknown): boolean {
    if (!obj || typeof obj !== 'object') {
      return false
    }

    const plugin = obj as Record<string, unknown>
    const rules = plugin.rules as Record<string, unknown> | undefined

    if (
      plugin.meta === undefined ||
      typeof plugin.meta !== 'object' ||
      !(plugin.meta as Record<string, unknown>).name ||
      rules === undefined ||
      Object.keys(rules).length === 0
    ) {
      return false
    }

    return true
  }

  /**
   * Validate a loaded plugin
   */
  private validatePlugin(plugin: LintPlugin): void {
    if (!plugin.meta) {
      throw new ConfigurationError('Lint plugin must have a meta property with name')
    }

    if (!plugin.meta.name) {
      throw new ConfigurationError('Lint plugin meta.name is required')
    }

    if (
      !plugin.rules ||
      typeof plugin.rules !== 'object' ||
      Object.keys(plugin.rules).length === 0
    ) {
      throw new ConfigurationError(
        `Lint plugin '${plugin.meta.name}' must have a non-empty rules object`,
      )
    }

    // Validate each rule
    for (const [ruleName, rule] of Object.entries(plugin.rules)) {
      if (!rule.meta) {
        throw new ConfigurationError(
          `Rule '${ruleName}' in plugin '${plugin.meta.name}' is missing meta property`,
        )
      }
      if (!rule.meta.messages || typeof rule.meta.messages !== 'object') {
        throw new ConfigurationError(
          `Rule '${ruleName}' in plugin '${plugin.meta.name}' is missing meta.messages`,
        )
      }
      if (typeof rule.create !== 'function') {
        throw new ConfigurationError(
          `Rule '${ruleName}' in plugin '${plugin.meta.name}' is missing create function`,
        )
      }
    }
  }

  /**
   * Clear the plugin cache
   */
  clearCache(): void {
    this.cache.clear()
  }
}
