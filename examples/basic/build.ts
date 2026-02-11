#!/usr/bin/env tsx

/**
 * Basic Example - Dispersa
 *
 * Demonstrates a simple token structure with:
 * - Base tokens (foundational values)
 * - Alias tokens (semantic references)
 * - Theme modifiers (light/dark)
 */

import { Dispersa, css } from 'dispersa'
import { colorToHex, nameKebabCase } from 'dispersa/transforms'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const dispersa = new Dispersa({
  resolver: path.join(__dirname, 'tokens.resolver.json'),
  buildPath: path.join(__dirname, 'output'),
})

const result = await dispersa.build({
  outputs: [
    css({
      name: 'css',
      file: 'tokens.css',
      preset: 'bundle',
      preserveReferences: true,
      transforms: [nameKebabCase(), colorToHex()],
    }),
    css({
      name: 'css',
      file: 'tokens-mod.css',
      preset: 'standalone',
      selector: () => '[data-theme="bla"]',
      preserveReferences: true,
      transforms: [nameKebabCase(), colorToHex()],
    }),
  ],
})

if (result.success) {
  console.log('Build successful!')
  console.log(`Generated ${result.outputs.length} file(s)`)
  console.log('\nOutput:')
  for (const output of result.outputs) {
    console.log(`  - ${output.path}`)
  }
} else {
  console.error('Build failed')
  if (result.errors) {
    for (const error of result.errors) {
      console.error('  -', error.message)
    }
  }
  process.exit(1)
}
