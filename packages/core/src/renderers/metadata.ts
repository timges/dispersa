/**
 * @license MIT
 * Copyright (c) 2025-present Dispersa Contributors
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

/**
 * @fileoverview Shared utilities for consistent metadata formatting across renderers
 */

import type { ResolvedToken } from '@tokens/types'

export type CommentFormat = 'css' | 'js' | 'swift' | 'kotlin' | 'tailwind'

function sanitizeText(text: string, format: CommentFormat): string {
  switch (format) {
    case 'css':
    case 'tailwind':
      return text.replace(/\*\//g, '*\\/').replace(/\r?\n/g, ' ').trim()
    case 'kotlin':
      return text.replace(/\*\//g, '* /').replace(/\r?\n/g, ' ').trim()
    case 'js':
    case 'swift':
      return text.replace(/\r?\n/g, ' ').trim()
    default:
      return text.trim()
  }
}

function buildDeprecationText(token: ResolvedToken): string {
  if (token.$deprecated == null || token.$deprecated === false) {
    return ''
  }

  const msg = typeof token.$deprecated === 'string' ? token.$deprecated : ''
  return msg ? `DEPRECATED: ${msg}` : 'DEPRECATED'
}

export function buildTokenDescriptionComment(
  token: ResolvedToken,
  format: CommentFormat,
): string | undefined {
  if (!token.$description || token.$description === '') {
    return undefined
  }

  const text = sanitizeText(token.$description, format)

  switch (format) {
    case 'css':
    case 'tailwind':
      return `/* ${text} */`
    case 'js':
      return `// ${text}`
    case 'swift':
      return `/// ${text}`
    case 'kotlin':
      return `/** ${text} */`
    default:
      return undefined
  }
}

export function buildTokenDeprecationComment(
  token: ResolvedToken,
  format: CommentFormat,
): string | undefined {
  const text = buildDeprecationText(token)
  if (!text) {
    return undefined
  }

  switch (format) {
    case 'css':
    case 'tailwind':
      return `/* ${text} */`
    case 'js':
      return `// ${text}`
    case 'swift':
      return `/// ${text}`
    case 'kotlin':
      return `/** ${text} */`
    default:
      return undefined
  }
}

export function buildSetComment(setName: string, description?: string): string {
  if (description) {
    return `/* Set: ${setName} */\n/* ${sanitizeText(description, 'css')} */`
  }
  return `/* Set: ${setName} */`
}

export function buildModifierComment(modifier: string, context: string): string {
  return `/* Modifier: ${modifier}=${context} */`
}

export function buildSwiftDeprecationAttribute(token: ResolvedToken): string | undefined {
  if (token.$deprecated == null || token.$deprecated === false) {
    return undefined
  }

  const msg = typeof token.$deprecated === 'string' ? token.$deprecated : ''
  if (msg) {
    return `@available(*, deprecated, message: "${sanitizeText(msg, 'swift')}")`
  }
  return '@available(*, deprecated)'
}

export function buildKotlinDeprecationAnnotation(token: ResolvedToken): string | undefined {
  if (token.$deprecated == null || token.$deprecated === false) {
    return undefined
  }

  const msg = typeof token.$deprecated === 'string' ? token.$deprecated : ''
  if (msg) {
    return `@Deprecated(message = "${sanitizeText(msg, 'kotlin')}")`
  }
  return '@Deprecated'
}
