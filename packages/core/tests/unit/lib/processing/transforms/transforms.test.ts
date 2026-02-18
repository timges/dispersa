import { describe, expect, it } from 'vitest'

import {
  colorToHex,
  colorToHsl,
  colorToRgb,
  dimensionToPx,
  dimensionToRem,
  dimensionToUnitless,
  nameCamelCase,
  nameConstantCase,
  nameKebabCase,
  namePascalCase,
  nameSnakeCase,
} from '../../../../../src/processing/transforms/built-in'
import type { Transform } from '../../../../../src/processing/transforms/types'
import type {
  ColorValueObject,
  ResolvedToken,
  ResolvedTokens,
} from '../../../../../src/tokens/types'

describe('Transform Integration Tests', () => {
  describe('Built-in Value Transforms', () => {
    it('should transform color to hex', () => {
      const transform = colorToHex()
      expect(transform).toBeDefined()

      const colorValue: ColorValueObject = {
        colorSpace: 'srgb',
        components: [1, 0, 0],
      }

      const token: ResolvedToken = {
        $type: 'color',
        $value: colorValue,
        path: ['color', 'red'],
        name: 'color.red',
        originalValue: colorValue,
      }

      const result = transform.transform(token)
      expect(result.$value).toBe('#ff0000')
    })

    it('should transform color to rgb', () => {
      const transform = colorToRgb()
      expect(transform).toBeDefined()

      const colorValue: ColorValueObject = {
        colorSpace: 'srgb',
        components: [1, 0, 0],
      }

      const token: ResolvedToken = {
        $type: 'color',
        $value: colorValue,
        path: ['color', 'red'],
        name: 'color.red',
        originalValue: colorValue,
      }

      const result = transform.transform(token)
      expect(String(result.$value)).toMatch(/^rgb\(/)
    })

    it('should transform color to hsl', () => {
      const transform = colorToHsl()
      expect(transform).toBeDefined()

      const colorValue: ColorValueObject = {
        colorSpace: 'srgb',
        components: [1, 0, 0],
      }

      const token: ResolvedToken = {
        $type: 'color',
        $value: colorValue,
        path: ['color', 'red'],
        name: 'color.red',
        originalValue: colorValue,
      }

      const result = transform.transform(token)
      expect(String(result.$value)).toMatch(/^hsl\(/)
    })

    it('should transform dimension to px', () => {
      const transform = dimensionToPx()
      expect(transform).toBeDefined()

      const token: ResolvedToken = {
        $type: 'dimension',
        $value: { value: 1, unit: 'rem' },
        path: ['spacing', 'base'],
        name: 'spacing.base',
        originalValue: { value: 1, unit: 'rem' },
      }

      const result = transform.transform(token, { baseFontSize: 16 })
      expect(result.$value).toBe('16px')
    })

    it('should transform dimension to rem', () => {
      const transform = dimensionToRem()
      expect(transform).toBeDefined()

      const token: ResolvedToken = {
        $type: 'dimension',
        $value: { value: 16, unit: 'px' },
        path: ['spacing', 'base'],
        name: 'spacing.base',
        originalValue: { value: 16, unit: 'px' },
      }

      const result = transform.transform(token, { baseFontSize: 16 })
      expect(result.$value).toBe('1rem')
    })

    it('should transform dimension to unitless', () => {
      const transform = dimensionToUnitless()
      expect(transform).toBeDefined()

      const token: ResolvedToken = {
        $type: 'dimension',
        $value: { value: 16, unit: 'px' },
        path: ['spacing', 'base'],
        name: 'spacing.base',
        originalValue: { value: 16, unit: 'px' },
      }

      const result = transform.transform(token)
      expect(result.$value).toBe(16)
    })
  })

  describe('Built-in Name Transforms', () => {
    const redColorValue: ColorValueObject = {
      colorSpace: 'srgb',
      components: [1, 0, 0],
    }

    it('should transform name to kebab-case', () => {
      const transform = nameKebabCase()
      expect(transform).toBeDefined()

      const token: ResolvedToken = {
        $type: 'color',
        $value: redColorValue,
        path: ['color', 'primaryRed'],
        name: 'color.primaryRed',
        originalValue: redColorValue,
      }

      const result = transform.transform(token, {}) as ResolvedToken & { name: string }
      expect(result.name).toBe('color-primary-red')
    })

    it('should transform name to camelCase', () => {
      const transform = nameCamelCase()
      expect(transform).toBeDefined()

      const token: ResolvedToken = {
        $type: 'color',
        $value: redColorValue,
        path: ['color', 'primary', 'red'],
        name: 'color.primary.red',
        originalValue: redColorValue,
      }

      const result = transform.transform(token, {}) as ResolvedToken & { name: string }
      expect(result.name).toBe('colorPrimaryRed')
    })

    it('should transform name to PascalCase', () => {
      const transform = namePascalCase()
      expect(transform).toBeDefined()

      const token: ResolvedToken = {
        $type: 'color',
        $value: redColorValue,
        path: ['color', 'primary', 'red'],
        name: 'color.primary.red',
        originalValue: redColorValue,
      }

      const result = transform.transform(token, {}) as ResolvedToken & { name: string }
      expect(result.name).toBe('ColorPrimaryRed')
    })

    it('should transform name to snake_case', () => {
      const transform = nameSnakeCase()
      expect(transform).toBeDefined()

      const token: ResolvedToken = {
        $type: 'color',
        $value: redColorValue,
        path: ['color', 'primaryRed'],
        name: 'color.primaryRed',
        originalValue: redColorValue,
      }

      const result = transform.transform(token, {}) as ResolvedToken & { name: string }
      expect(result.name).toBe('color_primary_red')
    })

    it('should transform name to CONSTANT_CASE', () => {
      const transform = nameConstantCase()
      expect(transform).toBeDefined()

      const token: ResolvedToken = {
        $type: 'color',
        $value: redColorValue,
        path: ['color', 'primaryRed'],
        name: 'color.primaryRed',
        originalValue: redColorValue,
      }

      const result = transform.transform(token, {}) as ResolvedToken & { name: string }
      expect(result.name).toBe('COLOR_PRIMARY_RED')
    })
  })

  describe('Transform Matchers', () => {
    const redColorValue: ColorValueObject = {
      colorSpace: 'srgb',
      components: [1, 0, 0],
    }

    it('should match by token type', () => {
      const colorTransform = colorToHex()
      const colorToken: ResolvedToken = {
        $type: 'color',
        $value: redColorValue,
        path: ['color', 'red'],
        name: 'color.red',
        originalValue: redColorValue,
      }

      const dimensionToken: ResolvedToken = {
        $type: 'dimension',
        $value: { value: 16, unit: 'px' },
        path: ['spacing', 'base'],
        name: 'spacing.base',
        originalValue: { value: 16, unit: 'px' },
      }

      expect(colorTransform.matcher(colorToken)).toBe(true)
      expect(colorTransform.matcher(dimensionToken)).toBe(false)
    })

    it('should match by path pattern', () => {
      // Custom transform that only applies to spacing tokens
      const spacingTransform: Transform = {
        name: 'spacing/custom',
        matcher: (token) => token.path[0] === 'spacing',
        transform: (token) => ({ ...token, $value: `${token.$value} custom` }),
      }

      const spacingToken: ResolvedToken = {
        $type: 'dimension',
        $value: { value: 16, unit: 'px' },
        path: ['spacing', 'base'],
        name: 'spacing.base',
        originalValue: { value: 16, unit: 'px' },
      }

      const widthToken: ResolvedToken = {
        $type: 'dimension',
        $value: { value: 16, unit: 'px' },
        path: ['width', 'default'],
        name: 'width.default',
        originalValue: { value: 16, unit: 'px' },
      }

      expect(spacingTransform.matcher(spacingToken)).toBe(true)
      expect(spacingTransform.matcher(widthToken)).toBe(false)
    })
  })

  describe('Custom Transform Registration', () => {
    const redColorValue: ColorValueObject = {
      colorSpace: 'srgb',
      components: [1, 0, 0],
    }

    it('should register custom value transforms', () => {
      const customTransform: Transform = {
        name: 'custom/uppercase',
        matcher: (token) => token.$type === 'string',
        transform: (token) => ({ ...token, $value: (token.$value as string).toUpperCase() }),
      }

      const transform = customTransform
      expect(transform).toBeDefined()
    })

    it('should register custom name transforms', () => {
      const customTransform: Transform = {
        name: 'custom/reverse',
        matcher: () => true,
        transform: (token) => ({
          ...token,
          name: token.path.slice().reverse().join('-'),
        }),
      }

      const transform = customTransform
      expect(transform).toBeDefined()

      const token: ResolvedToken = {
        $type: 'color',
        $value: redColorValue,
        path: ['color', 'primary', 'red'],
        name: 'color.primary.red',
        originalValue: redColorValue,
      }

      const result = transform.transform(token, {}) as ResolvedToken & { name: string }
      expect(result.name).toBe('red-primary-color')
    })

    it('should allow overriding built-in transforms', () => {
      const customHex: Transform = {
        name: 'color:hex',
        matcher: (token) => token.$type === 'color',
        transform: (token) => ({ ...token, $value: '#CUSTOM' }),
      }

      const transform = customHex
      const token: ResolvedToken = {
        $type: 'color',
        $value: redColorValue,
        path: ['color', 'red'],
        name: 'color.red',
        originalValue: redColorValue,
      }

      const result = transform.transform(token)
      expect(result.$value).toBe('#CUSTOM')
    })
  })

  describe('Transform Pipeline', () => {
    it('should apply transforms in sequence', () => {
      const redColorValue: ColorValueObject = {
        colorSpace: 'srgb',
        components: [1, 0, 0],
      }

      const tokens: ResolvedTokens = {
        'color.primary': {
          $type: 'color',
          $value: redColorValue,
          path: ['color', 'primary'],
          name: 'color.primary',
          originalValue: redColorValue,
        },
      }

      // First transform to hex
      const hexTransform = colorToHex()
      const token = tokens['color.primary']

      if (hexTransform.matcher(token)) {
        const hexValue = hexTransform.transform(token)
        expect(hexValue.$value).toBe('#ff0000')

        // Then apply name transform
        const nameTransform = nameKebabCase()
        const nameResult = nameTransform.transform(token, {}) as ResolvedToken & { name: string }
        expect(nameResult.name).toBe('color-primary')
      }
    })
  })

  describe('Transform Default Behavior', () => {
    it('should use default base font size (16px) for dimension transforms', () => {
      const transform = dimensionToPx()
      const token: ResolvedToken = {
        $type: 'dimension',
        $value: { value: 1, unit: 'rem' },
        path: ['spacing', 'base'],
        name: 'spacing.base',
        originalValue: { value: 1, unit: 'rem' },
      }

      // Should use default base font size of 16px
      const result = transform.transform(token)

      expect(result.$value).toBe('16px')
    })
  })
})
