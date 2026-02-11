import {
  outputTree,
  type RenderContext,
  type Renderer,
  type ResolvedToken,
  type ResolvedTokens,
} from 'dispersa'
import yaml from 'yaml'

import { resolveOutputFile } from './utils.js'

export const yamlRenderer: Renderer = {
  format: (context: RenderContext) => {
    const structure =
      typeof context.output.options?.['structure'] === 'string'
        ? context.output.options['structure']
        : 'flat'

    const files: Record<string, string> = {}
    for (const { tokens, modifierInputs } of context.permutations) {
      const content = structure === 'flat' ? formatFlatYaml(tokens) : formatNestedYaml(tokens)
      const fileName = resolveOutputFile(context.output.file, modifierInputs, 'tokens.yaml')
      files[fileName] = content
    }

    return outputTree(files)
  },
}

const formatFlatYaml = (tokens: ResolvedTokens): string => {
  const flatTokens: Record<string, unknown> = {}

  for (const [name, token] of Object.entries(tokens) as [string, ResolvedToken][]) {
    flatTokens[name] = {
      value: token.$value,
      type: token.$type,
    }
  }

  return yaml.stringify(flatTokens, { indent: 2, lineWidth: 0 })
}

const formatNestedYaml = (tokens: ResolvedTokens): string => {
  const nestedTokens: Record<string, unknown> = {}

  for (const [_name, token] of Object.entries(tokens) as [string, ResolvedToken][]) {
    const parts = token.path
    let current = nestedTokens

    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i]
      if (!part) continue

      const next = current[part]
      if (!next || typeof next !== 'object') {
        current[part] = {}
      }
      current = current[part] as Record<string, unknown>
    }

    const lastPart = parts[parts.length - 1]
    if (!lastPart) continue
    current[lastPart] = {
      value: token.$value,
      type: token.$type,
    }
  }

  return yaml.stringify(nestedTokens, { indent: 2, lineWidth: 0 })
}
