/**
 * @fileoverview Unit tests for TypeWriter
 */

import { describe, expect, it, vi, beforeEach } from 'vitest'
import { TypeWriter } from '../../../../src/adapters/filesystem/type-writer'
import type { ResolvedTokens } from '../../../../src/tokens/types'
import * as fs from 'node:fs/promises'
import * as path from 'node:path'

// Mock fs module
vi.mock('node:fs/promises', () => ({
  mkdir: vi.fn(),
  writeFile: vi.fn(),
}))

// Mock TypeGenerator
vi.mock('../../../../src/codegen/type-generator', () => ({
  TypeGenerator: class {
    generate = vi.fn().mockReturnValue('export type Tokens = { color: string }')
  },
}))

describe('TypeWriter', () => {
  let writer: TypeWriter
  let mockTokens: ResolvedTokens

  beforeEach(() => {
    vi.clearAllMocks()
    writer = new TypeWriter()

    mockTokens = {
      'color.primary': {
        $value: { colorSpace: 'srgb', components: [0, 0.27, 0.55] },
        $type: 'color',
        path: ['color', 'primary'],
        name: 'color.primary',
        originalValue: '#ff0000',
      },
    }
  })

  describe('Constructor', () => {
    it('should create instance', () => {
      expect(writer).toBeInstanceOf(TypeWriter)
    })

    it('should initialize TypeGenerator', () => {
      expect(writer).toBeDefined()
    })
  })

  describe('write()', () => {
    it('should write type definitions to file', async () => {
      vi.mocked(fs.mkdir).mockResolvedValue(undefined)
      vi.mocked(fs.writeFile).mockResolvedValue(undefined)

      await writer.write(mockTokens, { fileName: '/test/types.d.ts' })

      expect(fs.mkdir).toHaveBeenCalledWith('/test', { recursive: true })
      expect(fs.writeFile).toHaveBeenCalledWith('/test/types.d.ts', expect.any(String), 'utf-8')
    })

    it('should create parent directories', async () => {
      vi.mocked(fs.mkdir).mockResolvedValue(undefined)
      vi.mocked(fs.writeFile).mockResolvedValue(undefined)

      await writer.write(mockTokens, { fileName: '/deep/nested/path/types.d.ts' })

      expect(fs.mkdir).toHaveBeenCalledWith('/deep/nested/path', { recursive: true })
    })

    it('should handle relative paths', async () => {
      vi.mocked(fs.mkdir).mockResolvedValue(undefined)
      vi.mocked(fs.writeFile).mockResolvedValue(undefined)

      await writer.write(mockTokens, { fileName: 'relative/types.d.ts' })

      const expectedPath = path.resolve(process.cwd(), 'relative/types.d.ts')
      expect(fs.writeFile).toHaveBeenCalledWith(expectedPath, expect.any(String), 'utf-8')
    })

    it('should handle absolute paths', async () => {
      vi.mocked(fs.mkdir).mockResolvedValue(undefined)
      vi.mocked(fs.writeFile).mockResolvedValue(undefined)

      await writer.write(mockTokens, { fileName: '/absolute/types.d.ts' })

      expect(fs.writeFile).toHaveBeenCalledWith('/absolute/types.d.ts', expect.any(String), 'utf-8')
    })

    it('should pass options to generator', async () => {
      vi.mocked(fs.mkdir).mockResolvedValue(undefined)
      vi.mocked(fs.writeFile).mockResolvedValue(undefined)

      const mockGenerate = vi.fn().mockReturnValue('generated code')
      ;(writer as any).generator.generate = mockGenerate

      await writer.write(mockTokens, {
        fileName: '/test/types.d.ts',
        moduleName: 'CustomTokens',
      })

      expect(mockGenerate).toHaveBeenCalledWith(mockTokens, {
        fileName: '/test/types.d.ts',
        moduleName: 'CustomTokens',
      })
    })

    it('should handle write errors', async () => {
      vi.mocked(fs.mkdir).mockResolvedValue(undefined)
      vi.mocked(fs.writeFile).mockRejectedValue(new Error('Write failed'))

      await expect(writer.write(mockTokens, { fileName: '/test/types.d.ts' })).rejects.toThrow()
    })

    it('should handle mkdir errors', async () => {
      vi.mocked(fs.mkdir).mockRejectedValue(new Error('Permission denied'))

      await expect(writer.write(mockTokens, { fileName: '/test/types.d.ts' })).rejects.toThrow()
    })

    it('should write generated content', async () => {
      vi.mocked(fs.mkdir).mockResolvedValue(undefined)
      vi.mocked(fs.writeFile).mockResolvedValue(undefined)

      const customContent = 'export type CustomType = string'
      ;(writer as any).generator.generate = vi.fn().mockReturnValue(customContent)

      await writer.write(mockTokens, { fileName: '/test/types.d.ts' })

      expect(fs.writeFile).toHaveBeenCalledWith('/test/types.d.ts', customContent, 'utf-8')
    })

    it('should handle empty token set', async () => {
      vi.mocked(fs.mkdir).mockResolvedValue(undefined)
      vi.mocked(fs.writeFile).mockResolvedValue(undefined)

      await writer.write({}, { fileName: '/test/empty.d.ts' })

      expect(fs.writeFile).toHaveBeenCalled()
    })
  })

  describe('generate()', () => {
    it('should generate types without writing', () => {
      const mockGenerate = vi.fn().mockReturnValue('generated types')
      ;(writer as any).generator.generate = mockGenerate

      const result = writer.generate(mockTokens)

      expect(result).toBe('generated types')
      expect(mockGenerate).toHaveBeenCalledWith(mockTokens, undefined)
      expect(fs.writeFile).not.toHaveBeenCalled()
    })

    it('should pass options to generator', () => {
      const mockGenerate = vi.fn().mockReturnValue('generated types')
      ;(writer as any).generator.generate = mockGenerate

      writer.generate(mockTokens, { moduleName: 'MyTokens' })

      expect(mockGenerate).toHaveBeenCalledWith(mockTokens, { moduleName: 'MyTokens' })
    })

    it('should return string', () => {
      const result = writer.generate(mockTokens)

      expect(typeof result).toBe('string')
    })

    it('should not create files', () => {
      writer.generate(mockTokens)

      expect(fs.mkdir).not.toHaveBeenCalled()
      expect(fs.writeFile).not.toHaveBeenCalled()
    })

    it('should handle empty tokens', () => {
      const result = writer.generate({})

      expect(typeof result).toBe('string')
    })

    it('should handle options object', () => {
      const result = writer.generate(mockTokens, {
        moduleName: 'Test',
      })

      expect(typeof result).toBe('string')
    })
  })

  describe('Integration Scenarios', () => {
    it('should generate and write in sequence', async () => {
      vi.mocked(fs.mkdir).mockResolvedValue(undefined)
      vi.mocked(fs.writeFile).mockResolvedValue(undefined)

      const generated = writer.generate(mockTokens)
      await writer.write(mockTokens, { fileName: '/test/types.d.ts' })

      expect(typeof generated).toBe('string')
      expect(fs.writeFile).toHaveBeenCalled()
    })

    it('should handle multiple writes to different paths', async () => {
      vi.mocked(fs.mkdir).mockResolvedValue(undefined)
      vi.mocked(fs.writeFile).mockResolvedValue(undefined)

      await writer.write(mockTokens, { fileName: '/test/types1.d.ts' })
      await writer.write(mockTokens, { fileName: '/test/types2.d.ts' })

      expect(fs.writeFile).toHaveBeenCalledTimes(2)
      expect(fs.writeFile).toHaveBeenCalledWith('/test/types1.d.ts', expect.any(String), 'utf-8')
      expect(fs.writeFile).toHaveBeenCalledWith('/test/types2.d.ts', expect.any(String), 'utf-8')
    })

    it('should maintain consistent output between generate and write', async () => {
      vi.mocked(fs.mkdir).mockResolvedValue(undefined)
      vi.mocked(fs.writeFile).mockResolvedValue(undefined)

      const customOutput = 'export type CustomTokens = { test: string }'
      ;(writer as any).generator.generate = vi.fn().mockReturnValue(customOutput)

      const generated = writer.generate(mockTokens)
      await writer.write(mockTokens, { fileName: '/test/types.d.ts' })

      expect(generated).toBe(customOutput)
      expect(fs.writeFile).toHaveBeenCalledWith('/test/types.d.ts', customOutput, 'utf-8')
    })
  })
})
