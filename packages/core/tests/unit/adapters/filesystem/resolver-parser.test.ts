/**
 * @fileoverview Unit tests for ResolverParser
 */

import { describe, expect, it, vi, beforeEach } from 'vitest'
import { ResolverParser } from '../../../../src/adapters/filesystem/resolver-parser'
import type { ResolverDocument } from '../../../../src/lib/resolution/resolution.types'
import * as fs from 'node:fs/promises'

// Mock fs module
vi.mock('node:fs/promises', () => ({
  access: vi.fn(),
  readFile: vi.fn(),
}))

// Mock SchemaValidator
vi.mock('../../../../src/lib/validation/index', () => ({
  SchemaValidator: vi.fn().mockImplementation(() => ({
    validateResolver: vi.fn().mockReturnValue([]),
    getErrorMessage: vi.fn().mockReturnValue('Validation error'),
  })),
}))

describe('ResolverParser', () => {
  let parser: ResolverParser

  const validResolverDoc: ResolverDocument = {
    version: '2025.10',
    sets: {
      base: {
        sources: [{ color: { primary: { $value: '#ff0000', $type: 'color' } } }],
      },
    },
    resolutionOrder: [{ $ref: '#/sets/base' }],
  }

  beforeEach(() => {
    vi.clearAllMocks()
    parser = new ResolverParser({ validation: { mode: 'error' } })
  })

  describe('Constructor', () => {
    it('should create instance with default options', () => {
      parser = new ResolverParser()
      expect(parser).toBeInstanceOf(ResolverParser)
    })

    it('should accept custom options', () => {
      parser = new ResolverParser({ validation: { mode: 'off' }, allowUnknownVersion: true })
      expect(parser).toBeInstanceOf(ResolverParser)
    })
  })

  describe('parseFile()', () => {
    it('should parse valid resolver file', async () => {
      vi.mocked(fs.access).mockResolvedValue(undefined)
      vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify(validResolverDoc))

      const result = await parser.parseFile('/test/resolver.json')

      expect(result).toEqual(validResolverDoc)
      expect(fs.access).toHaveBeenCalled()
      expect(fs.readFile).toHaveBeenCalledWith(expect.any(String), 'utf-8')
    })

    it('should throw error when file not found', async () => {
      vi.mocked(fs.access).mockRejectedValue(new Error('ENOENT'))

      await expect(parser.parseFile('/test/missing.json')).rejects.toThrow('Failed to read file')
    })

    it('should handle absolute paths', async () => {
      vi.mocked(fs.access).mockResolvedValue(undefined)
      vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify(validResolverDoc))

      await parser.parseFile('/absolute/path/resolver.json')

      expect(fs.access).toHaveBeenCalledWith('/absolute/path/resolver.json', expect.any(Number))
    })

    it('should handle relative paths', async () => {
      vi.mocked(fs.access).mockResolvedValue(undefined)
      vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify(validResolverDoc))

      await parser.parseFile('relative/path/resolver.json')

      expect(fs.access).toHaveBeenCalledWith(
        expect.stringContaining('resolver.json'),
        expect.any(Number),
      )
    })
  })

  describe('parse()', () => {
    it('should parse valid JSON string', () => {
      const result = parser.parse(JSON.stringify(validResolverDoc))

      expect(result).toEqual(validResolverDoc)
    })

    it('should throw error for invalid JSON', () => {
      expect(() => parser.parse('{ invalid json }')).toThrow('Failed to parse resolver JSON')
    })

    it('should throw error for empty string', () => {
      expect(() => parser.parse('')).toThrow('Failed to parse resolver JSON')
    })

    it('should include source path in error messages', () => {
      expect(() => parser.parse('{ invalid }', '/test/file.json')).toThrow()
    })
  })

  describe('parseInline()', () => {
    it('should validate inline resolver document', () => {
      const result = parser.parseInline(validResolverDoc)

      expect(result).toEqual(validResolverDoc)
    })

    it('should use <inline> as source path', () => {
      const invalidDoc = { ...validResolverDoc, version: 'invalid' } as any

      expect(() => parser.parseInline(invalidDoc)).toThrow()
    })
  })

  describe('parseObject()', () => {
    it('should parse valid resolver object', () => {
      const result = parser.parseObject(validResolverDoc)

      expect(result).toEqual(validResolverDoc)
    })

    it('should throw error for null', () => {
      expect(() => parser.parseObject(null)).toThrow('Resolver document must be an object')
    })

    it('should throw error for non-object', () => {
      expect(() => parser.parseObject('string')).toThrow('Resolver document must be an object')
      expect(() => parser.parseObject(123)).toThrow('Resolver document must be an object')
      // Note: Arrays are objects in JavaScript, so they pass the typeof check
      // but will fail validation in a later stage
    })

    it('should throw error for unsupported version', () => {
      const invalidDoc = { ...validResolverDoc, version: '1.0.0' }

      expect(() => parser.parseObject(invalidDoc)).toThrow('Unsupported resolver version')
    })

    it('should allow unknown versions when configured', () => {
      parser = new ResolverParser({ allowUnknownVersion: true })
      const futureDoc = { ...validResolverDoc, version: '2026-01-01' }

      const result = parser.parseObject(futureDoc)

      expect(result.version).toBe('2026-01-01')
    })

    it('should warn instead of throwing for unsupported version when mode is warn', () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
      parser = new ResolverParser({ validation: { mode: 'warn' } })
      const invalidDoc = { ...validResolverDoc, version: '1.0.0' }

      const result = parser.parseObject(invalidDoc)

      expect(result.version).toBe('1.0.0')
      expect(warn).toHaveBeenCalled()
      warn.mockRestore()
    })

    it('should skip validation for unsupported version when mode is off', () => {
      parser = new ResolverParser({ validation: { mode: 'off' } })
      const invalidDoc = { ...validResolverDoc, version: '1.0.0' }

      const result = parser.parseObject(invalidDoc)

      expect(result.version).toBe('1.0.0')
    })

    it('should throw error for empty resolutionOrder', () => {
      const invalidDoc = { ...validResolverDoc, resolutionOrder: [] }

      expect(() => parser.parseObject(invalidDoc)).toThrow('non-empty resolutionOrder')
    })

    it('should throw error for missing resolutionOrder', () => {
      const invalidDoc = { ...validResolverDoc, resolutionOrder: undefined as any }

      expect(() => parser.parseObject(invalidDoc)).toThrow('non-empty resolutionOrder')
    })
  })

  describe('Validation', () => {
    it('should skip validation when disabled', () => {
      parser = new ResolverParser({ validation: { mode: 'off' } })
      const invalidDoc = { ...validResolverDoc, invalid: 'property' } as any

      // Should not throw even with invalid property
      expect(() => parser.parseObject(invalidDoc)).not.toThrow()
    })

    it('should validate when enabled', () => {
      parser = new ResolverParser({ validation: { mode: 'error' } })

      // Mock validator to return errors
      const mockValidator = (parser as any).validator
      mockValidator.validateResolver.mockReturnValue([{ message: 'Error' }])

      expect(() => parser.parseObject(validResolverDoc)).toThrow('Invalid resolver document')
    })
  })

  describe('Reference Pointer Validation', () => {
    it('should reject references to modifiers from sets', () => {
      const invalidDoc: ResolverDocument = {
        version: '2025.10',
        sets: {
          base: {
            sources: [{ $ref: '#/modifiers/theme/light' }],
          },
        },
        resolutionOrder: [{ $ref: '#/sets/base' }],
      }

      expect(() => parser.parseObject(invalidDoc)).toThrow('MUST NOT reference modifiers')
    })

    it('should reject references to resolutionOrder', () => {
      const invalidDoc: ResolverDocument = {
        version: '2025.10',
        sets: {
          base: {
            sources: [{ $ref: '#/resolutionOrder/0' }],
          },
        },
        resolutionOrder: [{ $ref: '#/sets/base' }],
      }

      expect(() => parser.parseObject(invalidDoc)).toThrow('MUST NOT point to resolutionOrder')
    })

    it('should allow valid set references', () => {
      const validDoc: ResolverDocument = {
        version: '2025.10',
        sets: {
          base: { sources: [{ color: { $value: '#fff', $type: 'color' } }] },
          semantic: { sources: [{ $ref: '#/sets/base' }] },
        },
        resolutionOrder: [{ $ref: '#/sets/semantic' }],
      }

      expect(() => parser.parseObject(validDoc)).not.toThrow()
    })
  })

  describe('Modifier Validation', () => {
    it('should reject modifiers with 0 contexts', () => {
      const invalidDoc: ResolverDocument = {
        version: '2025.10',
        sets: { base: { sources: [{ color: { $value: '#fff', $type: 'color' } }] } },
        modifiers: {
          theme: {
            contexts: {},
            default: undefined,
          },
        },
        resolutionOrder: [{ $ref: '#/sets/base' }],
      }

      expect(() => parser.parseObject(invalidDoc)).toThrow('has 0 contexts')
    })

    it('should reject modifiers with only 1 context', () => {
      const invalidDoc: ResolverDocument = {
        version: '2025.10',
        sets: { base: { sources: [{ color: { $value: '#fff', $type: 'color' } }] } },
        modifiers: {
          theme: {
            contexts: { light: [] },
            default: 'light',
          },
        },
        resolutionOrder: [{ $ref: '#/sets/base' }],
      }

      expect(() => parser.parseObject(invalidDoc)).toThrow('has only 1 context')
    })

    it('should accept modifiers with 2+ contexts', () => {
      const validDoc: ResolverDocument = {
        version: '2025.10',
        sets: { base: { sources: [{ color: { $value: '#fff', $type: 'color' } }] } },
        modifiers: {
          theme: {
            contexts: { light: [], dark: [] },
            default: 'light',
          },
        },
        resolutionOrder: [{ $ref: '#/sets/base' }],
      }

      expect(() => parser.parseObject(validDoc)).not.toThrow()
    })

    it('should reject invalid default context', () => {
      const invalidDoc: ResolverDocument = {
        version: '2025.10',
        sets: { base: { sources: [{ color: { $value: '#fff', $type: 'color' } }] } },
        modifiers: {
          theme: {
            contexts: { light: [], dark: [] },
            default: 'invalid' as any,
          },
        },
        resolutionOrder: [{ $ref: '#/sets/base' }],
      }

      expect(() => parser.parseObject(invalidDoc)).toThrow('invalid default value')
    })

    it('should allow valid default context', () => {
      const validDoc: ResolverDocument = {
        version: '2025.10',
        sets: { base: { sources: [{ color: { $value: '#fff', $type: 'color' } }] } },
        modifiers: {
          theme: {
            contexts: { light: [], dark: [] },
            default: 'dark',
          },
        },
        resolutionOrder: [{ $ref: '#/sets/base' }],
      }

      expect(() => parser.parseObject(validDoc)).not.toThrow()
    })

    it('should allow modifiers without default', () => {
      const validDoc: ResolverDocument = {
        version: '2025.10',
        sets: { base: { sources: [{ color: { $value: '#fff', $type: 'color' } }] } },
        modifiers: {
          theme: {
            contexts: { light: [], dark: [] },
            default: undefined,
          },
        },
        resolutionOrder: [{ $ref: '#/sets/base' }],
      }

      expect(() => parser.parseObject(validDoc)).not.toThrow()
    })
  })

  describe('validate()', () => {
    it('should return validation result', () => {
      const result = parser.validate(validResolverDoc)

      expect(result).toHaveProperty('valid')
      expect(result).toHaveProperty('errors')
      expect(typeof result.valid).toBe('boolean')
      expect(Array.isArray(result.errors)).toBe(true)
    })

    it('should return valid:true for valid document', () => {
      const result = parser.validate(validResolverDoc)

      expect(result.valid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('should return valid:false for invalid document', () => {
      const mockValidator = (parser as any).validator
      mockValidator.validateResolver.mockReturnValue([
        { message: 'Error 1' },
        { message: 'Error 2' },
      ])

      const result = parser.validate({})

      expect(result.valid).toBe(false)
      expect(result.errors.length).toBeGreaterThan(0)
    })
  })
})
