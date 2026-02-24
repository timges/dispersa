#!/usr/bin/env tsx

/**
 * Split-by-Type Example - Dispersa
 *
 * Demonstrates splitting CSS output into separate files by token category:
 * - colors.css   (color tokens, filtered by $type)
 * - spacings.css (spacing tokens, filtered by path)
 * - typography.css (font tokens, filtered by path)
 *
 * Uses `byType()` when the DTCG $type uniquely identifies a category,
 * and `byPath()` when tokens of the same $type (e.g. "dimension") belong
 * to different categories (spacing vs font sizes).
 */

import { build, css } from 'dispersa'
import { byPath, byType } from 'dispersa/filters'
import { colorToHex } from 'dispersa/transforms'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const result = await build({
  resolver: path.join(__dirname, 'tokens.resolver.json'),
  buildPath: path.join(__dirname, 'output'),
  outputs: [
    // Colors: byType('color') works because "color" is a unique DTCG type
    css({
      name: 'colors',
      file: 'css/colors.css',
      preset: 'bundle',
      filters: [byType('color')],
      preserveReferences: true,
      transforms: [colorToHex()],
    }),

    // Spacings: byPath() needed because "dimension" is shared with font sizes
    css({
      name: 'spacings',
      file: 'css/spacings.css',
      preset: 'bundle',
      filters: [byPath(/^spacing/)],
    }),

    // Typography: byPath() groups fontFamily, fontWeight, and font-size dimensions
    css({
      name: 'typography',
      file: 'css/typography.css',
      preset: 'bundle',
      filters: [byPath(/^font/)],
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
