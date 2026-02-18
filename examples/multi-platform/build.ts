#!/usr/bin/env tsx

/**
 * Multi-Platform Example — Dispersa
 *
 * Builds one set of Adobe Spectrum design tokens to four platform outputs:
 * - CSS custom properties (web)
 * - Tailwind v4 @theme (web + Tailwind)
 * - Swift / SwiftUI (iOS)
 * - Kotlin / Jetpack Compose (Android)
 */

import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { Dispersa, android, css, ios, tailwind } from 'dispersa'
import { colorToHex, dimensionToPx, nameKebabCase } from 'dispersa/transforms'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const outputDir = path.join(__dirname, 'output')

const dispersa = new Dispersa({
  resolver: path.join(__dirname, 'tokens.resolver.json'),
  buildPath: outputDir,
})

const result = await dispersa.build({
  outputs: [
    // Web — CSS custom properties (bundle: base + overrides per theme)
    css({
      name: 'web-css',
      file: 'web/tokens.css',
      preset: 'bundle',
      preserveReferences: true,
      transforms: [colorToHex(), dimensionToPx()],
    }),

    // Tailwind v4 — @theme block with CSS custom properties + dark mode overrides
    // includeImport: false so the preview app can import tailwindcss from its own context
    tailwind({
      name: 'tailwind',
      file: 'tailwind/theme.css',
      preset: 'bundle',
      includeImport: false,
      transforms: [nameKebabCase()],
      selector: (modifier, context, isBase) => {
        if (isBase) return ':root'
        return `[data-${modifier}="${context}"]`
      },
    }),

    // iOS — SwiftUI enum structure, one file per theme
    // Uses Swift 6 strict concurrency annotations (nonisolated(unsafe))
    ios({
      name: 'ios',
      file: 'ios/DesignTokens-{theme}.swift',
      structure: 'enum',
      enumName: 'SpectrumTokens',
      accessLevel: 'public',
      colorSpace: 'sRGB',
      swiftVersion: '6.0',
      indent: 4,
    }),

    // Android — Kotlin / Jetpack Compose, one file per theme
    // Uses flat structure for semantic grouping (Colors, Spacing, etc.)
    android({
      name: 'android',
      file: 'android/DesignTokens-{theme}.kt',
      packageName: 'com.example.spectrum.tokens',
      objectName: 'SpectrumTokens',
      structure: 'flat',
      colorFormat: 'argb_hex',
      visibility: 'public',
      indent: 4,
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

console.log('Build successful!')
console.log(`Generated ${result.outputs.length} file(s)`)
console.log('\nOutput:')
for (const output of result.outputs) {
  console.log(`  - ${output.path}`)
}
