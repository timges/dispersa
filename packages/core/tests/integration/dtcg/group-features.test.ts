import { describe, expect, it } from 'vitest'
import { TokenCollection } from '../../../src'
import { AliasResolver } from '../../../src/resolution/alias-resolver'
import { TokenParser } from '../../../src/tokens/token-parser'

const srgb = (red: number, green: number, blue: number) => ({
  colorSpace: 'srgb',
  components: [red, green, blue],
})

describe('DTCG Group Features', () => {
  describe('$root tokens (DTCG Section 6.2)', () => {
    it('should parse basic $root token in a group', async () => {
      const tokens: TokenCollection = {
        color: {
          accent: {
            $type: 'color',
            $root: {
              $value: srgb(0.867, 0, 0),
            },
          },
        },
      }

      const parser = new TokenParser()
      const flattened = parser.flatten(tokens)

      expect(flattened).toHaveProperty('color.accent.$root')
      expect(flattened['color.accent.$root'].$value).toEqual(srgb(0.867, 0, 0))
      expect(flattened['color.accent.$root'].path).toEqual(['color', 'accent', '$root'])
      expect(flattened['color.accent.$root'].name).toBe('color.accent.$root')
    })

    it('should allow $root alongside sibling tokens', async () => {
      const tokens: TokenCollection = {
        color: {
          accent: {
            $type: 'color',
            $root: {
              $value: srgb(0.867, 0, 0),
            },
            light: {
              $value: srgb(1, 0.133, 0.133),
            },
            dark: {
              $value: srgb(0.667, 0, 0),
            },
          },
        },
      }

      const parser = new TokenParser()
      const flattened = parser.flatten(tokens)

      expect(flattened).toHaveProperty('color.accent.$root')
      expect(flattened).toHaveProperty('color.accent.light')
      expect(flattened).toHaveProperty('color.accent.dark')
      expect(flattened['color.accent.$root'].$value).toEqual(srgb(0.867, 0, 0))
      expect(flattened['color.accent.light'].$value).toEqual(srgb(1, 0.133, 0.133))
      expect(flattened['color.accent.dark'].$value).toEqual(srgb(0.667, 0, 0))
    })

    it('should inherit type from parent group for $root token', async () => {
      const tokens: TokenCollection = {
        spacing: {
          $type: 'dimension',
          base: {
            $root: {
              $value: { value: 16, unit: 'px' },
            },
            small: {
              $value: { value: 8, unit: 'px' },
            },
          },
        },
      }

      const parser = new TokenParser()
      const flattened = parser.flatten(tokens)

      expect(flattened['spacing.base.$root'].$type).toBe('dimension')
      expect(flattened['spacing.base.small'].$type).toBe('dimension')
    })

    it('should resolve alias references to $root tokens', async () => {
      const tokens: TokenCollection = {
        color: {
          $type: 'color',
          primary: {
            $root: {
              $value: srgb(0, 0.4, 0.8),
            },
            light: {
              $value: srgb(0.2, 0.533, 0.867),
            },
          },
          button: {
            background: {
              $value: '{color.primary.$root}',
            },
          },
        },
      }

      const parser = new TokenParser()
      const flattened = parser.flatten(tokens)

      // Create alias resolver
      const aliasResolver = new AliasResolver()
      const resolved = aliasResolver.resolve(flattened)

      expect(resolved['color.button.background'].$value).toEqual(srgb(0, 0.4, 0.8))
      expect(resolved['color.button.background'].originalValue).toBe('{color.primary.$root}')
    })

    it('should validate that $root is a token, not a group', async () => {
      const tokens: TokenCollection = {
        color: {
          accent: {
            $type: 'color',
            $root: {
              // Invalid: $root cannot have children, only $value
              $value: { colorSpace: 'srgb', components: [0.867, 0, 0] },
              nested: {
                $value: { colorSpace: 'srgb', components: [1, 0, 0] },
              },
            },
          },
        },
      }

      const parser = new TokenParser()

      expect(() => parser.flatten(tokens)).toThrow(
        /Invalid structure.*\$root.*cannot have both a value and children/i,
      )
    })

    it('should reject other $ prefixed names except $root', async () => {
      const tokens: TokenCollection = {
        color: {
          $custom: {
            $value: { colorSpace: 'srgb', components: [1, 0, 0] },
          },
        },
      }

      const parser = new TokenParser()

      expect(() => parser.flatten(tokens)).toThrow(
        /Invalid token\/group name.*\$custom.*cannot start with '\$'/i,
      )
    })

    it('should allow a group with only $root token', async () => {
      const tokens: TokenCollection = {
        color: {
          primary: {
            $type: 'color',
            $root: {
              $value: { colorSpace: 'srgb', components: [0, 0.4, 0.8] },
            },
          },
        },
      }

      const parser = new TokenParser()
      const flattened = parser.flatten(tokens)

      expect(flattened).toHaveProperty('color.primary.$root')
      expect(Object.keys(flattened).length).toBe(1)
    })
  })

  describe('$extends basic functionality (DTCG Section 6.4)', () => {
    it('should extend a group and inherit all tokens', () => {
      const tokens: TokenCollection = {
        button: {
          $type: 'color',
          background: {
            $value: { colorSpace: 'srgb', components: [0, 0.4, 0.8] },
          },
          text: {
            $value: { colorSpace: 'srgb', components: [1, 1, 1] },
          },
        },
        'button-primary': {
          $extends: '{button}',
        },
      }

      const parser = new TokenParser()
      const collection = parser.parseObject(tokens)
      const flattened = parser.flatten(collection)

      // button-primary should inherit all tokens from button
      expect(flattened).toHaveProperty('button-primary.background')
      expect(flattened).toHaveProperty('button-primary.text')
      expect(flattened['button-primary.background'].$value).toEqual(srgb(0, 0.4, 0.8))
      expect(flattened['button-primary.text'].$value).toEqual(srgb(1, 1, 1))
    })

    it('should override inherited tokens with local definitions', () => {
      const tokens: TokenCollection = {
        button: {
          $type: 'color',
          background: {
            $value: { colorSpace: 'srgb', components: [0, 0.4, 0.8] },
          },
          text: {
            $value: { colorSpace: 'srgb', components: [1, 1, 1] },
          },
        },
        'button-primary': {
          $extends: '{button}',
          background: {
            $value: { colorSpace: 'srgb', components: [0.8, 0, 0.4] },
          },
        },
      }

      const parser = new TokenParser()
      const collection = parser.parseObject(tokens)
      const flattened = parser.flatten(collection)

      // Override should work
      expect(flattened['button-primary.background'].$value).toEqual(srgb(0.8, 0, 0.4))
      // Inherited token should remain
      expect(flattened['button-primary.text'].$value).toEqual(srgb(1, 1, 1))
    })

    it('should add new tokens alongside inherited ones', () => {
      const tokens: TokenCollection = {
        button: {
          $type: 'color',
          background: {
            $value: srgb(0, 0.4, 0.8),
          },
          text: {
            $value: srgb(1, 1, 1),
          },
        },
        'button-primary': {
          $extends: '{button}',
          border: {
            $value: srgb(0, 0.267, 0.6),
          },
        },
      }

      const parser = new TokenParser()
      const collection = parser.parseObject(tokens)
      const flattened = parser.flatten(collection)

      // Inherited tokens
      expect(flattened['button-primary.background'].$value).toEqual(srgb(0, 0.4, 0.8))
      expect(flattened['button-primary.text'].$value).toEqual(srgb(1, 1, 1))
      // New token
      expect(flattened['button-primary.border'].$value).toEqual(srgb(0, 0.267, 0.6))
    })

    it('should inherit group properties like $type', () => {
      const tokens: TokenCollection = {
        colors: {
          $type: 'color',
          primary: {
            $value: srgb(0, 0.4, 0.8),
          },
        },
        'colors-dark': {
          $extends: '{colors}',
        },
      }

      const parser = new TokenParser()
      const collection = parser.parseObject(tokens)
      const flattened = parser.flatten(collection)

      // Type should be inherited
      expect(flattened['colors-dark.primary'].$type).toBe('color')
    })
  })

  describe('$extends complex scenarios', () => {
    it('should support multi-level inheritance (A extends B extends C)', () => {
      const tokens: TokenCollection = {
        base: {
          $type: 'color',
          color: {
            $value: srgb(0, 0.4, 0.8),
          },
        },
        extended: {
          $extends: '{base}',
          spacing: {
            $type: 'dimension',
            $value: { value: 16, unit: 'px' },
          },
        },
        final: {
          $extends: '{extended}',
          border: {
            $type: 'border',
            $value: {
              color: srgb(0, 0, 0),
              width: { value: 1, unit: 'px' },
              style: 'solid',
            },
          },
        },
      }

      const parser = new TokenParser()
      const collection = parser.parseObject(tokens)
      const flattened = parser.flatten(collection)

      // Final should have all tokens from the chain
      expect(flattened['final.color'].$value).toEqual(srgb(0, 0.4, 0.8)) // from base
      expect(flattened['final.spacing'].$value).toEqual({ value: 16, unit: 'px' }) // from extended
      expect(flattened['final.border'].$value).toEqual({
        color: srgb(0, 0, 0),
        width: { value: 1, unit: 'px' },
        style: 'solid',
      }) // from final
    })

    it('should allow sibling groups to extend the same parent', () => {
      const tokens: TokenCollection = {
        button: {
          $type: 'color',
          background: {
            $value: srgb(0, 0.4, 0.8),
          },
        },
        'button-primary': {
          $extends: '{button}',
          background: {
            $value: srgb(0.8, 0, 0.4),
          },
        },
        'button-secondary': {
          $extends: '{button}',
          background: {
            $value: srgb(0.4, 0.4, 0.4),
          },
        },
      }

      const parser = new TokenParser()
      const collection = parser.parseObject(tokens)
      const flattened = parser.flatten(collection)

      expect(flattened['button-primary.background'].$value).toEqual(srgb(0.8, 0, 0.4))
      expect(flattened['button-secondary.background'].$value).toEqual(srgb(0.4, 0.4, 0.4))
    })

    it('should handle nested group overrides correctly', () => {
      const tokens: TokenCollection = {
        input: {
          $type: 'dimension',
          field: {
            width: {
              $value: { value: 100, unit: 'px' },
            },
            height: {
              $value: { value: 40, unit: 'px' },
            },
          },
        },
        'input-large': {
          $extends: '{input}',
          field: {
            height: {
              $value: { value: 60, unit: 'px' },
            },
          },
        },
      }

      const parser = new TokenParser()
      const collection = parser.parseObject(tokens)
      const flattened = parser.flatten(collection)

      // Overridden nested token
      expect(flattened['input-large.field.height'].$value).toEqual({ value: 60, unit: 'px' })
      // Inherited nested token
      expect(flattened['input-large.field.width'].$value).toEqual({ value: 100, unit: 'px' })
    })

    it('should support JSON Pointer syntax for $extends', () => {
      const tokens: TokenCollection = {
        button: {
          $type: 'color',
          background: {
            $value: srgb(0, 0.4, 0.8),
          },
        },
        'button-primary': {
          $extends: '#/button',
        },
      }

      const parser = new TokenParser()
      const collection = parser.parseObject(tokens)
      const flattened = parser.flatten(collection)

      expect(flattened['button-primary.background'].$value).toEqual(srgb(0, 0.4, 0.8))
    })
  })

  describe('$extends circular reference detection (DTCG Section 6.4.4)', () => {
    it('should detect direct circular reference (A → A)', () => {
      const tokens: TokenCollection = {
        button: {
          $extends: '{button}',
          background: {
            $value: srgb(0, 0.4, 0.8),
          },
        },
      }

      const parser = new TokenParser()

      expect(() => parser.parseObject(tokens)).toThrow(/circular.*button.*button/i)
    })

    it('should detect two-level circular reference (A → B → A)', () => {
      const tokens: TokenCollection = {
        groupA: {
          $extends: '{groupB}',
          token: {
            $type: 'number',
            $value: 1,
          },
        },
        groupB: {
          $extends: '{groupA}',
          token: {
            $type: 'number',
            $value: 2,
          },
        },
      }

      const parser = new TokenParser()

      expect(() => parser.parseObject(tokens)).toThrow(/circular/i)
    })

    it('should detect three-level circular reference (A → B → C → A)', () => {
      const tokens: TokenCollection = {
        a: {
          $extends: '{b}',
        },
        b: {
          $extends: '{c}',
        },
        c: {
          $extends: '{a}',
        },
      }

      const parser = new TokenParser()

      expect(() => parser.parseObject(tokens)).toThrow(/circular/i)
    })

    it('should provide clear error messages with the circular path', () => {
      const tokens: TokenCollection = {
        a: {
          $extends: '{b}',
        },
        b: {
          $extends: '{c}',
        },
        c: {
          $extends: '{a}',
        },
      }

      const parser = new TokenParser()

      try {
        parser.parseObject(tokens)
        expect.fail('Should have thrown error')
      } catch (error: any) {
        // Check that error message includes the circular path
        expect(error.message).toMatch(/circular/i)
        expect(error.message).toMatch(/a.*b.*c.*a/i)
      }
    })
  })

  describe('$extends edge cases', () => {
    it('should handle empty group extension', () => {
      const tokens: TokenCollection = {
        base: {
          $type: 'color',
        },
        extended: {
          $extends: '{base}',
          primary: {
            $value: srgb(0, 0.4, 0.8),
          },
        },
      }

      const parser = new TokenParser()
      const collection = parser.parseObject(tokens)
      const flattened = parser.flatten(collection)

      expect(flattened['extended.primary'].$value).toEqual(srgb(0, 0.4, 0.8))
      expect(flattened['extended.primary'].$type).toBe('color')
    })

    it('should support extending a group with $root token', () => {
      const tokens: TokenCollection = {
        color: {
          accent: {
            $type: 'color',
            $root: {
              $value: srgb(0.867, 0, 0),
            },
            light: {
              $value: srgb(1, 0.133, 0.133),
            },
          },
        },
        'color-override': {
          $extends: '{color.accent}',
        },
      }

      const parser = new TokenParser()
      const collection = parser.parseObject(tokens)
      const flattened = parser.flatten(collection)

      expect(flattened['color-override.$root'].$value).toEqual(srgb(0.867, 0, 0))
      expect(flattened['color-override.$root'].$type).toBe('color')
      expect(flattened['color-override.light'].$value).toEqual(srgb(1, 0.133, 0.133))
      expect(flattened['color-override.light'].$type).toBe('color')
    })

    it('should throw error when extending non-existent group', () => {
      const tokens: TokenCollection = {
        button: {
          $extends: '{nonexistent}',
          background: {
            $value: srgb(0, 0.4, 0.8),
          },
        },
      }

      const parser = new TokenParser()

      expect(() => parser.parseObject(tokens)).toThrow(/cannot find.*nonexistent/i)
    })

    it('should throw error when $extends references a token instead of group', () => {
      const tokens: TokenCollection = {
        color: {
          primary: {
            $value: srgb(0, 0.4, 0.8),
          },
        },
        button: {
          $extends: '{color.primary}',
        },
      }

      const parser = new TokenParser()

      expect(() => parser.parseObject(tokens)).toThrow(/token, not a group/i)
    })
  })
})
