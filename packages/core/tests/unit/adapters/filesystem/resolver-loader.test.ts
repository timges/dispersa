/**
 * @fileoverview Unit tests for ResolverLoader
 */

import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ResolverLoader } from '../../../../src/adapters/filesystem/resolver-loader'
import type { ResolverDocument } from '../../../../src/resolution/types'

const mockParserInstance = {
  parseFile: vi.fn(),
  parseInline: vi.fn(),
}

vi.mock('../../../../src/adapters/filesystem/resolver-parser', () => ({
  ResolverParser: class {
    parseFile = mockParserInstance.parseFile
    parseInline = mockParserInstance.parseInline
  },
}))

describe('ResolverLoader', () => {
  let loader: ResolverLoader

  const mockResolverDoc: ResolverDocument = {
    version: '2025.10',
    sets: {
      base: {
        sources: [
          {
            color: {
              primary: {
                $value: { colorSpace: 'srgb', components: [0, 0.27, 0.55] },
                $type: 'color',
              },
            },
          },
        ],
      },
    },
    resolutionOrder: [{ $ref: '#/sets/base' }],
  }

  beforeEach(() => {
    vi.clearAllMocks()
    mockParserInstance.parseFile.mockResolvedValue(mockResolverDoc)
    mockParserInstance.parseInline.mockReturnValue(mockResolverDoc)
  })

  describe('Constructor', () => {
    it('should create instance with default options', () => {
      loader = new ResolverLoader()
      expect(loader).toBeInstanceOf(ResolverLoader)
    })

    it('should accept custom options', () => {
      loader = new ResolverLoader({ baseDir: '/custom/dir' })
      expect(loader).toBeInstanceOf(ResolverLoader)
    })
  })

  describe('load()', () => {
    beforeEach(() => {
      loader = new ResolverLoader({ baseDir: '/test/base' })
    })

    it('should load from file path', async () => {
      mockParserInstance.parseFile.mockResolvedValue(mockResolverDoc)

      const result = await loader.load('./tokens.resolver.json')

      expect(result.resolverDoc).toEqual(mockResolverDoc)
      expect(result.baseDir).toContain('test/base')
      expect(mockParserInstance.parseFile).toHaveBeenCalled()
    })

    it('should load from inline object', async () => {
      const result = await loader.load(mockResolverDoc)

      expect(result.resolverDoc).toEqual(mockResolverDoc)
      expect(result.baseDir).toBe('/test/base')
      expect(mockParserInstance.parseInline).toHaveBeenCalledWith(mockResolverDoc)
    })

    it('should return correct baseDir for file-based resolver', async () => {
      mockParserInstance.parseFile.mockResolvedValue(mockResolverDoc)

      const result = await loader.load('/project/tokens/tokens.resolver.json')

      expect(result.baseDir).toBe('/project/tokens')
    })

    it('should use configured baseDir for inline resolver', async () => {
      const customLoader = new ResolverLoader({ baseDir: '/custom/base' })

      const result = await customLoader.load(mockResolverDoc)

      expect(result.baseDir).toBe('/custom/base')
    })

    it('should handle relative file paths', async () => {
      mockParserInstance.parseFile.mockResolvedValue(mockResolverDoc)

      await loader.load('relative/path/resolver.json')

      expect(mockParserInstance.parseFile).toHaveBeenCalled()
      const callPath = mockParserInstance.parseFile.mock.calls[0][0]
      expect(callPath).toContain('test/base')
      expect(callPath).toContain('relative/path/resolver.json')
    })

    it('should handle absolute file paths', async () => {
      mockParserInstance.parseFile.mockResolvedValue(mockResolverDoc)

      await loader.load('/absolute/path/resolver.json')

      expect(mockParserInstance.parseFile).toHaveBeenCalledWith('/absolute/path/resolver.json')
    })

    it('should propagate parser errors', async () => {
      mockParserInstance.parseFile.mockRejectedValue(new Error('Parse error'))

      await expect(loader.load('./bad.json')).rejects.toThrow('Parse error')
    })
  })

  describe('loadDocument()', () => {
    beforeEach(() => {
      loader = new ResolverLoader()
    })

    it('should return only resolver document from file', async () => {
      mockParserInstance.parseFile.mockResolvedValue(mockResolverDoc)

      const result = await loader.loadDocument('./tokens.resolver.json')

      expect(result).toEqual(mockResolverDoc)
      expect(result).not.toHaveProperty('baseDir')
    })

    it('should return only resolver document from inline', async () => {
      const result = await loader.loadDocument(mockResolverDoc)

      expect(result).toEqual(mockResolverDoc)
    })

    it('should be a convenience wrapper for load()', async () => {
      mockParserInstance.parseFile.mockResolvedValue(mockResolverDoc)

      const result1 = await loader.loadDocument('./test.json')
      const result2 = await loader.load('./test.json')

      expect(result1).toEqual(result2.resolverDoc)
    })
  })

  describe('setBaseDir()', () => {
    it('should update base directory', async () => {
      loader = new ResolverLoader({ baseDir: '/original' })

      loader.setBaseDir('/updated')

      const result = await loader.load(mockResolverDoc)
      expect(result.baseDir).toBe('/updated')
    })

    it('should affect subsequent file loads', async () => {
      loader = new ResolverLoader({ baseDir: '/first' })
      mockParserInstance.parseFile.mockResolvedValue(mockResolverDoc)

      await loader.load('resolver.json')
      const firstCall = mockParserInstance.parseFile.mock.calls[0][0]

      loader.setBaseDir('/second')

      await loader.load('resolver.json')
      const secondCall = mockParserInstance.parseFile.mock.calls[1][0]

      expect(firstCall).toContain('/first')
      expect(secondCall).toContain('/second')
    })
  })

  describe('Integration Scenarios', () => {
    it('should handle switching between file and inline modes', async () => {
      loader = new ResolverLoader({ baseDir: '/base' })
      mockParserInstance.parseFile.mockResolvedValue(mockResolverDoc)

      // File mode
      const fileResult = await loader.load('./file.json')
      expect(fileResult.baseDir).toContain('/base')

      // Inline mode
      const inlineResult = await loader.load(mockResolverDoc)
      expect(inlineResult.baseDir).toBe('/base')
    })

    it('should handle errors gracefully', async () => {
      loader = new ResolverLoader()
      mockParserInstance.parseFile.mockRejectedValue(new Error('File not found'))
      mockParserInstance.parseInline.mockImplementation(() => {
        throw new Error('Validation failed')
      })

      await expect(loader.load('./missing.json')).rejects.toThrow('File not found')
      await expect(loader.load({} as ResolverDocument)).rejects.toThrow('Validation failed')
    })
  })
})
