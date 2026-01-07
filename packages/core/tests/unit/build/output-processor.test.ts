/**
 * @fileoverview Unit tests for OutputProcessor
 */

import { beforeEach, describe, expect, it, vi } from 'vitest'
import * as fileUtils from '../../../src/adapters/filesystem/file-utils'
import { OutputProcessor } from '../../../src/build/output-processor'
import type { OutputConfig, ResolvedTokens } from '../../../src/config/index'
import { outputTree } from '../../../src/renderers'
import type { RenderContext } from '../../../src/renderers/types'

vi.mock('../../../src/adapters/filesystem/file-utils', () => ({
  writeOutputFile: vi.fn(),
}))

vi.mock('../../../src/lib/processing/token-modifier', () => ({
  applyFilters: vi.fn((tokens) => tokens),
  applyTransforms: vi.fn((tokens) => tokens),
}))

describe('OutputProcessor', () => {
  let processor: OutputProcessor
  let mockTokens: ResolvedTokens
  let mockOutput: OutputConfig

  beforeEach(() => {
    vi.clearAllMocks()
    processor = new OutputProcessor()

    mockTokens = {
      'color.primary': {
        $value: '#ff0000',
        $type: 'color',
        path: ['color', 'primary'],
        name: 'color.primary',
        originalValue: '#ff0000',
      },
    }

    mockOutput = {
      name: 'test-output',
      renderer: {
        format: vi.fn().mockResolvedValue('formatted content'),
      },
      file: 'output.css',
    }
  })

  const buildContext = (output: OutputConfig): RenderContext => ({
    permutations: [{ tokens: mockTokens, modifierInputs: {} }],
    output,
    resolver: { sets: {}, resolutionOrder: [] },
    meta: { dimensions: [], defaults: {}, basePermutation: {} },
    buildPath: '/test/build',
  })

  describe('processPermutations()', () => {
    it('should apply filters and transforms to each permutation', () => {
      const result = processor.processPermutations(
        [{ tokens: mockTokens, modifierInputs: {} }],
        mockOutput,
      )

      expect(result[0]?.tokens).toEqual(mockTokens)
    })
  })

  describe('writeRenderOutput()', () => {
    it('should write single string output when buildPath is provided', async () => {
      const context = buildContext(mockOutput)
      const outputs = await processor.writeRenderOutput('formatted content', context)

      expect(outputs).toHaveLength(1)
      expect(outputs[0]?.path).toBe('/test/build/output.css')
      expect(fileUtils.writeOutputFile).toHaveBeenCalledWith(
        '/test/build/output.css',
        'formatted content',
      )
    })

    it('should write multiple files for outputTree', async () => {
      const context = buildContext(mockOutput)
      const tree = outputTree({
        'a.css': 'a',
        'b.css': 'b',
      })

      const outputs = await processor.writeRenderOutput(tree, context)

      expect(outputs).toHaveLength(2)
      expect(fileUtils.writeOutputFile).toHaveBeenCalledWith('/test/build/a.css', 'a')
      expect(fileUtils.writeOutputFile).toHaveBeenCalledWith('/test/build/b.css', 'b')
    })

    it('should not write in in-memory mode', async () => {
      const context = { ...buildContext(mockOutput), buildPath: undefined }
      const outputs = await processor.writeRenderOutput('content', context)

      expect(outputs[0]?.path).toBeUndefined()
      expect(fileUtils.writeOutputFile).not.toHaveBeenCalled()
    })

    it('should return output keys for outputTree in-memory', async () => {
      const context = { ...buildContext(mockOutput), buildPath: undefined }
      const tree = outputTree({
        'a.css': 'a',
        'b.css': 'b',
      })

      const outputs = await processor.writeRenderOutput(tree, context)

      expect(outputs).toHaveLength(2)
      expect(outputs[0]?.path).toBe('a.css')
      expect(outputs[1]?.path).toBe('b.css')
      expect(fileUtils.writeOutputFile).not.toHaveBeenCalled()
    })

    it('should throw when file is missing for string output with buildPath', async () => {
      const outputWithoutFile = { ...mockOutput, file: undefined }
      const context = buildContext(outputWithoutFile)

      await expect(processor.writeRenderOutput('content', context)).rejects.toThrow(
        'file is required',
      )
    })
  })
})
