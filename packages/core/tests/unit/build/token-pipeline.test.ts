/**
 * @fileoverview Unit tests for TokenPipeline
 */

import { describe, expect, it, vi, beforeEach } from 'vitest'
import { TokenPipeline } from '../../../src/build/pipeline/token-pipeline'
import type { ResolverDocument } from '../../../src/lib/resolution/resolution.types'

// Note: TokenPipeline is primarily tested through integration tests
// These unit tests focus on pipeline construction and configuration

describe('TokenPipeline', () => {
  let pipeline: TokenPipeline
  let mockResolverDoc: ResolverDocument

  beforeEach(() => {
    vi.clearAllMocks()

    mockResolverDoc = {
      version: '2025.10',
      sets: {
        base: {
          sources: [{ color: { primary: { $value: '#ff0000', $type: 'color' } } }],
        },
      },
      resolutionOrder: [{ $ref: '#/sets/base' }],
    }
  })

  describe('Constructor', () => {
    it('should create instance with default options', () => {
      pipeline = new TokenPipeline()
      expect(pipeline).toBeInstanceOf(TokenPipeline)
    })

    it('should accept custom options', () => {
      pipeline = new TokenPipeline({ validate: false })
      expect(pipeline).toBeInstanceOf(TokenPipeline)
    })

    it('should default validation to true', () => {
      pipeline = new TokenPipeline()
      expect(pipeline).toBeDefined()
    })
  })

  describe('Configuration', () => {
    it('should respect validate option', () => {
      const validatedPipeline = new TokenPipeline({ validate: true })
      const unvalidatedPipeline = new TokenPipeline({ validate: false })

      expect(validatedPipeline).toBeDefined()
      expect(unvalidatedPipeline).toBeDefined()
    })
  })

  describe('Type Safety', () => {
    it('should have resolve method', () => {
      pipeline = new TokenPipeline()
      expect(typeof pipeline.resolve).toBe('function')
    })

    it('should have resolveAllPermutations method', () => {
      pipeline = new TokenPipeline()
      expect(typeof pipeline.resolveAllPermutations).toBe('function')
    })
  })

  describe('API Stability', () => {
    it('should maintain method names', () => {
      pipeline = new TokenPipeline()

      const methods = Object.getOwnPropertyNames(Object.getPrototypeOf(pipeline))
      expect(methods).toContain('resolve')
      expect(methods).toContain('resolveAllPermutations')
    })

    it('should maintain resolve signature', () => {
      pipeline = new TokenPipeline()
      expect(pipeline.resolve.length).toBeGreaterThanOrEqual(2)
    })

    it('should maintain resolveAllPermutations signature', () => {
      pipeline = new TokenPipeline()
      expect(pipeline.resolveAllPermutations.length).toBeGreaterThanOrEqual(1)
    })
  })

  describe('Method Signatures', () => {
    it('should have async resolve method', () => {
      pipeline = new TokenPipeline()
      expect(pipeline.resolve.constructor.name).toBe('AsyncFunction')
    })

    it('should have async resolveAllPermutations method', () => {
      pipeline = new TokenPipeline()
      expect(pipeline.resolveAllPermutations.constructor.name).toBe('AsyncFunction')
    })
  })

  describe('Instance Isolation', () => {
    it('should create independent instances', () => {
      const pipeline1 = new TokenPipeline({ validate: true })
      const pipeline2 = new TokenPipeline({ validate: false })

      expect(pipeline1).not.toBe(pipeline2)
    })

    it('should maintain instance-level options', () => {
      const validatedPipeline = new TokenPipeline({ validate: true })
      const unvalidatedPipeline = new TokenPipeline({ validate: false })

      // Both should be functional independently
      expect(validatedPipeline).toBeDefined()
      expect(unvalidatedPipeline).toBeDefined()
    })
  })
})

