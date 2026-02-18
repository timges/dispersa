#!/usr/bin/env tsx

/**
 * TypeScript Starter - Dispersa
 *
 * Demonstrates a token structure with:
 * - Base tokens split by domain (colors, typography, spacing, effects)
 * - Semantic aliases referencing base tokens
 * - Theme modifiers (light/dark)
 * - Bundle output (single file) and modifier output (per-theme folders)
 */

import { Dispersa, css } from 'dispersa'
import { colorToHex, dimensionToRem, fontWeightToNumber } from 'dispersa/transforms'
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
      name: 'css-bundle',
      file: 'tokens.css',
      preset: 'bundle',
      preserveReferences: true,
      transforms: [colorToHex(), dimensionToRem(), fontWeightToNumber()],
    }),
    css({
      name: 'css-themes',
      file: '{theme}/tokens.css',
      preset: 'modifier',
      selector: ':root',
      preserveReferences: true,
      transforms: [colorToHex(), dimensionToRem(), fontWeightToNumber()],
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
