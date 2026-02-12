/**
 * @fileoverview Tests for property-level references using JSON Pointer syntax
 * Per DTCG spec section 7.3, property-level references require JSON Pointer syntax ($ref)
 * and cannot be expressed using curly brace syntax.
 */

import { mkdirSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { AliasResolver } from '../../../src/resolution/alias-resolver'
import { ReferenceResolver } from '../../../src/resolution/reference-resolver'
import type { ResolvedTokens } from '../../../src/tokens/types'

describe('Property-Level References (JSON Pointer Only)', () => {
  let refResolver: ReferenceResolver
  let aliasResolver: AliasResolver
  let tempDir: string

  beforeEach(() => {
    // Create a temporary directory for test files
    tempDir = join(tmpdir(), `dispersa-test-${Date.now()}`)
    mkdirSync(tempDir, { recursive: true })
    refResolver = new ReferenceResolver(tempDir)
    aliasResolver = new AliasResolver()
  })

  afterEach(() => {
    // Clean up temp directory
    if (tempDir) {
      try {
        rmSync(tempDir, { recursive: true, force: true })
      } catch (e) {
        // Ignore cleanup errors
      }
    }
  })

  describe('JSON Pointer Syntax with $ref (ReferenceResolver)', () => {
    it('should resolve property-level references to array indices', async () => {
      const document = {
        base: {
          blue: {
            $value: {
              colorSpace: 'srgb',
              components: [0.2, 0.4, 0.9],
            },
          },
        },
      }

      // Resolve a reference to the first component
      const result = await refResolver.resolve('#/base/blue/$value/components/0', document)
      expect(result).toBe(0.2)

      // Resolve a reference to the second component
      const result2 = await refResolver.resolve('#/base/blue/$value/components/1', document)
      expect(result2).toBe(0.4)
    })

    it('should resolve property-level references to object properties', async () => {
      const document = {
        dimension: {
          spacing: {
            $value: {
              value: 16,
              unit: 'px',
            },
          },
        },
      }

      // Resolve reference to value property
      const value = await refResolver.resolve('#/dimension/spacing/$value/value', document)
      expect(value).toBe(16)

      // Resolve reference to unit property
      const unit = await refResolver.resolve('#/dimension/spacing/$value/unit', document)
      expect(unit).toBe('px')
    })

    it('should resolve nested property references', async () => {
      const document = {
        shadow: {
          base: {
            $value: {
              color: {
                colorSpace: 'srgb',
                components: [0, 0, 0],
                alpha: 0.5,
              },
              offsetX: { value: 0, unit: 'px' },
              offsetY: { value: 2, unit: 'px' },
            },
          },
        },
      }

      // Resolve reference to nested alpha property
      const alpha = await refResolver.resolve('#/shadow/base/$value/color/alpha', document)
      expect(alpha).toBe(0.5)

      // Resolve reference to nested offsetY value
      const offsetY = await refResolver.resolve('#/shadow/base/$value/offsetY/value', document)
      expect(offsetY).toBe(2)
    })

    it('should resolve property-level references in arrays', async () => {
      const document = {
        base: {
          blue: {
            $value: {
              colorSpace: 'srgb',
              components: [0.2, 0.4, 0.9],
            },
          },
        },
        semantic: {
          primary: {
            $value: {
              colorSpace: 'srgb',
              components: [
                { $ref: '#/base/blue/$value/components/0' },
                { $ref: '#/base/blue/$value/components/1' },
                0.7,
              ],
            },
          },
        },
      }

      // Resolve the entire document deeply
      const resolved = await refResolver.resolveDeep(document, document)

      // Check that the components array was resolved
      const semantic = resolved as Record<string, any>
      expect(semantic.semantic.primary.$value.components).toEqual([0.2, 0.4, 0.7])
    })

    it('should apply local overrides alongside $ref when resolving deep', async () => {
      const document = {
        base: {
          dimension: {
            $value: {
              value: 16,
              unit: 'px',
            },
          },
        },
        override: {
          dimension: {
            $value: {
              $ref: '#/base/dimension/$value',
              unit: 'rem',
            },
          },
        },
      }

      const resolved = await refResolver.resolveDeep(document, document)
      const override = resolved as Record<string, any>

      expect(override.override.dimension.$value).toEqual({ value: 16, unit: 'rem' })
    })

    it('should handle deep property chains', async () => {
      const document = {
        config: {
          layout: {
            $value: {
              spacing: {
                vertical: {
                  small: { value: 8, unit: 'px' },
                  medium: { value: 16, unit: 'px' },
                },
              },
            },
          },
        },
      }

      const result = await refResolver.resolve(
        '#/config/layout/$value/spacing/vertical/medium/value',
        document,
      )
      expect(result).toBe(16)
    })
  })

  describe('Curly Brace Syntax Limitations (AliasResolver)', () => {
    it('should NOT support property-level access with curly braces', () => {
      const tokens: ResolvedTokens = {
        'base.color': {
          $type: 'color',
          $value: {
            colorSpace: 'srgb',
            components: [1, 0, 0],
          },
          path: ['base', 'color'],
          name: 'base.color',
          originalValue: {
            colorSpace: 'srgb',
            components: [1, 0, 0],
          },
        },
        // This should fail because curly braces don't support property access
        'semantic.component': {
          $type: 'number',
          $value: '{base.color.components.0}',
          path: ['semantic', 'component'],
          name: 'semantic.component',
          originalValue: '{base.color.components.0}',
        },
      }

      expect(() => aliasResolver.resolve(tokens)).toThrow()
    })

    it('should only resolve whole tokens with curly braces', () => {
      const tokens: ResolvedTokens = {
        'color.primary': {
          $type: 'color',
          $value: '#ff0000',
          path: ['color', 'primary'],
          name: 'color.primary',
          originalValue: '#ff0000',
        },
        'color.secondary': {
          $type: 'color',
          $value: '{color.primary}', // Whole token reference - works
          path: ['color', 'secondary'],
          name: 'color.secondary',
          originalValue: '{color.primary}',
        },
      }

      const resolved = aliasResolver.resolve(tokens)

      // Whole token reference works fine
      expect(resolved['color.secondary'].$value).toBe('#ff0000')
    })

    it('should treat dotted paths in curly braces as full token names', () => {
      const tokens: ResolvedTokens = {
        brand: {
          $type: 'color',
          $value: '#0066ff',
          path: ['brand'],
          name: 'brand',
          originalValue: '#0066ff',
        },
        'color.primary.main': {
          $type: 'color',
          $value: '#ff0000',
          path: ['color', 'primary', 'main'],
          name: 'color.primary.main',
          originalValue: '#ff0000',
        },
        reference: {
          $type: 'color',
          $value: '{color.primary.main}', // This is a full token name
          path: ['reference'],
          name: 'reference',
          originalValue: '{color.primary.main}',
        },
      }

      const resolved = aliasResolver.resolve(tokens)

      // Should resolve to the token named "color.primary.main", not property access
      expect(resolved['reference'].$value).toBe('#ff0000')
    })
  })

  describe('Shadow Token Resolution', () => {
    it('should resolve full shadow token references with curly braces', () => {
      const tokens: ResolvedTokens = {
        'shadow.base': {
          $type: 'shadow',
          $value: {
            color: { colorSpace: 'srgb', components: [0, 0, 0], alpha: 0.1 },
            offsetX: { value: 0, unit: 'px' },
            offsetY: { value: 2, unit: 'px' },
            blur: { value: 4, unit: 'px' },
            spread: { value: 0, unit: 'px' },
          },
          path: ['shadow', 'base'],
          name: 'shadow.base',
          originalValue: {
            color: { colorSpace: 'srgb', components: [0, 0, 0], alpha: 0.1 },
            offsetX: { value: 0, unit: 'px' },
            offsetY: { value: 2, unit: 'px' },
            blur: { value: 4, unit: 'px' },
            spread: { value: 0, unit: 'px' },
          },
        },
        'shadow.alias': {
          $type: 'shadow',
          $value: '{shadow.base}', // Full token reference
          path: ['shadow', 'alias'],
          name: 'shadow.alias',
          originalValue: '{shadow.base}',
        },
      }

      const resolved = aliasResolver.resolve(tokens)

      // The alias should resolve to the full shadow object
      expect(resolved['shadow.alias'].$value).toEqual({
        color: { colorSpace: 'srgb', components: [0, 0, 0], alpha: 0.1 },
        offsetX: { value: 0, unit: 'px' },
        offsetY: { value: 2, unit: 'px' },
        blur: { value: 4, unit: 'px' },
        spread: { value: 0, unit: 'px' },
      })
    })

    it('should resolve property-level references to shadow properties with JSON Pointer', async () => {
      const document = {
        shadow: {
          base: {
            $value: {
              color: { colorSpace: 'srgb', components: [0, 0, 0], alpha: 0.5 },
              offsetX: { value: 0, unit: 'px' },
              offsetY: { value: 4, unit: 'px' },
              blur: { value: 8, unit: 'px' },
            },
          },
        },
      }

      // Reference to color object
      const color = await refResolver.resolve('#/shadow/base/$value/color', document)
      expect(color).toEqual({ colorSpace: 'srgb', components: [0, 0, 0], alpha: 0.5 })

      // Reference to offsetY dimension
      const offsetY = await refResolver.resolve('#/shadow/base/$value/offsetY', document)
      expect(offsetY).toEqual({ value: 4, unit: 'px' })

      // Reference to nested alpha value
      const alpha = await refResolver.resolve('#/shadow/base/$value/color/alpha', document)
      expect(alpha).toBe(0.5)

      // Reference to blur value (numeric part)
      const blurValue = await refResolver.resolve('#/shadow/base/$value/blur/value', document)
      expect(blurValue).toBe(8)
    })

    it('should resolve curly brace references within shadow property values', () => {
      const tokens: ResolvedTokens = {
        'color.primary': {
          $type: 'color',
          $value: { colorSpace: 'srgb', components: [0, 0.5, 1], alpha: 0.8 },
          path: ['color', 'primary'],
          name: 'color.primary',
          originalValue: { colorSpace: 'srgb', components: [0, 0.5, 1], alpha: 0.8 },
        },
        'dimension.offset': {
          $type: 'dimension',
          $value: { value: 4, unit: 'px' },
          path: ['dimension', 'offset'],
          name: 'dimension.offset',
          originalValue: { value: 4, unit: 'px' },
        },
        'shadow.branded': {
          $type: 'shadow',
          $value: {
            color: '{color.primary}', // Reference to color token
            offsetX: { value: 0, unit: 'px' },
            offsetY: '{dimension.offset}', // Reference to dimension token
            blur: { value: 12, unit: 'px' },
          },
          path: ['shadow', 'branded'],
          name: 'shadow.branded',
          originalValue: {
            color: '{color.primary}',
            offsetX: { value: 0, unit: 'px' },
            offsetY: '{dimension.offset}',
            blur: { value: 12, unit: 'px' },
          },
        },
      }

      const resolved = aliasResolver.resolve(tokens)

      // All references should be resolved
      expect(resolved['shadow.branded'].$value).toEqual({
        color: { colorSpace: 'srgb', components: [0, 0.5, 1], alpha: 0.8 },
        offsetX: { value: 0, unit: 'px' },
        offsetY: { value: 4, unit: 'px' },
        blur: { value: 12, unit: 'px' },
      })
    })

    it('should resolve complex shadow with mixed reference types', async () => {
      const document = {
        color: {
          base: {
            black: {
              $value: { colorSpace: 'srgb', components: [0, 0, 0] },
            },
          },
        },
        shadow: {
          template: {
            $value: {
              color: {
                colorSpace: 'srgb',
                components: [0, 0, 0],
                alpha: 0.1,
              },
              offsetX: { value: 0, unit: 'px' },
              offsetY: { value: 2, unit: 'px' },
              blur: { value: 4, unit: 'px' },
            },
          },
          custom: {
            $value: {
              // Property-level reference to color components (JSON Pointer)
              color: {
                colorSpace: 'srgb',
                components: { $ref: '#/color/base/black/$value/components' },
                alpha: { $ref: '#/shadow/template/$value/color/alpha' },
              },
              // Property-level references to dimensions
              offsetX: { $ref: '#/shadow/template/$value/offsetX' },
              offsetY: { value: 8, unit: 'px' }, // Explicit value
              blur: { $ref: '#/shadow/template/$value/blur' },
            },
          },
        },
      }

      // Resolve all $ref objects
      const resolved = (await refResolver.resolveDeep(document, document)) as any

      // Verify the custom shadow was resolved correctly
      expect(resolved.shadow.custom.$value).toEqual({
        color: {
          colorSpace: 'srgb',
          components: [0, 0, 0],
          alpha: 0.1,
        },
        offsetX: { value: 0, unit: 'px' },
        offsetY: { value: 8, unit: 'px' },
        blur: { value: 4, unit: 'px' },
      })
    })

    it('should handle shadow arrays with full token references', () => {
      const tokens: ResolvedTokens = {
        'shadow.sm': {
          $type: 'shadow',
          $value: {
            color: { colorSpace: 'srgb', components: [0, 0, 0], alpha: 0.05 },
            offsetX: { value: 0, unit: 'px' },
            offsetY: { value: 1, unit: 'px' },
            blur: { value: 2, unit: 'px' },
          },
          path: ['shadow', 'sm'],
          name: 'shadow.sm',
          originalValue: {
            color: { colorSpace: 'srgb', components: [0, 0, 0], alpha: 0.05 },
            offsetX: { value: 0, unit: 'px' },
            offsetY: { value: 1, unit: 'px' },
            blur: { value: 2, unit: 'px' },
          },
        },
        'shadow.md': {
          $type: 'shadow',
          $value: {
            color: { colorSpace: 'srgb', components: [0, 0, 0], alpha: 0.1 },
            offsetX: { value: 0, unit: 'px' },
            offsetY: { value: 4, unit: 'px' },
            blur: { value: 6, unit: 'px' },
          },
          path: ['shadow', 'md'],
          name: 'shadow.md',
          originalValue: {
            color: { colorSpace: 'srgb', components: [0, 0, 0], alpha: 0.1 },
            offsetX: { value: 0, unit: 'px' },
            offsetY: { value: 4, unit: 'px' },
            blur: { value: 6, unit: 'px' },
          },
        },
        'shadow.layered': {
          $type: 'shadow',
          $value: ['{shadow.sm}', '{shadow.md}'], // Array of full references
          path: ['shadow', 'layered'],
          name: 'shadow.layered',
          originalValue: ['{shadow.sm}', '{shadow.md}'],
        },
      }

      const resolved = aliasResolver.resolve(tokens)
      const layered = resolved['shadow.layered'].$value as Array<any>

      expect(Array.isArray(layered)).toBe(true)
      expect(layered).toHaveLength(2)
      expect(layered[0]).toEqual({
        color: { colorSpace: 'srgb', components: [0, 0, 0], alpha: 0.05 },
        offsetX: { value: 0, unit: 'px' },
        offsetY: { value: 1, unit: 'px' },
        blur: { value: 2, unit: 'px' },
      })
      expect(layered[1]).toEqual({
        color: { colorSpace: 'srgb', components: [0, 0, 0], alpha: 0.1 },
        offsetX: { value: 0, unit: 'px' },
        offsetY: { value: 4, unit: 'px' },
        blur: { value: 6, unit: 'px' },
      })
    })
  })

  describe('Error Handling', () => {
    it('should throw error for invalid JSON Pointer path', async () => {
      const document = {
        base: {
          color: {
            $value: {
              components: [1, 0, 0],
            },
          },
        },
      }

      // Reference to non-existent index
      await expect(
        refResolver.resolve('#/base/color/$value/components/5', document),
      ).rejects.toThrow()
    })

    it('should throw error for missing property in JSON Pointer', async () => {
      const document = {
        base: {
          dimension: {
            $value: {
              value: 16,
              unit: 'px',
            },
          },
        },
      }

      // Reference to non-existent property
      await expect(
        refResolver.resolve('#/base/dimension/$value/nonexistent', document),
      ).rejects.toThrow()
    })
  })
})
