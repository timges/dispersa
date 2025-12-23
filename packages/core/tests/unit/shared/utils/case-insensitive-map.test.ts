import { describe, expect, it } from 'vitest'
import { CaseInsensitiveMap } from '../../../../src/shared/utils/case-insensitive-map'

describe('CaseInsensitiveMap', () => {
  describe('constructor', () => {
    it('should create empty map', () => {
      const map = new CaseInsensitiveMap<string>()
      expect(map.size).toBe(0)
    })

    it('should initialize with entries', () => {
      const map = new CaseInsensitiveMap<string>([
        ['key1', 'value1'],
        ['key2', 'value2'],
      ])
      expect(map.size).toBe(2)
      expect(map.get('key1')).toBe('value1')
      expect(map.get('key2')).toBe('value2')
    })

    it('should handle duplicate keys case-insensitively', () => {
      const map = new CaseInsensitiveMap<string>([
        ['key', 'value1'],
        ['KEY', 'value2'],
      ])
      expect(map.size).toBe(1)
      expect(map.get('key')).toBe('value2') // Last value wins
    })
  })

  describe('set and get', () => {
    it('should set and get value', () => {
      const map = new CaseInsensitiveMap<string>()
      map.set('key', 'value')
      expect(map.get('key')).toBe('value')
    })

    it('should be case-insensitive on get', () => {
      const map = new CaseInsensitiveMap<string>()
      map.set('Key', 'value')
      expect(map.get('key')).toBe('value')
      expect(map.get('KEY')).toBe('value')
      expect(map.get('Key')).toBe('value')
    })

    it('should overwrite value with different casing', () => {
      const map = new CaseInsensitiveMap<string>()
      map.set('key', 'value1')
      map.set('KEY', 'value2')
      expect(map.get('key')).toBe('value2')
      expect(map.size).toBe(1)
    })

    it('should return undefined for non-existent key', () => {
      const map = new CaseInsensitiveMap<string>()
      expect(map.get('nonexistent')).toBeUndefined()
    })
  })

  describe('has', () => {
    it('should return true for existing key', () => {
      const map = new CaseInsensitiveMap<string>()
      map.set('key', 'value')
      expect(map.has('key')).toBe(true)
    })

    it('should be case-insensitive', () => {
      const map = new CaseInsensitiveMap<string>()
      map.set('Key', 'value')
      expect(map.has('key')).toBe(true)
      expect(map.has('KEY')).toBe(true)
      expect(map.has('Key')).toBe(true)
    })

    it('should return false for non-existent key', () => {
      const map = new CaseInsensitiveMap<string>()
      expect(map.has('key')).toBe(false)
    })
  })

  describe('getOriginalKey', () => {
    it('should return original key casing', () => {
      const map = new CaseInsensitiveMap<string>()
      map.set('MyKey', 'value')
      expect(map.getOriginalKey('mykey')).toBe('MyKey')
      expect(map.getOriginalKey('MYKEY')).toBe('MyKey')
    })

    it('should return undefined for non-existent key', () => {
      const map = new CaseInsensitiveMap<string>()
      expect(map.getOriginalKey('key')).toBeUndefined()
    })

    it('should return latest original key when overwritten', () => {
      const map = new CaseInsensitiveMap<string>()
      map.set('MyKey', 'value1')
      map.set('MYKEY', 'value2')
      expect(map.getOriginalKey('mykey')).toBe('MYKEY')
    })
  })

  describe('delete', () => {
    it('should delete entry', () => {
      const map = new CaseInsensitiveMap<string>()
      map.set('key', 'value')
      const deleted = map.delete('key')
      expect(deleted).toBe(true)
      expect(map.has('key')).toBe(false)
      expect(map.size).toBe(0)
    })

    it('should be case-insensitive', () => {
      const map = new CaseInsensitiveMap<string>()
      map.set('MyKey', 'value')
      const deleted = map.delete('mykey')
      expect(deleted).toBe(true)
      expect(map.has('MyKey')).toBe(false)
    })

    it('should return false for non-existent key', () => {
      const map = new CaseInsensitiveMap<string>()
      const deleted = map.delete('key')
      expect(deleted).toBe(false)
    })
  })

  describe('values', () => {
    it('should return all values', () => {
      const map = new CaseInsensitiveMap<string>()
      map.set('key1', 'value1')
      map.set('key2', 'value2')
      const values = map.values()
      expect(values).toHaveLength(2)
      expect(values).toContain('value1')
      expect(values).toContain('value2')
    })

    it('should return empty array for empty map', () => {
      const map = new CaseInsensitiveMap<string>()
      expect(map.values()).toEqual([])
    })
  })

  describe('keys', () => {
    it('should return original key casings', () => {
      const map = new CaseInsensitiveMap<string>()
      map.set('MyKey1', 'value1')
      map.set('MyKey2', 'value2')
      const keys = map.keys()
      expect(keys).toHaveLength(2)
      expect(keys).toContain('MyKey1')
      expect(keys).toContain('MyKey2')
    })

    it('should return empty array for empty map', () => {
      const map = new CaseInsensitiveMap<string>()
      expect(map.keys()).toEqual([])
    })
  })

  describe('entries', () => {
    it('should return all entries with original keys', () => {
      const map = new CaseInsensitiveMap<string>()
      map.set('MyKey1', 'value1')
      map.set('MyKey2', 'value2')
      const entries = map.entries()
      expect(entries).toHaveLength(2)
      expect(entries).toContainEqual(['MyKey1', 'value1'])
      expect(entries).toContainEqual(['MyKey2', 'value2'])
    })

    it('should return empty array for empty map', () => {
      const map = new CaseInsensitiveMap<string>()
      expect(map.entries()).toEqual([])
    })
  })

  describe('clear', () => {
    it('should clear all entries', () => {
      const map = new CaseInsensitiveMap<string>()
      map.set('key1', 'value1')
      map.set('key2', 'value2')
      map.clear()
      expect(map.size).toBe(0)
      expect(map.has('key1')).toBe(false)
      expect(map.has('key2')).toBe(false)
    })

    it('should work on empty map', () => {
      const map = new CaseInsensitiveMap<string>()
      expect(() => map.clear()).not.toThrow()
      expect(map.size).toBe(0)
    })
  })

  describe('size', () => {
    it('should return 0 for empty map', () => {
      const map = new CaseInsensitiveMap<string>()
      expect(map.size).toBe(0)
    })

    it('should return correct size', () => {
      const map = new CaseInsensitiveMap<string>()
      map.set('key1', 'value1')
      expect(map.size).toBe(1)
      map.set('key2', 'value2')
      expect(map.size).toBe(2)
    })

    it('should not increment size for duplicate keys', () => {
      const map = new CaseInsensitiveMap<string>()
      map.set('key', 'value1')
      map.set('KEY', 'value2')
      expect(map.size).toBe(1)
    })

    it('should decrement size on delete', () => {
      const map = new CaseInsensitiveMap<string>()
      map.set('key1', 'value1')
      map.set('key2', 'value2')
      map.delete('key1')
      expect(map.size).toBe(1)
    })
  })

  describe('generic types', () => {
    it('should work with number values', () => {
      const map = new CaseInsensitiveMap<number>()
      map.set('key', 42)
      expect(map.get('KEY')).toBe(42)
    })

    it('should work with object values', () => {
      const map = new CaseInsensitiveMap<{ id: number }>()
      const obj = { id: 1 }
      map.set('key', obj)
      expect(map.get('KEY')).toBe(obj)
    })

    it('should work with array values', () => {
      const map = new CaseInsensitiveMap<string[]>()
      const arr = ['a', 'b', 'c']
      map.set('key', arr)
      expect(map.get('KEY')).toBe(arr)
    })
  })
})
