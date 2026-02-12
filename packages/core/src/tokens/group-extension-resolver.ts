/**
 * @fileoverview Group extension resolver for DTCG $extends support
 *
 * Implements group inheritance per DTCG specification (Section 6.4).
 * Follows JSON Schema $ref semantics for deep merging and extension resolution.
 */

import { ValidationError } from '@shared/errors/index'
import { isTokenLike } from '@shared/utils/token-utils'

import type { Token, TokenCollection, TokenGroup } from './types'

export class GroupExtensionResolver {
  /**
   * Resolve all $extends references in a token collection
   * Returns a new collection with all group extensions resolved
   */
  resolveExtensions(collection: TokenCollection): TokenCollection {
    const result: TokenCollection = {}

    // Process each top-level group/token
    for (const [key, value] of Object.entries(collection)) {
      if (this.isToken(value)) {
        // Tokens at root level don't have extensions
        result[key] = value
      } else if (this.isGroup(value)) {
        // Resolve group extensions recursively
        result[key] = this.resolveGroup(value, [key], collection, new Set())
      }
    }

    return result
  }

  /**
   * Resolve extensions for a single group
   * @param group The group to resolve
   * @param path Current path in the hierarchy (for error messages)
   * @param collection The full token collection (for resolving references)
   * @param visited Set of visited paths (for circular reference detection)
   */
  private resolveGroup(
    group: TokenGroup,
    path: string[],
    collection: TokenCollection,
    visited: Set<string>,
  ): TokenGroup {
    const groupPath = path.join('.')

    // Check for circular references
    if (visited.has(groupPath)) {
      const cycle = Array.from(visited).join(' → ') + ' → ' + groupPath
      throw new ValidationError(
        `Circular group extension detected: ${cycle}. ` +
          `Groups must not create circular inheritance chains (DTCG Section 6.4.4).`,
        [{ message: `Circular group extension detected: ${cycle}` }],
      )
    }

    // If no $extends, process children recursively
    if (group.$extends == null) {
      return this.processGroupChildren(group, path, collection, visited)
    }

    // Parse the $extends reference
    const targetPath = this.parseGroupReference(group.$extends)

    // Find the target group
    const targetGroup = this.findGroup(targetPath, collection)
    if (targetGroup == null) {
      throw new ValidationError(
        `Group extension failed at "${groupPath}": Cannot find target group "${targetPath}". ` +
          `Ensure the referenced group exists.`,
        [
          {
            message: `Group extension failed at "${groupPath}": Cannot find target group "${targetPath}".`,
          },
        ],
      )
    }

    // Check that target is actually a group, not a token
    if (this.isToken(targetGroup)) {
      throw new ValidationError(
        `Group extension failed at "${groupPath}": Target "${targetPath}" is a token, not a group. ` +
          `$extends can only reference groups (DTCG Section 6.4).`,
        [
          {
            message: `Group extension failed at "${groupPath}": Target "${targetPath}" is a token.`,
          },
        ],
      )
    }

    // Add current group to visited set for circular detection
    const newVisited = new Set(visited)
    newVisited.add(groupPath)

    // Recursively resolve the target group first
    const resolvedTarget = this.resolveGroup(
      targetGroup,
      targetPath.split('.'),
      collection,
      newVisited,
    )

    // Merge local group with resolved target
    const merged = this.mergeGroups(resolvedTarget, group)

    // Process children of merged group recursively
    return this.processGroupChildren(merged, path, collection, visited)
  }

  /**
   * Process children of a group recursively
   */
  private processGroupChildren(
    group: TokenGroup,
    path: string[],
    collection: TokenCollection,
    visited: Set<string>,
  ): TokenGroup {
    const result: TokenGroup = { ...group }

    // Process each child
    for (const [key, value] of Object.entries(group)) {
      // Skip group properties
      if (key.startsWith('$')) {
        continue
      }

      if (this.isGroup(value)) {
        // Recursively resolve child group
        result[key] = this.resolveGroup(value, [...path, key], collection, visited)
      }
      // Tokens are left as-is
    }

    return result
  }

  /**
   * Merge two groups using deep merge semantics
   * Per DTCG spec Section 6.4.3:
   * - Same path = local overrides inherited
   * - Different paths = merge (both exist)
   * - Complete token replacement (not property-by-property merge)
   */
  private mergeGroups(inherited: TokenGroup, local: TokenGroup): TokenGroup {
    // Start with a copy of inherited group
    const result: TokenGroup = { ...inherited }

    // Apply local properties and tokens
    for (const [key, value] of Object.entries(local)) {
      // $extends is processed, don't copy it to result
      if (key === '$extends') {
        continue
      }

      // Group properties: local overrides inherited
      if (key.startsWith('$')) {
        result[key] = value
        continue
      }

      // Check if this key exists in inherited
      const inheritedValue = inherited[key]

      if (inheritedValue == null) {
        // New token/group: add it
        result[key] = value
        continue
      }

      // Both tokens or type mismatch (token vs group): local overrides
      const isInheritedToken = this.isToken(inheritedValue)
      const isLocalToken = this.isToken(value)

      if (isInheritedToken || isLocalToken) {
        result[key] = value
        continue
      }

      // Both groups: deep merge recursively
      result[key] = this.mergeGroups(inheritedValue as TokenGroup, value as TokenGroup)
    }

    return result
  }

  /**
   * Parse a group reference (alias or JSON Pointer format)
   * Supports: "{group.name}" or "#/group/name"
   */
  private parseGroupReference(ref: string): string {
    // Alias format: {group.name}
    if (ref.startsWith('{') && ref.endsWith('}')) {
      return ref.slice(1, -1)
    }

    // JSON Pointer format: #/group/name
    if (ref.startsWith('#/')) {
      return ref.slice(2).replace(/\//g, '.')
    }

    // Invalid format
    throw new ValidationError(
      `Invalid group reference format: "${ref}". ` +
        `Use alias syntax "{group.name}" or JSON Pointer "#/group/name".`,
      [{ message: `Invalid group reference format: "${ref}".` }],
    )
  }

  /**
   * Find a group in the token collection by path
   */
  private findGroup(path: string, collection: TokenCollection): TokenGroup | Token | null {
    const parts = path.split('.')
    let current: unknown = collection
    for (const part of parts) {
      if (current == null || typeof current !== 'object') {
        return null as TokenGroup | Token | null
      }
      current = (current as Record<string, unknown>)[part]
    }

    return current as TokenGroup | Token | null
  }

  /**
   * Type guard: check if value is a token
   */
  private isToken(value: unknown): value is Token {
    return isTokenLike(value)
  }

  /**
   * Type guard: check if value is a group
   */
  private isGroup(value: unknown): value is TokenGroup {
    return typeof value === 'object' && value !== null && !('$value' in value) && !('$ref' in value)
  }
}
