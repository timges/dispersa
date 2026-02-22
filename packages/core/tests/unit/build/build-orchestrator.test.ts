/**
 * @fileoverview Unit tests for BuildOrchestrator
 */

import { describe, expect, it, vi, beforeEach } from 'vitest'
import { BuildOrchestrator } from '../../../src/build/build-orchestrator'
import { TokenPipeline } from '../../../src/build/pipeline/token-pipeline'
import { OutputProcessor } from '../../../src/build/output-processor'
import type { BuildConfig } from '../../../src/config/index'
import type { ResolverDocument } from '../../../src/resolution/types'
import { ReferenceResolver, ResolutionEngine } from '../../../src/resolution'
import type { PermutationData } from '../../../src/renderers/types'

describe('BuildOrchestrator', () => {
  let orchestrator: BuildOrchestrator
  let pipeline: TokenPipeline
  let outputProcessor: OutputProcessor
  let mockResolverDoc: ResolverDocument
  let mockConfig: BuildConfig

  beforeEach(() => {
    vi.clearAllMocks()

    const mockTokens = {
      'color.primary': {
        $value: { colorSpace: 'srgb', components: [0, 0.27, 0.55] },
        $type: 'color',
        path: ['color', 'primary'],
        name: 'color.primary',
        originalValue: '#ff0000',
      },
    }

    const mockPermutation: PermutationData = {
      tokens: mockTokens,
      modifierInputs: {},
    }

    pipeline = new TokenPipeline()
    outputProcessor = new OutputProcessor()

    mockResolverDoc = {
      version: '2025.10',
      sets: {
        base: {
          sources: [{ color: { primary: { $value: { colorSpace: 'srgb', components: [0, 0.27, 0.55] }, $type: 'color' } } }],
        },
      },
      resolutionOrder: [{ $ref: '#/sets/base' }],
    }

    const mockResolutionEngine = new ResolutionEngine(
      mockResolverDoc,
      new ReferenceResolver(process.cwd()),
    )

    vi.spyOn(pipeline, 'resolve').mockResolvedValue({
      tokens: mockTokens,
      resolutionEngine: mockResolutionEngine,
      modifierInputs: {},
    })
    vi.spyOn(pipeline, 'resolveAllPermutations').mockResolvedValue([mockPermutation])

    vi.spyOn(outputProcessor, 'processPermutations').mockImplementation((permutations) => permutations)
    vi.spyOn(outputProcessor, 'writeRenderOutput').mockResolvedValue([
      {
        name: 'test',
        path: '/test/output.css',
        content: 'formatted content',
      },
    ])

    mockConfig = {
      outputs: [
        {
          name: 'test',
          renderer: {
            format: vi.fn().mockResolvedValue('formatted content'),
          },
          file: 'output.css',
        },
      ],
    }

    orchestrator = new BuildOrchestrator(pipeline, outputProcessor)
  })

  describe('Constructor', () => {
    it('should create instance with pipeline and processor', () => {
      expect(orchestrator).toBeInstanceOf(BuildOrchestrator)
    })
  })

  describe('build() - Auto-discovery', () => {
    it('should auto-discover permutations when none specified', async () => {
      const result = await orchestrator.build(mockResolverDoc, '/build', mockConfig)

      expect(pipeline.resolveAllPermutations).toHaveBeenCalled()
      expect(result.success).toBe(true)
    })

    it('should auto-discover when permutations array is empty', async () => {
      const configWithEmpty = { ...mockConfig, permutations: [] }

      await orchestrator.build(mockResolverDoc, '/build', configWithEmpty)

      expect(pipeline.resolveAllPermutations).toHaveBeenCalled()
    })

    it('should pass global processors to auto-discovery', async () => {
      const configWithGlobals = {
        ...mockConfig,
        transforms: [{ matcher: () => true, transform: (token: any) => token }],
        preprocessors: [{ name: 'noop', preprocess: async (tokens: any) => tokens }],
        filters: [{ filter: () => true }],
      }

      await orchestrator.build(mockResolverDoc, '/build', configWithGlobals)

      expect(pipeline.resolveAllPermutations).toHaveBeenCalledWith(
        mockResolverDoc,
        configWithGlobals.transforms,
        configWithGlobals.preprocessors,
        configWithGlobals.filters,
        configWithGlobals.lint,
      )
    })

    it('should not auto-discover when explicit permutations provided', async () => {
      const configWithPerms = { ...mockConfig, permutations: [{}] }

      await orchestrator.build(mockResolverDoc, '/build', configWithPerms)

      expect(pipeline.resolveAllPermutations).not.toHaveBeenCalled()
      expect(pipeline.resolve).toHaveBeenCalled()
    })
  })

  describe('build() - Explicit Permutations', () => {
    it('should build specified permutations', async () => {
      const config = {
        ...mockConfig,
        permutations: [{ theme: 'light' }, { theme: 'dark' }],
      }

      await orchestrator.build(mockResolverDoc, '/build', config)

      expect(pipeline.resolve).toHaveBeenCalledTimes(2)
    })

    it('should pass modifierInputs to pipeline.resolve', async () => {
      const config = {
        ...mockConfig,
        permutations: [{ theme: 'light' }],
      }

      await orchestrator.build(mockResolverDoc, '/build', config)

      expect(pipeline.resolve).toHaveBeenCalled()
      const callArgs = vi.mocked(pipeline.resolve).mock.calls[0]
      expect(callArgs[0]).toBe(mockResolverDoc)
      expect(callArgs[1]).toEqual({ theme: 'light' })
    })

    it('should build single default permutation with [{}]', async () => {
      const config = { ...mockConfig, permutations: [{}] }

      const result = await orchestrator.build(mockResolverDoc, '/build', config)

      expect(pipeline.resolve).toHaveBeenCalledTimes(1)
      expect(result.success).toBe(true)
    })
  })

  describe('build() - Renderer Handling', () => {
    it('should invoke renderer.format for each output', async () => {
      const formatRenderer = {
        format: vi.fn().mockResolvedValue('formatted'),
      }
      const config = {
        outputs: [{ name: 'test', renderer: formatRenderer, file: 'out.css' }],
      }

      const result = await orchestrator.build(mockResolverDoc, '/build', config)

      expect(formatRenderer.format).toHaveBeenCalled()
      expect(result.outputs.length).toBeGreaterThan(0)
    })

    it('should throw error for renderer without format()', async () => {
      const invalidRenderer = { name: 'invalid' }
      // @ts-expect-error - intentional invalid renderer for error handling test
      const config: BuildConfig = {
        outputs: [{ name: 'test', renderer: invalidRenderer, file: 'out.css' }],
      }

      const result = await orchestrator.build(mockResolverDoc, '/build', config)

      expect(result.success).toBe(false)
      expect(result.errors).toBeDefined()
      expect(result.errors![0].message).toContain('does not implement format()')
    })
  })

  describe('build() - Error Handling', () => {
    it('should collect errors from output builds', async () => {
      vi.mocked(outputProcessor.writeRenderOutput).mockRejectedValue(new Error('Output error'))

      const result = await orchestrator.build(mockResolverDoc, '/build', mockConfig)

      expect(result.success).toBe(false)
      expect(result.errors).toBeDefined()
      expect(result.errors!.length).toBeGreaterThan(0)
    })

    it('should continue building other outputs after error', async () => {
      const config = {
        outputs: [
          {
            name: 'failing',
            renderer: { name: 'test', format: vi.fn().mockRejectedValue(new Error('fail')) },
            file: 'fail.css',
          },
          {
            name: 'passing',
            renderer: { name: 'test', format: vi.fn().mockResolvedValue('success') },
            file: 'pass.css',
          },
        ],
      }

      const result = await orchestrator.build(mockResolverDoc, '/build', config)

      // Both outputs should be attempted
      const totalAttempts = result.outputs.length + (result.errors?.length || 0)
      expect(totalAttempts).toBe(2)
    })

    it('should return error details', async () => {
      vi.mocked(outputProcessor.writeRenderOutput).mockRejectedValue(new Error('Test error'))

      const result = await orchestrator.build(mockResolverDoc, '/build', mockConfig)

      expect(result.errors![0].message).toContain('test')
      expect(result.errors![0].message).toContain('Test error')
    })

    it('should handle resolver loading errors', async () => {
      vi.mocked(pipeline.resolveAllPermutations).mockRejectedValue(
        new Error('Resolver error'),
      )

      await expect(orchestrator.build(mockResolverDoc, '/build', mockConfig)).rejects.toThrow('Resolver error')
    })
  })

  describe('build() - Result Structure', () => {
    it('should return success: true when build succeeds', async () => {
      const result = await orchestrator.build(mockResolverDoc, '/build', mockConfig)

      expect(result.success).toBe(true)
      expect(result.outputs).toBeDefined()
      expect(result.errors).toBeUndefined()
    })

    it('should return success: false when build fails', async () => {
      vi.mocked(outputProcessor.writeRenderOutput).mockRejectedValue(new Error('fail'))

      const result = await orchestrator.build(mockResolverDoc, '/build', mockConfig)

      expect(result.success).toBe(false)
      expect(result.errors).toBeDefined()
    })

    it('should include all output outputs', async () => {
      const config = {
        outputs: [
          { name: 'css', renderer: mockConfig.outputs[0].renderer, file: 'out.css' },
          { name: 'json', renderer: mockConfig.outputs[0].renderer, file: 'out.json' },
        ],
      }

      const result = await orchestrator.build(mockResolverDoc, '/build', config)

      expect(result.outputs.length).toBe(2)
    })

    it('should include outputs even when some outputs fail', async () => {
      vi.mocked(outputProcessor.writeRenderOutput)
        .mockResolvedValueOnce([
          {
            name: 'success',
            path: '/test/success.css',
            content: 'content',
          },
        ])
        .mockRejectedValueOnce(new Error('fail'))

      const config = {
        outputs: [
          { name: 'p1', renderer: mockConfig.outputs[0].renderer, file: 'p1.css' },
          { name: 'p2', renderer: mockConfig.outputs[0].renderer, file: 'p2.css' },
        ],
      }

      const result = await orchestrator.build(mockResolverDoc, '/build', config)

      expect(result.outputs.length).toBe(1)
      expect(result.errors!.length).toBe(1)
    })
  })

  describe('Integration Scenarios', () => {
    it('should handle file-based resolver', async () => {
      await orchestrator.build('./resolver.json', '/build', mockConfig)

      expect(pipeline.resolveAllPermutations).toHaveBeenCalled()
      const callArgs = vi.mocked(pipeline.resolveAllPermutations).mock.calls[0]
      expect(callArgs[0]).toBe('./resolver.json')
    })

    it('should handle inline resolver', async () => {
      await orchestrator.build(mockResolverDoc, '/build', mockConfig)

      expect(pipeline.resolveAllPermutations).toHaveBeenCalled()
      const callArgs = vi.mocked(pipeline.resolveAllPermutations).mock.calls[0]
      expect(callArgs[0]).toBe(mockResolverDoc)
    })

    // Validation tests removed - validation is now always enabled and not configurable
  })
})

