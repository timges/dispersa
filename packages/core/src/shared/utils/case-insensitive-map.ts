/**
 * @fileoverview Case-insensitive map implementation
 */

/**
 * Map that treats keys as case-insensitive
 * Internally stores keys in lowercase but preserves original casing
 *
 * @template T Value type
 */
export class CaseInsensitiveMap<T> {
  private map: Map<string, { originalKey: string; value: T }>

  constructor(entries?: Iterable<readonly [string, T]>) {
    this.map = new Map()
    if (entries !== undefined) {
      for (const [key, value] of entries) {
        this.set(key, value)
      }
    }
  }

  /**
   * Set a value with case-insensitive key
   *
   * @param key - Key (case-insensitive)
   * @param value - Value to store
   */
  set(key: string, value: T): void {
    const lowerKey = key.toLowerCase()
    this.map.set(lowerKey, { originalKey: key, value })
  }

  /**
   * Get a value by case-insensitive key
   *
   * @param key - Key (case-insensitive)
   * @returns Value if found, undefined otherwise
   */
  get(key: string): T | undefined {
    const entry = this.map.get(key.toLowerCase())
    return entry?.value
  }

  /**
   * Check if key exists (case-insensitive)
   *
   * @param key - Key (case-insensitive)
   * @returns True if key exists
   */
  has(key: string): boolean {
    return this.map.has(key.toLowerCase())
  }

  /**
   * Get the original key casing for a key
   *
   * @param key - Key (case-insensitive)
   * @returns Original key casing, or undefined if not found
   */
  getOriginalKey(key: string): string | undefined {
    const entry = this.map.get(key.toLowerCase())
    return entry?.originalKey
  }

  /**
   * Delete a value by case-insensitive key
   *
   * @param key - Key (case-insensitive)
   * @returns True if item was deleted
   */
  delete(key: string): boolean {
    return this.map.delete(key.toLowerCase())
  }

  /**
   * Get all values
   *
   * @returns Array of all values
   */
  values(): T[] {
    return Array.from(this.map.values()).map((entry) => entry.value)
  }

  /**
   * Get all original keys
   *
   * @returns Array of all keys in their original casing
   */
  keys(): string[] {
    return Array.from(this.map.values()).map((entry) => entry.originalKey)
  }

  /**
   * Get all entries with original key casing
   *
   * @returns Array of [key, value] tuples
   */
  entries(): Array<[string, T]> {
    return Array.from(this.map.values()).map((entry) => [entry.originalKey, entry.value])
  }

  /**
   * Clear all entries
   */
  clear(): void {
    this.map.clear()
  }

  /**
   * Get number of entries
   *
   * @returns Number of entries
   */
  get size(): number {
    return this.map.size
  }
}
