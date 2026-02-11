#!/usr/bin/env tsx

/**
 * Custom Plugins Example - Custom filter, transform, and renderers
 * (YAML, SwiftUI, Android XML).
 */

import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { Dispersa, type Filter, type ModifierInputs, type ResolvedToken } from 'dispersa'
import type { Transform } from 'dispersa/transforms'

import { androidXmlRenderer } from './android-xml-renderer.js'
import { swiftUiRenderer } from './swiftui-renderer.js'
import { yamlRenderer } from './yaml-renderer.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const outputDir = path.join(__dirname, 'output')

// Custom filter: only include color tokens
const colorOnlyFilter: Filter = {
  filter: (token: ResolvedToken) => token.$type === 'color',
}

// Custom transform: uppercase token names
const uppercaseNamesTransform: Transform = {
  transform: (token: ResolvedToken) => ({ ...token, name: token.name.toUpperCase() }),
}

const dispersa = new Dispersa({
  resolver: path.join(__dirname, 'tokens.resolver.json'),
  buildPath: outputDir,
})

const result = await dispersa.build({
  outputs: [
    {
      name: 'yaml-colors',
      renderer: yamlRenderer,
      file: 'tokens.yaml',
      options: { structure: 'flat' },
      filters: [colorOnlyFilter],
      transforms: [uppercaseNamesTransform],
    },
    {
      name: 'swiftui',
      renderer: swiftUiRenderer({ moduleName: 'DesignTokens' }),
      file: (inputs: ModifierInputs) => {
        const suffix = Object.entries(inputs)
          .map(([key, value]) => `${key}-${value}`)
          .join('-')
        return `swift/tokens${suffix ? `-${suffix}` : ''}.swift`
      },
    },
    {
      name: 'android-xml',
      renderer: androidXmlRenderer(),
      file: 'android',
    },
  ],
})

if (!result.success) {
  for (const error of result.errors ?? []) {
    console.error(error.message)
  }
  process.exit(1)
}

console.log('Build successful!')
console.log(`Generated ${result.outputs.length} file(s)`)
console.log('\nOutput:')
for (const output of result.outputs) {
  console.log(`  - ${output.path}`)
}
