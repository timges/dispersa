/**
 * @fileoverview Path utilities for token path formatting
 */

/**
 * Format a token path for error messages
 * Provides consistent path formatting across the codebase
 *
 * @param parentPath - Parent path segments
 * @param name - Current segment name
 * @returns Formatted path string (e.g., "color.brand.primary")
 */
export function formatTokenPath(parentPath: string[], name?: string): string {
  if (name === undefined || name === '') {
    return parentPath.join('.')
  }
  return parentPath.length > 0 ? `${parentPath.join('.')}.${name}` : name
}

/**
 * Join path segments into a dot-notation path
 *
 * @param segments - Path segments
 * @returns Dot-notation path string
 */
export function joinPath(segments: string[]): string {
  return segments.join('.')
}
