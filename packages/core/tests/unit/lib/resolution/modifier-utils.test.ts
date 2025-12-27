import { describe, expect, it } from 'vitest'

import { extractModifierInfo } from '../../../../src/lib/resolution/modifier-utils'
import type { ResolverDocument } from '../../../../src/lib/resolution/resolution.types'

function createResolver(
  modifiers: Record<string, { default?: string; contexts: Record<string, unknown[]> }>,
): ResolverDocument {
  return {
    version: '2025.10',
    modifiers: modifiers as ResolverDocument['modifiers'],
    resolutionOrder: [],
  }
}

describe('extractModifierInfo', () => {
  describe('when one modifier differs from default', () => {
    it('returns the differing modifier', () => {
      const resolver = createResolver({
        theme: { default: 'light', contexts: { light: [], dark: [] } },
        platform: { default: 'web', contexts: { web: [], mobile: [] } },
      })

      const [modifier, context, defaultContext] = extractModifierInfo(
        { theme: 'dark', platform: 'web' },
        resolver,
      )

      expect(modifier).toBe('theme')
      expect(context).toBe('dark')
      expect(defaultContext).toBe('light')
    })
  })

  describe('when multiple modifiers differ from default', () => {
    it('returns the first differing modifier', () => {
      const resolver = createResolver({
        theme: { default: 'light', contexts: { light: [], dark: [] } },
        platform: { default: 'web', contexts: { web: [], mobile: [] } },
      })

      const [modifier, context, defaultContext] = extractModifierInfo(
        { theme: 'dark', platform: 'mobile' },
        resolver,
      )

      expect(modifier).toBe('theme')
      expect(context).toBe('dark')
      expect(defaultContext).toBe('light')
    })
  })

  describe('when all inputs match defaults (base permutation)', () => {
    it('returns the first modifier with its current value', () => {
      const resolver = createResolver({
        theme: { default: 'light', contexts: { light: [], dark: [] } },
        platform: { default: 'web', contexts: { web: [], mobile: [] } },
      })

      const [modifier, context, defaultContext] = extractModifierInfo(
        { theme: 'light', platform: 'web' },
        resolver,
      )

      expect(modifier).toBe('theme')
      expect(context).toBe('light')
      expect(defaultContext).toBe('light')
    })
  })

  describe('when modifier has no explicit default', () => {
    it('uses the first context key as default', () => {
      const resolver = createResolver({
        theme: { contexts: { light: [], dark: [] } },
      })

      const [modifier, context, defaultContext] = extractModifierInfo({ theme: 'dark' }, resolver)

      expect(modifier).toBe('theme')
      expect(context).toBe('dark')
      expect(defaultContext).toBe('light')
    })

    it('returns empty default when contexts are empty', () => {
      const resolver = createResolver({
        theme: { contexts: {} },
      })

      const [modifier, context, defaultContext] = extractModifierInfo({ theme: 'dark' }, resolver)

      expect(modifier).toBe('theme')
      expect(context).toBe('dark')
      expect(defaultContext).toBe('')
    })
  })

  describe('when modifierInputs is empty', () => {
    it('returns empty strings for all values', () => {
      const resolver = createResolver({
        theme: { default: 'light', contexts: { light: [], dark: [] } },
      })

      const [modifier, context, defaultContext] = extractModifierInfo({}, resolver)

      expect(modifier).toBe('')
      expect(context).toBe('')
      expect(defaultContext).toBe('')
    })
  })

  describe('when resolver has no modifiers', () => {
    it('returns first input modifier with empty default', () => {
      const resolver: ResolverDocument = {
        version: '2025.10',
        resolutionOrder: [],
      }

      const [modifier, context, defaultContext] = extractModifierInfo({ theme: 'dark' }, resolver)

      expect(modifier).toBe('theme')
      expect(context).toBe('dark')
      expect(defaultContext).toBe('')
    })

    it('handles empty inputs with no modifiers', () => {
      const resolver: ResolverDocument = {
        version: '2025.10',
        resolutionOrder: [],
      }

      const [modifier, context, defaultContext] = extractModifierInfo({}, resolver)

      expect(modifier).toBe('')
      expect(context).toBe('')
      expect(defaultContext).toBe('')
    })
  })

  describe('when input has modifier not defined in resolver', () => {
    it('treats unknown modifier as differing from defaults', () => {
      const resolver = createResolver({
        theme: { default: 'light', contexts: { light: [], dark: [] } },
      })

      const [modifier, context, defaultContext] = extractModifierInfo(
        { theme: 'light', brand: 'partner-a' },
        resolver,
      )

      expect(modifier).toBe('brand')
      expect(context).toBe('partner-a')
      expect(defaultContext).toBe('')
    })
  })

  describe('with three modifiers where only the last differs', () => {
    it('returns the last differing modifier', () => {
      const resolver = createResolver({
        brand: { default: 'primary', contexts: { primary: [], partner: [] } },
        theme: { default: 'light', contexts: { light: [], dark: [] } },
        platform: { default: 'web', contexts: { web: [], mobile: [] } },
      })

      const [modifier, context, defaultContext] = extractModifierInfo(
        { brand: 'primary', theme: 'light', platform: 'mobile' },
        resolver,
      )

      expect(modifier).toBe('platform')
      expect(context).toBe('mobile')
      expect(defaultContext).toBe('web')
    })
  })
})
