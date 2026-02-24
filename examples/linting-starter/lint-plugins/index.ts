/**
 * @license MIT
 *
 * Custom lint plugin for design tokens
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import {
  type LintConfig,
  type LintPlugin,
  type LintRule,
  type LintRuleContext,
} from 'dispersa/lint'

const ColorPaletteMessages = {
  MISSING_TYPE: 'MISSING_TYPE',
  INVALID_COLOR_SPACE: 'INVALID_COLOR_SPACE',
} as const

type ColorPaletteOptions = {
  allowedColorSpaces?: string[]
}

export const colorPaletteRule: LintRule<
  (typeof ColorPaletteMessages)[keyof typeof ColorPaletteMessages],
  ColorPaletteOptions
> = {
  meta: {
    name: 'color-palette',
    description: 'Enforce color token rules',
    messages: {
      MISSING_TYPE: "Color token '{{name}}' is missing $type",
      INVALID_COLOR_SPACE: "Color token '{{name}}' uses unsupported color space '{{colorSpace}}'",
    },
  },
  defaultOptions: {
    allowedColorSpaces: ['srgb', 'oklch', 'display-p3'],
  },
  create(
    context: LintRuleContext<
      (typeof ColorPaletteMessages)[keyof typeof ColorPaletteMessages],
      ColorPaletteOptions
    >,
  ) {
    const { tokens, options, report } = context
    const allowedSpaces = options.allowedColorSpaces ?? ['srgb', 'oklch', 'display-p3']

    for (const token of Object.values(tokens)) {
      if (!token.$type) {
        report({ token, messageId: 'MISSING_TYPE', data: { name: token.name } })
        continue
      }

      if (token.$type === 'color') {
        const value = token.$value as { colorSpace?: string } | undefined
        if (value?.colorSpace && !allowedSpaces.includes(value.colorSpace)) {
          report({
            token,
            messageId: 'INVALID_COLOR_SPACE',
            data: { name: token.name, colorSpace: value.colorSpace },
          })
        }
      }
    }
  },
}

const NoLegacyPrefixMessages = {
  LEGACY_PREFIX: 'LEGACY_PREFIX',
} as const

type NoLegacyPrefixOptions = {
  prefixes?: string[]
}

export const noLegacyPrefix: LintRule<
  (typeof NoLegacyPrefixMessages)[keyof typeof NoLegacyPrefixMessages],
  NoLegacyPrefixOptions
> = {
  meta: {
    name: 'no-legacy-prefix',
    description: 'Disallow legacy prefixes in token names',
    messages: {
      LEGACY_PREFIX:
        "Token '{{name}}' uses legacy prefix '{{prefix}}'. Consider renaming to '{{suggestion}}'",
    },
  },
  defaultOptions: {
    prefixes: ['old', 'legacy', 'deprecated', 'temp'],
  },
  create(
    context: LintRuleContext<
      (typeof NoLegacyPrefixMessages)[keyof typeof NoLegacyPrefixMessages],
      NoLegacyPrefixOptions
    >,
  ) {
    const { tokens, options, report } = context
    const prefixes = options.prefixes ?? ['old', 'legacy', 'deprecated', 'temp']

    for (const token of Object.values(tokens)) {
      const nameLower = token.name.toLowerCase()
      for (const prefix of prefixes) {
        if (nameLower.startsWith(prefix)) {
          const suggestion = token.name.slice(prefix.length).replace(/^[-_]/, '')
          report({
            token,
            messageId: 'LEGACY_PREFIX',
            data: { name: token.name, prefix, suggestion },
          })
          break
        }
      }
    }
  },
}

const SemanticDepthMessages = {
  TOO_DEEP: 'TOO_DEEP',
} as const

type SemanticDepthOptions = {
  maxDepth?: number
}

export const semanticDepth: LintRule<
  (typeof SemanticDepthMessages)[keyof typeof SemanticDepthMessages],
  SemanticDepthOptions
> = {
  meta: {
    name: 'semantic-depth',
    description: 'Enforce maximum token path depth',
    messages: {
      TOO_DEEP: "Token '{{name}}' exceeds maximum depth of {{maxDepth}} (current: {{depth}})",
    },
  },
  defaultOptions: {
    maxDepth: 4,
  },
  create(
    context: LintRuleContext<
      (typeof SemanticDepthMessages)[keyof typeof SemanticDepthMessages],
      SemanticDepthOptions
    >,
  ) {
    const { tokens, options, report } = context
    const maxDepth = options.maxDepth ?? 4

    for (const token of Object.values(tokens)) {
      const depth = token.path.length
      if (depth > maxDepth) {
        report({
          token,
          messageId: 'TOO_DEEP',
          data: { name: token.name, maxDepth: String(maxDepth), depth: String(depth) },
        })
      }
    }
  },
}

const RequireTypeMessages = {
  MISSING_TYPE: 'MISSING_TYPE',
} as const

type RequireTypeOptions = {
  types?: string[]
}

export const requireType: LintRule<
  (typeof RequireTypeMessages)[keyof typeof RequireTypeMessages],
  RequireTypeOptions
> = {
  meta: {
    name: 'require-type',
    description: 'Require $type for all tokens',
    messages: {
      MISSING_TYPE: "Token '{{name}}' is missing required $type",
    },
  },
  defaultOptions: {},
  create(
    context: LintRuleContext<
      (typeof RequireTypeMessages)[keyof typeof RequireTypeMessages],
      RequireTypeOptions
    >,
  ) {
    const { tokens, report } = context

    for (const token of Object.values(tokens)) {
      if (token.$type === undefined || token.$type === null) {
        report({ token, messageId: 'MISSING_TYPE', data: { name: token.name } })
      }
    }
  },
}

const NoCircularReferencesMessages = {
  CIRCULAR: 'CIRCULAR',
} as const

type NoCircularReferencesOptions = {
  checkSelfReference?: boolean
}

export const noCircularReferences: LintRule<
  (typeof NoCircularReferencesMessages)[keyof typeof NoCircularReferencesMessages],
  NoCircularReferencesOptions
> = {
  meta: {
    name: 'no-circular-references',
    description: 'Detect circular token references',
    messages: {
      CIRCULAR: "Token '{{name}}' has a circular reference",
    },
  },
  defaultOptions: {
    checkSelfReference: true,
  },
  create(
    context: LintRuleContext<
      (typeof NoCircularReferencesMessages)[keyof typeof NoCircularReferencesMessages],
      NoCircularReferencesOptions
    >,
  ) {
    const { tokens, options, report } = context
    const checkSelfRef = options.checkSelfReference ?? true

    for (const token of Object.values(tokens)) {
      if (checkSelfRef && token.$value && typeof token.$value === 'string') {
        const selfRef = `{${token.name}}`
        if (token.$value === selfRef) {
          report({ token, messageId: 'CIRCULAR', data: { name: token.name } })
        }
      }
    }
  },
}

const TokenPrefixMessages = {
  INVALID_PREFIX: 'INVALID_PREFIX',
} as const

type TokenPrefixOptions = {
  prefixes?: Record<string, string[]>
}

export const tokenPrefix: LintRule<
  (typeof TokenPrefixMessages)[keyof typeof TokenPrefixMessages],
  TokenPrefixOptions
> = {
  meta: {
    name: 'token-prefix',
    description: 'Enforce naming prefixes based on token category',
    messages: {
      INVALID_PREFIX:
        "Token '{{name}}' should start with '{{expected}}' based on its category '{{category}}'",
    },
  },
  defaultOptions: {
    prefixes: {
      color: ['color'],
      typography: ['font', 'text', 'line'],
      spacing: ['space', 'gap', 'inset'],
      effects: ['shadow', 'elevation'],
    },
  },
  create(
    context: LintRuleContext<
      (typeof TokenPrefixMessages)[keyof typeof TokenPrefixMessages],
      TokenPrefixOptions
    >,
  ) {
    const { tokens, options, report } = context
    const prefixMap = options.prefixes ?? {}

    for (const token of Object.values(tokens)) {
      const category = token.path[0]
      const expectedPrefixes = prefixMap[category]

      if (expectedPrefixes && expectedPrefixes.length > 0) {
        const hasValidPrefix = expectedPrefixes.some((prefix) => token.name.startsWith(prefix))

        if (!hasValidPrefix && token.path.length > 1) {
          report({
            token,
            messageId: 'INVALID_PREFIX',
            data: {
              name: token.name,
              category,
              expected: expectedPrefixes.join(' or '),
            },
          })
        }
      }
    }
  },
}

export const customPlugin: LintPlugin = {
  meta: {
    name: '@examples/custom-lint-plugin',
    version: '1.0.0',
  },
  rules: {
    'color-palette': colorPaletteRule,
    'no-legacy-prefix': noLegacyPrefix,
    'semantic-depth': semanticDepth,
    'require-type': requireType,
    'no-circular-references': noCircularReferences,
    'token-prefix': tokenPrefix,
  },
}

const recommendedLintConfig: LintConfig = {
  plugins: { custom: customPlugin },
  rules: {
    'custom/color-palette': 'warn',
    'custom/require-type': 'error',
  },
}

const strictLintConfig: LintConfig = {
  plugins: { custom: customPlugin },
  rules: {
    'custom/color-palette': 'error',
    'custom/no-legacy-prefix': 'warn',
    'custom/semantic-depth': 'warn',
    'custom/require-type': 'error',
    'custom/token-prefix': 'warn',
  },
}

customPlugin.configs = {
  recommended: recommendedLintConfig,
  strict: strictLintConfig,
}
