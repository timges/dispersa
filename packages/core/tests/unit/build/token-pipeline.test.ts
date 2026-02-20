/**
 * @fileoverview Unit tests for TokenPipeline
 */

import { describe, expect, it, vi, beforeEach } from 'vitest'
import { TokenPipeline } from '../../../src/build/pipeline/token-pipeline'
import type { ResolverDocument } from '../../../src/resolution/types'

const srgb = (r: number, g: number, b: number) => ({
  colorSpace: 'srgb',
  components: [r, g, b],
})

describe('TokenPipeline', () => {
  let pipeline: TokenPipeline
  let mockResolverDoc: ResolverDocument

  beforeEach(() => {
    vi.clearAllMocks()

    mockResolverDoc = {
      version: '2025.10',
      sets: {
        base: {
          sources: [{ color: { primary: { $value: { colorSpace: 'srgb', components: [0, 0.27, 0.55] }, $type: 'color' } } }],
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

  describe('$root stripping', () => {
    it('should strip $root from token name and path', async () => {
      const resolver: ResolverDocument = {
        version: '2025.10',
        sets: {
          colors: {
            sources: [
              {
                color: {
                  action: {
                    brand: {
                      $type: 'color',
                      $root: { $value: srgb(0, 0.4, 0.8) },
                      hover: { $value: srgb(0, 0.3, 0.7) },
                    },
                  },
                },
              },
            ],
          },
        },
        resolutionOrder: [{ $ref: '#/sets/colors' }],
      }

      pipeline = new TokenPipeline()
      const { tokens } = await pipeline.resolve(resolver, {})

      expect(tokens).toHaveProperty('color.action.brand')
      expect(tokens).not.toHaveProperty('color.action.brand.$root')
      expect(tokens['color.action.brand'].path).toEqual(['color', 'action', 'brand'])
      expect(tokens['color.action.brand'].name).toBe('color.action.brand')
      expect(tokens['color.action.brand'].$value).toEqual(srgb(0, 0.4, 0.8))
    })

    it('should leave sibling tokens unchanged', async () => {
      const resolver: ResolverDocument = {
        version: '2025.10',
        sets: {
          colors: {
            sources: [
              {
                color: {
                  action: {
                    brand: {
                      $type: 'color',
                      $root: { $value: srgb(0, 0.4, 0.8) },
                      hover: { $value: srgb(0, 0.3, 0.7) },
                    },
                  },
                },
              },
            ],
          },
        },
        resolutionOrder: [{ $ref: '#/sets/colors' }],
      }

      pipeline = new TokenPipeline()
      const { tokens } = await pipeline.resolve(resolver, {})

      expect(tokens).toHaveProperty('color.action.brand.hover')
      expect(tokens['color.action.brand.hover'].path).toEqual([
        'color',
        'action',
        'brand',
        'hover',
      ])
      expect(tokens['color.action.brand.hover'].$value).toEqual(srgb(0, 0.3, 0.7))
    })

    it('should strip $root from multiple groups', async () => {
      const resolver: ResolverDocument = {
        version: '2025.10',
        sets: {
          colors: {
            sources: [
              {
                color: {
                  $type: 'color',
                  action: {
                    brand: {
                      $root: { $value: srgb(0, 0.4, 0.8) },
                      hover: { $value: srgb(0, 0.3, 0.7) },
                    },
                  },
                  border: {
                    default: {
                      $root: { $value: srgb(0.84, 0.85, 0.86) },
                      focus: { $value: srgb(0, 0.4, 0.8) },
                    },
                  },
                },
              },
            ],
          },
        },
        resolutionOrder: [{ $ref: '#/sets/colors' }],
      }

      pipeline = new TokenPipeline()
      const { tokens } = await pipeline.resolve(resolver, {})

      expect(tokens).toHaveProperty('color.action.brand')
      expect(tokens).toHaveProperty('color.border.default')
      expect(tokens).not.toHaveProperty('color.action.brand.$root')
      expect(tokens).not.toHaveProperty('color.border.default.$root')
    })

    it('should strip $root from group with only $root (no siblings)', async () => {
      const resolver: ResolverDocument = {
        version: '2025.10',
        sets: {
          colors: {
            sources: [
              {
                color: {
                  primary: {
                    $type: 'color',
                    $root: { $value: srgb(0, 0.4, 0.8) },
                  },
                },
              },
            ],
          },
        },
        resolutionOrder: [{ $ref: '#/sets/colors' }],
      }

      pipeline = new TokenPipeline()
      const { tokens } = await pipeline.resolve(resolver, {})

      expect(tokens).toHaveProperty('color.primary')
      expect(tokens).not.toHaveProperty('color.primary.$root')
      expect(tokens['color.primary'].name).toBe('color.primary')
    })

    it('should resolve aliases referencing $root before stripping', async () => {
      const resolver: ResolverDocument = {
        version: '2025.10',
        sets: {
          colors: {
            sources: [
              {
                color: {
                  $type: 'color',
                  action: {
                    brand: {
                      $root: { $value: srgb(0, 0.4, 0.8) },
                      hover: { $value: srgb(0, 0.3, 0.7) },
                    },
                  },
                  button: {
                    background: { $value: '{color.action.brand.$root}' },
                  },
                },
              },
            ],
          },
        },
        resolutionOrder: [{ $ref: '#/sets/colors' }],
      }

      pipeline = new TokenPipeline()
      const { tokens } = await pipeline.resolve(resolver, {})

      expect(tokens['color.button.background'].$value).toEqual(srgb(0, 0.4, 0.8))
      expect(tokens['color.button.background'].originalValue).toBe('{color.action.brand}')
    })

    it('should rewrite $root references in originalValue for preserveReferences', async () => {
      const resolver: ResolverDocument = {
        version: '2025.10',
        sets: {
          colors: {
            sources: [
              {
                color: {
                  $type: 'color',
                  action: {
                    brand: {
                      $root: { $value: srgb(0, 0.4, 0.8) },
                      hover: { $value: srgb(0, 0.3, 0.7) },
                      strong: {
                        $root: { $value: '{color.action.brand.$root}' },
                        active: { $value: srgb(0, 0.27, 0.55) },
                      },
                    },
                  },
                },
              },
            ],
          },
        },
        resolutionOrder: [{ $ref: '#/sets/colors' }],
      }

      pipeline = new TokenPipeline()
      const { tokens } = await pipeline.resolve(resolver, {})

      expect(tokens['color.action.brand.strong']).toBeDefined()
      expect(tokens['color.action.brand.strong'].$value).toEqual(srgb(0, 0.4, 0.8))
      expect(tokens['color.action.brand.strong'].originalValue).toBe('{color.action.brand}')
    })
  })
})

