import { describe, expect, it } from 'vitest'

import { GroupExtensionResolver } from '../../../../src/tokens/group-extension-resolver'
import type { TokenCollection } from '../../../../src/tokens/types'

function createResolver() {
  return new GroupExtensionResolver()
}

describe('GroupExtensionResolver', () => {
  describe('resolveExtensions()', () => {
    it('returns tokens at root level unchanged', () => {
      const resolver = createResolver()
      const collection: TokenCollection = {
        'color-primary': {
          $value: { colorSpace: 'srgb', components: [0, 0.4, 0.8] },
          $type: 'color',
        },
      }

      const result = resolver.resolveExtensions(collection)
      expect(result['color-primary']).toEqual({
        $value: { colorSpace: 'srgb', components: [0, 0.4, 0.8] },
        $type: 'color',
      })
    })

    it('returns groups without $extends unchanged', () => {
      const resolver = createResolver()
      const collection: TokenCollection = {
        colors: {
          primary: { $value: { colorSpace: 'srgb', components: [0, 0.4, 0.8] }, $type: 'color' },
          secondary: { $value: { colorSpace: 'srgb', components: [0, 0.2, 0.4] }, $type: 'color' },
        },
      }

      const result = resolver.resolveExtensions(collection)
      expect(result.colors).toEqual(collection.colors)
    })

    it('resolves basic $extends with alias syntax', () => {
      const resolver = createResolver()
      const collection: TokenCollection = {
        base: {
          primary: { $value: { colorSpace: 'srgb', components: [0, 0.4, 0.8] }, $type: 'color' },
          secondary: { $value: { colorSpace: 'srgb', components: [0, 0.2, 0.4] }, $type: 'color' },
        },
        derived: {
          $extends: '{base}',
          tertiary: { $value: { colorSpace: 'srgb', components: [0, 0.4, 0.2] }, $type: 'color' },
        },
      }

      const result = resolver.resolveExtensions(collection)
      const derived = result.derived as Record<string, any>

      // Should have inherited tokens
      expect(derived.primary).toEqual({
        $value: { colorSpace: 'srgb', components: [0, 0.4, 0.8] },
        $type: 'color',
      })
      expect(derived.secondary).toEqual({
        $value: { colorSpace: 'srgb', components: [0, 0.2, 0.4] },
        $type: 'color',
      })
      // Plus local tokens
      expect(derived.tertiary).toEqual({
        $value: { colorSpace: 'srgb', components: [0, 0.4, 0.2] },
        $type: 'color',
      })
    })

    it('resolves $extends with JSON Pointer syntax', () => {
      const resolver = createResolver()
      const collection: TokenCollection = {
        base: {
          primary: { $value: { colorSpace: 'srgb', components: [0, 0.4, 0.8] }, $type: 'color' },
        },
        derived: {
          $extends: '#/base',
          extra: { $value: { colorSpace: 'srgb', components: [1, 0, 0] }, $type: 'color' },
        },
      }

      const result = resolver.resolveExtensions(collection)
      const derived = result.derived as Record<string, any>

      expect(derived.primary).toEqual({
        $value: { colorSpace: 'srgb', components: [0, 0.4, 0.8] },
        $type: 'color',
      })
      expect(derived.extra).toEqual({
        $value: { colorSpace: 'srgb', components: [1, 0, 0] },
        $type: 'color',
      })
    })

    it('local tokens override inherited tokens at same path', () => {
      const resolver = createResolver()
      const collection: TokenCollection = {
        base: {
          primary: { $value: { colorSpace: 'srgb', components: [0, 0.4, 0.8] }, $type: 'color' },
          secondary: { $value: { colorSpace: 'srgb', components: [0, 0.2, 0.4] }, $type: 'color' },
        },
        derived: {
          $extends: '{base}',
          primary: { $value: { colorSpace: 'srgb', components: [1, 0, 0] }, $type: 'color' },
        },
      }

      const result = resolver.resolveExtensions(collection)
      const derived = result.derived as Record<string, any>

      // Local overrides inherited
      expect(derived.primary).toEqual({
        $value: { colorSpace: 'srgb', components: [1, 0, 0] },
        $type: 'color',
      })
      // Inherited preserved
      expect(derived.secondary).toEqual({
        $value: { colorSpace: 'srgb', components: [0, 0.2, 0.4] },
        $type: 'color',
      })
    })

    it('deep merges nested groups', () => {
      const resolver = createResolver()
      const collection: TokenCollection = {
        base: {
          buttons: {
            primary: { $value: { colorSpace: 'srgb', components: [0, 0.4, 0.8] }, $type: 'color' },
            secondary: {
              $value: { colorSpace: 'srgb', components: [0, 0.2, 0.4] },
              $type: 'color',
            },
          },
        },
        derived: {
          $extends: '{base}',
          buttons: {
            primary: { $value: { colorSpace: 'srgb', components: [1, 0, 0] }, $type: 'color' },
            tertiary: { $value: { colorSpace: 'srgb', components: [0, 1, 0] }, $type: 'color' },
          },
        },
      }

      const result = resolver.resolveExtensions(collection)
      const buttons = (result.derived as any).buttons

      expect(buttons.primary).toEqual({
        $value: { colorSpace: 'srgb', components: [1, 0, 0] },
        $type: 'color',
      })
      expect(buttons.secondary).toEqual({
        $value: { colorSpace: 'srgb', components: [0, 0.2, 0.4] },
        $type: 'color',
      })
      expect(buttons.tertiary).toEqual({
        $value: { colorSpace: 'srgb', components: [0, 1, 0] },
        $type: 'color',
      })
    })

    it('resolves multi-level inheritance (chain)', () => {
      const resolver = createResolver()
      const collection: TokenCollection = {
        grandparent: {
          a: { $value: 'a', $type: 'color' },
        },
        parent: {
          $extends: '{grandparent}',
          b: { $value: 'b', $type: 'color' },
        },
        child: {
          $extends: '{parent}',
          c: { $value: 'c', $type: 'color' },
        },
      }

      const result = resolver.resolveExtensions(collection)
      const child = result.child as Record<string, any>

      expect(child.a).toEqual({ $value: 'a', $type: 'color' })
      expect(child.b).toEqual({ $value: 'b', $type: 'color' })
      expect(child.c).toEqual({ $value: 'c', $type: 'color' })
    })

    it('supports multiple groups extending the same parent', () => {
      const resolver = createResolver()
      const collection: TokenCollection = {
        base: {
          shared: { $value: { colorSpace: 'srgb', components: [0, 0, 0] }, $type: 'color' },
        },
        derivedA: {
          $extends: '{base}',
          onlyA: { $value: { colorSpace: 'srgb', components: [0.67, 0.67, 0.67] }, $type: 'color' },
        },
        derivedB: {
          $extends: '{base}',
          onlyB: { $value: { colorSpace: 'srgb', components: [0.73, 0.73, 0.73] }, $type: 'color' },
        },
      }

      const result = resolver.resolveExtensions(collection)
      const derivedA = result.derivedA as Record<string, any>
      const derivedB = result.derivedB as Record<string, any>

      expect(derivedA.shared).toEqual({
        $value: { colorSpace: 'srgb', components: [0, 0, 0] },
        $type: 'color',
      })
      expect(derivedA.onlyA).toEqual({
        $value: { colorSpace: 'srgb', components: [0.67, 0.67, 0.67] },
        $type: 'color',
      })
      expect(derivedA.onlyB).toBeUndefined()

      expect(derivedB.shared).toEqual({
        $value: { colorSpace: 'srgb', components: [0, 0, 0] },
        $type: 'color',
      })
      expect(derivedB.onlyB).toEqual({
        $value: { colorSpace: 'srgb', components: [0.73, 0.73, 0.73] },
        $type: 'color',
      })
      expect(derivedB.onlyA).toBeUndefined()
    })

    it('preserves group metadata ($description, $type)', () => {
      const resolver = createResolver()
      const collection: TokenCollection = {
        base: {
          $description: 'Base group',
          primary: { $value: { colorSpace: 'srgb', components: [0, 0.4, 0.8] }, $type: 'color' },
        },
        derived: {
          $extends: '{base}',
          $description: 'Derived group',
        },
      }

      const result = resolver.resolveExtensions(collection)
      const derived = result.derived as Record<string, any>

      // Local $description overrides inherited
      expect(derived.$description).toBe('Derived group')
      // Inherited tokens preserved
      expect(derived.primary).toEqual({
        $value: { colorSpace: 'srgb', components: [0, 0.4, 0.8] },
        $type: 'color',
      })
    })

    it('strips $extends from the output', () => {
      const resolver = createResolver()
      const collection: TokenCollection = {
        base: {
          primary: { $value: { colorSpace: 'srgb', components: [0, 0.4, 0.8] }, $type: 'color' },
        },
        derived: {
          $extends: '{base}',
        },
      }

      const result = resolver.resolveExtensions(collection)
      const derived = result.derived as Record<string, any>

      expect(derived.$extends).toBeUndefined()
      expect(derived.primary).toBeDefined()
    })
  })

  describe('error handling', () => {
    it('throws on circular reference', () => {
      const resolver = createResolver()
      const collection: TokenCollection = {
        a: {
          $extends: '{b}',
          tokenA: { $value: 'a', $type: 'color' },
        },
        b: {
          $extends: '{a}',
          tokenB: { $value: 'b', $type: 'color' },
        },
      }

      expect(() => resolver.resolveExtensions(collection)).toThrow(
        /Circular group extension detected/,
      )
    })

    it('throws on self-referencing group', () => {
      const resolver = createResolver()
      const collection: TokenCollection = {
        self: {
          $extends: '{self}',
          token: { $value: 'x', $type: 'color' },
        },
      }

      expect(() => resolver.resolveExtensions(collection)).toThrow(
        /Circular group extension detected/,
      )
    })

    it('throws when target group does not exist', () => {
      const resolver = createResolver()
      const collection: TokenCollection = {
        derived: {
          $extends: '{nonexistent}',
        },
      }

      expect(() => resolver.resolveExtensions(collection)).toThrow(/Cannot find target group/)
    })

    it('throws when target is a token instead of a group', () => {
      const resolver = createResolver()
      const collection: TokenCollection = {
        token: { $value: { colorSpace: 'srgb', components: [0, 0, 0] }, $type: 'color' },
        derived: {
          $extends: '{token}',
        },
      }

      expect(() => resolver.resolveExtensions(collection)).toThrow(/is a token, not a group/)
    })

    it('throws on invalid reference format', () => {
      const resolver = createResolver()
      const collection: TokenCollection = {
        derived: {
          $extends: 'invalid-format',
        },
      }

      expect(() => resolver.resolveExtensions(collection)).toThrow(/Invalid group reference format/)
    })
  })

  describe('nested group extensions', () => {
    it('resolves $extends in child groups', () => {
      const resolver = createResolver()
      const collection: TokenCollection = {
        shared: {
          bg: { $value: { colorSpace: 'srgb', components: [0, 0.27, 0.55] }, $type: 'color' },
        },
        component: {
          button: {
            $extends: '{shared}',
            fg: { $value: { colorSpace: 'srgb', components: [0, 0, 0] }, $type: 'color' },
          },
        },
      }

      const result = resolver.resolveExtensions(collection)
      const button = (result.component as any).button

      expect(button.bg).toEqual({
        $value: { colorSpace: 'srgb', components: [0, 0.27, 0.55] },
        $type: 'color',
      })
      expect(button.fg).toEqual({
        $value: { colorSpace: 'srgb', components: [0, 0, 0] },
        $type: 'color',
      })
    })

    it('resolves $extends referencing nested groups', () => {
      const resolver = createResolver()
      const collection: TokenCollection = {
        theme: {
          colors: {
            primary: { $value: { colorSpace: 'srgb', components: [0, 0.4, 0.8] }, $type: 'color' },
          },
        },
        overrides: {
          $extends: '{theme.colors}',
          secondary: { $value: { colorSpace: 'srgb', components: [0, 0.2, 0.4] }, $type: 'color' },
        },
      }

      const result = resolver.resolveExtensions(collection)
      const overrides = result.overrides as Record<string, any>

      expect(overrides.primary).toEqual({
        $value: { colorSpace: 'srgb', components: [0, 0.4, 0.8] },
        $type: 'color',
      })
      expect(overrides.secondary).toEqual({
        $value: { colorSpace: 'srgb', components: [0, 0.2, 0.4] },
        $type: 'color',
      })
    })
  })

  describe('edge cases', () => {
    it('handles empty collection', () => {
      const resolver = createResolver()
      const result = resolver.resolveExtensions({})
      expect(result).toEqual({})
    })

    it('handles group with only $extends and no local tokens', () => {
      const resolver = createResolver()
      const collection: TokenCollection = {
        base: {
          primary: { $value: { colorSpace: 'srgb', components: [0, 0.4, 0.8] }, $type: 'color' },
        },
        copy: {
          $extends: '{base}',
        },
      }

      const result = resolver.resolveExtensions(collection)
      const copy = result.copy as Record<string, any>

      expect(copy.primary).toEqual({
        $value: { colorSpace: 'srgb', components: [0, 0.4, 0.8] },
        $type: 'color',
      })
    })

    it('handles deeply nested path in findGroup', () => {
      const resolver = createResolver()
      const collection: TokenCollection = {
        a: {
          b: {
            c: {
              token: { $value: 'deep', $type: 'color' },
            },
          },
        },
        derived: {
          $extends: '{a.b.c}',
        },
      }

      const result = resolver.resolveExtensions(collection)
      const derived = result.derived as Record<string, any>

      expect(derived.token).toEqual({ $value: 'deep', $type: 'color' })
    })
  })
})
