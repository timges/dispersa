/**
 * @fileoverview Built-in name transforms using change-case library for robust case conversion
 */

import { ResolvedToken } from '@tokens/types'
import { camelCase, kebabCase, snakeCase, pascalCase, constantCase } from 'change-case'

import type { Transform } from '../types'

/**
 * Convert token name to camelCase
 */
export function nameCamelCase(): Transform {
  return {
    transform: (token: ResolvedToken) => {
      const name = camelCase(token.path.join(' '))
      return {
        ...token,
        name,
      }
    },
  }
}

/**
 * Convert token name to kebab-case
 */
export function nameKebabCase(): Transform {
  return {
    transform: (token: ResolvedToken) => {
      const name = kebabCase(token.path.join(' '))
      return {
        ...token,
        name,
      }
    },
  }
}

/**
 * Convert token name to snake_case
 */
export function nameSnakeCase(): Transform {
  return {
    transform: (token: ResolvedToken) => {
      const name = snakeCase(token.path.join(' '))
      return {
        ...token,
        name,
      }
    },
  }
}

/**
 * Convert token name to PascalCase
 */
export function namePascalCase(): Transform {
  return {
    transform: (token: ResolvedToken) => {
      const name = pascalCase(token.path.join(' '))
      return {
        ...token,
        name,
      }
    },
  }
}

/**
 * Convert token name to CONSTANT_CASE
 */
export function nameConstantCase(): Transform {
  return {
    transform: (token: ResolvedToken) => {
      const name = constantCase(token.path.join(' '))
      return {
        ...token,
        name,
      }
    },
  }
}

/**
 * Add prefix to token name
 *
 * @example
 * ```typescript
 * // Add 'ds-' prefix to all token names
 * transforms: [namePrefix('ds-')]
 * // 'color.primary' becomes 'ds-color.primary'
 * ```
 */
export function namePrefix(prefix: string): Transform {
  return {
    transform: (token: ResolvedToken) => {
      return {
        ...token,
        name: `${prefix}${token.name}`,
      }
    },
  }
}

/**
 * Add suffix to token name
 *
 * @example
 * ```typescript
 * // Add '-token' suffix to all token names
 * transforms: [nameSuffix('-token')]
 * // 'color.primary' becomes 'color.primary-token'
 * ```
 */
export function nameSuffix(suffix: string): Transform {
  return {
    transform: (token: ResolvedToken) => {
      return {
        ...token,
        name: `${token.name}${suffix}`,
      }
    },
  }
}

/**
 * Convert token name to CSS custom property format (--name)
 */
export function nameCssVar(): Transform {
  return {
    transform: (token: ResolvedToken) => {
      const kebabName = token.path
        .map((part) => part.replace(/[^a-zA-Z0-9-]/g, '').toLowerCase())
        .join('-')

      return {
        ...token,
        name: `--${kebabName}`,
      }
    },
  }
}
