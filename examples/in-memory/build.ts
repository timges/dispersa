#!/usr/bin/env tsx

/**
 * In-Memory Example - Tokens defined inline, no file I/O.
 * Demonstrates resolveTokens and resolveAllPermutations.
 */

import type { ResolverDocument } from 'dispersa'
import { build, css, js, json, resolveAllPermutations, resolveTokens } from 'dispersa'
import { colorToHex, dimensionToRem, nameCamelCase } from 'dispersa/transforms'

const resolver: ResolverDocument = {
  version: '2025.10',
  sets: {
    base: {
      description: 'Base design tokens',
      sources: [
        {
          color: {
            brand: {
              primary: {
                $type: 'color',
                $value: { colorSpace: 'srgb', components: [0, 0.4, 0.8] },
              },
              secondary: {
                $type: 'color',
                $value: { colorSpace: 'srgb', components: [0.4, 0.2, 0.6] },
              },
            },
            neutral: {
              white: {
                $type: 'color',
                $value: { colorSpace: 'srgb', components: [1, 1, 1] },
              },
              black: {
                $type: 'color',
                $value: { colorSpace: 'srgb', components: [0, 0, 0] },
              },
            },
          },
          spacing: {
            base: { $type: 'dimension', $value: { value: 16, unit: 'px' } },
            small: { $type: 'dimension', $value: { value: 8, unit: 'px' } },
            large: { $type: 'dimension', $value: { value: 32, unit: 'px' } },
          },
          typography: {
            fontFamily: {
              sans: { $type: 'fontFamily', $value: ['Inter', 'system-ui', 'sans-serif'] },
              mono: { $type: 'fontFamily', $value: ['Fira Code', 'monospace'] },
            },
          },
        },
      ],
    },
  },
  modifiers: {
    theme: {
      description: 'Color theme variations',
      default: 'light',
      contexts: {
        light: [
          {
            semantic: {
              background: { $type: 'color', $value: '{color.neutral.white}' },
              text: { $type: 'color', $value: '{color.neutral.black}' },
            },
          },
        ],
        dark: [
          {
            semantic: {
              background: { $type: 'color', $value: '{color.neutral.black}' },
              text: { $type: 'color', $value: '{color.neutral.white}' },
            },
          },
        ],
      },
    },
  },
  resolutionOrder: [{ $ref: '#/sets/base' }, { $ref: '#/modifiers/theme' }],
}

// No buildPath -- outputs stay in memory

const result = await build({
  resolver,
  outputs: [
    css({
      name: 'css',
      preset: 'bundle',
      selector: ':root',
      transforms: [colorToHex(), dimensionToRem()],
    }),
    json({
      name: 'json',
      preset: 'standalone',
      structure: 'flat',
    }),
    js({
      name: 'js',
      preset: 'standalone',
      transforms: [nameCamelCase()],
    }),
  ],
})

if (!result.success) {
  console.error('Build failed')
  console.error(result.errors)
  process.exit(1)
}

console.log(`Built ${result.outputs.length} outputs in memory\n`)

for (const output of result.outputs) {
  console.log(`--- ${output.name} ---`)
  console.log(output.content)
  console.log()
}

// Direct token resolution
const lightTokens = await resolveTokens(resolver, { theme: 'light' })
const darkTokens = await resolveTokens(resolver, { theme: 'dark' })

console.log('Light background:', JSON.stringify(lightTokens['semantic.background']?.$value))
console.log('Dark background:', JSON.stringify(darkTokens['semantic.background']?.$value))

// All permutations
const permutations = await resolveAllPermutations(resolver)

console.log(`\n${permutations.length} permutation(s):`)
for (const perm of permutations) {
  console.log(`  theme=${perm.modifierInputs.theme} (${Object.keys(perm.tokens).length} tokens)`)
}
