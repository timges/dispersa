import { describe, expect, it } from 'vitest'

import { ModifierInputProcessor } from '../../../../src/resolution/modifier-input-processor'
import type { ResolverDocument } from '../../../../src/resolution/resolution.types'
import { ValidationHandler } from '../../../../src/shared/utils/validation-handler'

function createModifiers(
  defs: Record<string, { default?: string; contexts: Record<string, unknown[]> }>,
): ResolverDocument['modifiers'] {
  return defs as ResolverDocument['modifiers']
}

function createProcessor(
  modifiers: ResolverDocument['modifiers'],
  mode: 'error' | 'warn' | 'off' = 'error',
) {
  return new ModifierInputProcessor({
    modifiers,
    validationHandler: new ValidationHandler({ mode }),
  })
}

describe('ModifierInputProcessor', () => {
  const modifiers = createModifiers({
    Theme: { default: 'Light', contexts: { Light: [], Dark: [] } },
    Platform: { default: 'Web', contexts: { Web: [], Mobile: [] } },
  })

  describe('prepare', () => {
    it('should normalize inputs to lowercase', () => {
      const processor = createProcessor(modifiers)
      const result = processor.prepare({ Theme: 'Dark' })

      expect(result.normalizedInputs.theme).toBe('dark')
    })

    it('should fill defaults for missing modifiers', () => {
      const processor = createProcessor(modifiers)
      const result = processor.prepare({ Theme: 'Dark' })

      expect(result.normalizedInputs.platform).toBe('web')
    })

    it('should preserve original casing in resolvedInputs', () => {
      const processor = createProcessor(modifiers)
      const result = processor.prepare({ theme: 'dark' })

      // resolvedInputs should use casing from resolver definition
      expect(result.resolvedInputs.Theme).toBe('Dark')
    })

    it('should handle empty inputs and fill all defaults', () => {
      const processor = createProcessor(modifiers)
      const result = processor.prepare({})

      expect(result.normalizedInputs.theme).toBe('light')
      expect(result.normalizedInputs.platform).toBe('web')
    })

    it('should be case-insensitive for modifier names', () => {
      const processor = createProcessor(modifiers)
      const lower = processor.prepare({ theme: 'dark' })
      const upper = processor.prepare({ THEME: 'DARK' })
      const mixed = processor.prepare({ Theme: 'Dark' })

      expect(lower.normalizedInputs).toEqual(upper.normalizedInputs)
      expect(lower.normalizedInputs).toEqual(mixed.normalizedInputs)
    })
  })

  describe('validation', () => {
    it('should throw on unknown modifier names in error mode', () => {
      const processor = createProcessor(modifiers, 'error')

      expect(() => processor.prepare({ unknown: 'value' })).toThrow()
    })

    it('should throw on invalid context values in error mode', () => {
      const processor = createProcessor(modifiers, 'error')

      expect(() => processor.prepare({ theme: 'nonexistent' })).toThrow()
    })

    it('should not throw on unknown modifiers in warn mode', () => {
      const processor = createProcessor(modifiers, 'warn')

      expect(() => processor.prepare({ unknown: 'value' })).not.toThrow()
    })

    it('should skip validation entirely in off mode', () => {
      const processor = createProcessor(modifiers, 'off')

      expect(() => processor.prepare({ unknown: 'value' })).not.toThrow()
    })

    it('should throw on non-string input values', () => {
      const processor = createProcessor(modifiers, 'error')

      expect(() => processor.prepare({ theme: 123 as unknown as string })).toThrow()
    })
  })

  describe('edge cases', () => {
    it('should handle no modifiers defined', () => {
      const processor = createProcessor(undefined)
      const result = processor.prepare({})

      expect(result.normalizedInputs).toEqual({})
      expect(result.resolvedInputs).toEqual({})
    })

    it('should throw when inputs given but no modifiers defined', () => {
      const processor = createProcessor(undefined, 'error')

      expect(() => processor.prepare({ theme: 'dark' })).toThrow('No modifiers defined')
    })

    it('should use first context as default when no default specified', () => {
      const noDefault = createModifiers({
        Theme: { contexts: { Light: [], Dark: [] } },
      })
      const processor = createProcessor(noDefault, 'warn')
      const result = processor.prepare({})

      expect(result.normalizedInputs.theme).toBe('light')
    })
  })
})
