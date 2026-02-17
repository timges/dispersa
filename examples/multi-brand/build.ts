#!/usr/bin/env tsx

/**
 * Multi-Brand Example - Multi-format output with brands, themes,
 * platforms, density, and accessibility modifiers.
 */

import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { Dispersa, css, js, json } from 'dispersa'
import { nameCamelCase, nameKebabCase } from 'dispersa/transforms'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const outputDir = path.join(__dirname, 'output')

const dispersa = new Dispersa({
  resolver: path.join(__dirname, 'tokens.resolver.json'),
  buildPath: outputDir,
})

const result = await dispersa.build({
  outputs: [
    json({
      name: 'json-standalone',
      file: 'json/tokens-{theme}-{brand}.json',
      preset: 'standalone',
      structure: 'nested',
    }),
    json({
      name: 'json-bundle',
      file: 'json-bundle/tokens.json',
      preset: 'bundle',
      structure: 'nested',
    }),
    css({
      name: 'css',
      file: 'css/tokens.css',
      preset: 'bundle',
      transforms: [nameKebabCase()],
    }),
    js({
      name: 'js-standalone',
      file: 'js/tokens-{theme}-{brand}.js',
      preset: 'standalone',
      moduleName: 'tokens',
      transforms: [nameCamelCase()],
    }),
    js({
      name: 'js-bundle',
      file: 'js-bundle/tokens.js',
      preset: 'bundle',
      moduleName: 'tokens',
      generateHelper: true,
      transforms: [nameCamelCase()],
    }),
  ],
})

if (!result.success) {
  for (const error of result.errors ?? []) {
    console.error(error.message)
  }
  process.exit(1)
}

// Generate TypeScript types
const tokens = await dispersa.resolveTokens(path.join(__dirname, 'tokens.resolver.json'), {
  brand: 'primary',
  platform: 'web',
  density: 'comfortable',
  theme: 'light',
  accessibility: 'standard',
})
await dispersa.generateTypes(tokens, path.join(outputDir, 'types/tokens.d.ts'), {
  moduleName: 'EnterpriseDesignSystem',
})

console.log('Build successful!')
console.log(`Generated ${result.outputs.length} file(s) + types/tokens.d.ts`)
console.log('\nOutput:')
for (const output of result.outputs) {
  console.log(`  - ${output.path}`)
}
console.log(`  - ${path.join(outputDir, 'types/tokens.d.ts')}`)
