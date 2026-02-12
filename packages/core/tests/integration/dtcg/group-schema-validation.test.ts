import { describe, it, expect, beforeEach } from 'vitest'
import { SchemaValidator } from '../../../src/validation/validator'

const srgb = (red: number, green: number, blue: number) => ({
  colorSpace: 'srgb',
  components: [red, green, blue],
})

describe('Group Schema Validation', () => {
  let validator: SchemaValidator

  beforeEach(() => {
    validator = new SchemaValidator()
  })

  describe('Valid group structures', () => {
    it('should validate group with $type property', () => {
      const group = {
        $type: 'color',
        primary: {
          $value: srgb(0, 0.4, 0.8),
        },
      }

      const errors = validator.validateGroup(group)
      expect(errors).toHaveLength(0)
    })

    it('should validate group with $description', () => {
      const group = {
        $description: 'Color tokens for the design system',
        primary: {
          $value: srgb(0, 0.4, 0.8),
        },
      }

      const errors = validator.validateGroup(group)
      expect(errors).toHaveLength(0)
    })

    it('should validate group with $deprecated as boolean', () => {
      const group = {
        $deprecated: true,
        old: {
          $value: srgb(1, 0, 0),
        },
      }

      const errors = validator.validateGroup(group)
      expect(errors).toHaveLength(0)
    })

    it('should validate group with $deprecated as string', () => {
      const group = {
        $deprecated: 'Use the new color tokens instead',
        old: {
          $value: srgb(1, 0, 0),
        },
      }

      const errors = validator.validateGroup(group)
      expect(errors).toHaveLength(0)
    })

    it('should validate group with $extensions', () => {
      const group = {
        $extensions: {
          'com.company': {
            category: 'brand',
          },
        },
        primary: {
          $value: srgb(0, 0.4, 0.8),
        },
      }

      const errors = validator.validateGroup(group)
      expect(errors).toHaveLength(0)
    })

    it('should validate group with $extends using alias format', () => {
      const group = {
        $extends: '{button}',
        background: {
          $value: srgb(0.8, 0, 0.4),
        },
      }

      const errors = validator.validateGroup(group)
      expect(errors).toHaveLength(0)
    })

    it('should validate group with $extends using JSON Pointer format', () => {
      const group = {
        $extends: '#/button',
        background: {
          $value: srgb(0.8, 0, 0.4),
        },
      }

      const errors = validator.validateGroup(group)
      expect(errors).toHaveLength(0)
    })

    it('should validate group with multiple properties', () => {
      const group = {
        $type: 'color',
        $description: 'Button color tokens',
        $deprecated: false,
        $extensions: {
          'com.company': { priority: 'high' },
        },
        $extends: '{base-button}',
        primary: {
          $value: srgb(0, 0.4, 0.8),
        },
      }

      const errors = validator.validateGroup(group)
      expect(errors).toHaveLength(0)
    })

    it('should validate empty group (no tokens, only metadata)', () => {
      const group = {
        $type: 'color',
        $description: 'Placeholder for future tokens',
      }

      const errors = validator.validateGroup(group)
      expect(errors).toHaveLength(0)
    })

    it('should validate group with $root token', () => {
      const group = {
        $type: 'color',
        $root: {
          $value: srgb(0.867, 0, 0),
        },
        light: {
          $value: srgb(1, 0.133, 0.133),
        },
      }

      const errors = validator.validateGroup(group)
      expect(errors).toHaveLength(0)
    })

    it('should validate nested groups', () => {
      const group = {
        $type: 'color',
        semantic: {
          success: {
            $value: srgb(0, 0.8, 0.4),
          },
          error: {
            $value: srgb(0.8, 0, 0),
          },
        },
      }

      const errors = validator.validateGroup(group)
      expect(errors).toHaveLength(0)
    })
  })

  describe('Invalid group structures', () => {
    it('should reject group with $value property', () => {
      const group = {
        $value: srgb(0, 0.4, 0.8),
        child: {
          $value: srgb(1, 0, 0),
        },
      }

      const errors = validator.validateGroup(group)
      expect(errors.length).toBeGreaterThan(0)
    })

    it('should reject group with $ref property', () => {
      const group = {
        $ref: '#/some/token',
        child: {
          $value: srgb(1, 0, 0),
        },
      }

      const errors = validator.validateGroup(group)
      expect(errors.length).toBeGreaterThan(0)
    })

    it('should reject group with invalid $type not in enum', () => {
      const group = {
        $type: 'invalidType',
        primary: {
          $value: srgb(0, 0.4, 0.8),
        },
      }

      const errors = validator.validateGroup(group)
      expect(errors.length).toBeGreaterThan(0)
    })

    it('should reject group with invalid $extends format', () => {
      const group = {
        $extends: 'invalid-reference-format',
        background: {
          $value: srgb(0.8, 0, 0.4),
        },
      }

      const errors = validator.validateGroup(group)
      expect(errors.length).toBeGreaterThan(0)
    })

    it('should reject group with $deprecated as number', () => {
      const group = {
        $deprecated: 123,
        old: {
          $value: srgb(1, 0, 0),
        },
      }

      const errors = validator.validateGroup(group)
      expect(errors.length).toBeGreaterThan(0)
    })
  })

  describe('validateTokenOrGroup smart validation', () => {
    it('should identify valid token', () => {
      const token = {
        $value: srgb(0, 0.4, 0.8),
        $type: 'color',
      }

      const result = validator.validateTokenOrGroup(token)
      expect(result.type).toBe('token')
      expect(result.errors).toHaveLength(0)
    })

    it('should identify valid group', () => {
      const group = {
        $type: 'color',
        primary: {
          $value: srgb(0, 0.4, 0.8),
        },
      }

      const result = validator.validateTokenOrGroup(group)
      expect(result.type).toBe('group')
      expect(result.errors).toHaveLength(0)
    })

    it('should identify invalid token with $value', () => {
      const token = {
        $value: srgb(0, 0.4, 0.8),
        $type: 'invalidType', // Invalid type
      }

      const result = validator.validateTokenOrGroup(token)
      expect(result.type).toBe('invalid')
      expect(result.message).toContain('$value/$ref')
    })

    it('should identify invalid group', () => {
      const group = {
        $type: 'invalidType',
        primary: {
          $value: srgb(0, 0.4, 0.8),
        },
      }

      const result = validator.validateTokenOrGroup(group)
      expect(result.type).toBe('invalid')
      expect(result.errors.length).toBeGreaterThan(0)
    })

    it('should prefer token validation when $value present', () => {
      const obj = {
        $value: srgb(0, 0.4, 0.8),
        $type: 'color',
      }

      const result = validator.validateTokenOrGroup(obj)
      expect(result.type).toBe('token')
    })

    it('should try group validation first when no $value/$ref', () => {
      const obj = {
        $type: 'color',
        $description: 'Test group',
      }

      const result = validator.validateTokenOrGroup(obj)
      expect(result.type).toBe('group')
    })

    it('should fallback to token validation if group validation fails', () => {
      const obj = {
        $type: 'color',
        // This could be either a malformed group or a token without $value
        // Since group validation will pass (no $value/$ref), it should be identified as group
      }

      const result = validator.validateTokenOrGroup(obj)
      // Empty group is valid
      expect(result.type).toBe('group')
    })

    it('should return helpful message when both validations fail', () => {
      const obj = {
        $type: 'invalidType',
        $extensions: 'wrong-type', // should be object
      }

      const result = validator.validateTokenOrGroup(obj)
      expect(result.type).toBe('invalid')
      expect(result.message).toBeDefined()
    })
  })

  describe('Edge cases', () => {
    it('should handle group with only $type', () => {
      const group = {
        $type: 'color',
      }

      const errors = validator.validateGroup(group)
      expect(errors).toHaveLength(0)
    })

    it('should handle group with $extends and $root token', () => {
      const group = {
        $extends: '{base}',
        $root: {
          $value: srgb(0, 0.4, 0.8),
        },
      }

      const errors = validator.validateGroup(group)
      expect(errors).toHaveLength(0)
    })

    it('should handle nested group with $extends', () => {
      const group = {
        components: {
          button: {
            $extends: '{base.button}',
            primary: {
              $value: srgb(0, 0.4, 0.8),
            },
          },
        },
      }

      const errors = validator.validateGroup(group)
      expect(errors).toHaveLength(0)
    })

    it('should accept all valid token types in $type enum', () => {
      const validTypes = [
        'color',
        'dimension',
        'fontFamily',
        'fontWeight',
        'duration',
        'cubicBezier',
        'number',
        'shadow',
        'typography',
        'border',
        'strokeStyle',
        'transition',
        'gradient',
      ]

      for (const type of validTypes) {
        const group = {
          $type: type,
          token: {
            $value: '{tokens.ref}',
          },
        }

        const errors = validator.validateGroup(group)
        expect(errors).toHaveLength(0)
      }
    })
  })
})
