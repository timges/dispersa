#!/usr/bin/env tsx

/**
 * Advanced Example - Multi-format output with themes, platforms,
 * density modifiers, and a custom renderer.
 */

import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { type RenderContext, type Renderer, Dispersa, css, figma, js, json } from 'dispersa'
import { isAlias } from 'dispersa/filters'
import {
  colorToColorFunction,
  dimensionToPx,
  nameCamelCase,
  nameKebabCase,
} from 'dispersa/transforms'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const outputDir = path.join(__dirname, 'output')

const dispersa = new Dispersa({
  resolver: path.join(__dirname, 'tokens.resolver.json'),
  buildPath: outputDir,
})

const myRenderer = {
  name: 'my-renderer',
  format: (context: RenderContext, _options: any) => {
    const tokens = context.permutations[0]?.tokens
    return JSON.stringify(
      Object.entries(tokens).map(([_name, token]: [string, any]) => ({
        name: token.name,
        originalName: token.name,
        value: token.$value,
        altName: `${token.name}-alt`,
      })),
      null,
      2,
    )
  },
} as Renderer

const modifierSelector = (modifierName: string, context: string, isBase: boolean): string => {
  if (isBase) return ':root'
  return `:root[data-${modifierName}="${context}"]`
}

const result = await dispersa.build({
  outputs: [
    {
      name: 'my-renderer',
      renderer: myRenderer,
      file: 'tokens.{theme}-{platform}-{density}.my-renderer.json',
      transforms: [nameCamelCase()],
    },
    css({
      name: 'css',
      file: 'tokens.css',
      preset: 'bundle',
      selector: modifierSelector,
      preserveReferences: true,
      transforms: [nameKebabCase(), dimensionToPx(), colorToColorFunction()],
    }),
    css({
      name: 'css-standalone',
      file: 'tokens-mod.css',
      preset: 'modifier',
      selector: modifierSelector,
      filters: [isAlias()],
      preserveReferences: false,
      transforms: [nameKebabCase(), dimensionToPx(), colorToColorFunction()],
    }),
    json({
      name: 'json',
      file: 'tokens-{theme}-{platform}-{density}.json',
      preset: 'standalone',
      structure: 'flat',
    }),
    js({
      name: 'js',
      file: 'tokens.js',
      preset: 'bundle',
      moduleName: 'tokens',
      structure: 'flat',
      transforms: [nameCamelCase()],
    }),
    figma({
      name: 'figma',
      file: 'tokens-figma.json',
      collectionName: 'Design Tokens',
      modeMapping: { default: 'Default' },
      preserveReferences: true,
    }),
  ],
})

if (!result.success) {
  console.error('Build failed')
  for (const error of result.errors ?? []) {
    console.error('  -', error.message)
  }
  process.exit(1)
}

// Generate TypeScript types (using light/desktop/comfortable as base)
const tokens = await dispersa.resolveTokens(path.join(__dirname, 'tokens.resolver.json'), {
  theme: 'light',
  platform: 'desktop',
  density: 'comfortable',
})
await dispersa.generateTypes(tokens, path.join(outputDir, 'tokens.d.ts'), {
  moduleName: 'DesignTokens',
})

console.log('Build successful!')
console.log(`Generated ${result.outputs.length} file(s) + tokens.d.ts`)
console.log('\nOutput:')
for (const output of result.outputs) {
  console.log(`  - ${output.path}`)
}
console.log(`  - ${path.join(outputDir, 'tokens.d.ts')}`)
