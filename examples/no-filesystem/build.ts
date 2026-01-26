#!/usr/bin/env tsx

/**
 * In-Memory Mode Example
 *
 * This example demonstrates using Dispersa completely in memory,
 * without reading or writing files. This is useful for:
 * - Build tools and bundler plugins
 * - Runtime token generation
 * - Testing and validation
 * - API servers
 */

import type { ResolverDocument } from 'dispersa'
import { Dispersa, css, js, json } from 'dispersa'
import { colorToHex, dimensionToRem, nameCamelCase, nameKebabCase } from 'dispersa/transforms'

console.log('🚀 Dispersa - In-Memory Mode Example\n')

// Define tokens inline (no files!)
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
                $value: {
                  colorSpace: 'srgb',
                  components: [0, 0.4, 0.8],
                },
                $description: 'Primary brand color',
              },
              secondary: {
                $type: 'color',
                $value: {
                  colorSpace: 'srgb',
                  components: [0.4, 0.2, 0.6],
                },
              },
            },
            neutral: {
              white: {
                $type: 'color',
                $value: {
                  colorSpace: 'srgb',
                  components: [1, 1, 1],
                },
              },
              black: {
                $type: 'color',
                $value: {
                  colorSpace: 'srgb',
                  components: [0, 0, 0],
                },
              },
            },
          },
          spacing: {
            base: {
              $type: 'dimension',
              $value: {
                value: 16,
                unit: 'px',
              },
            },
            small: {
              $type: 'dimension',
              $value: {
                value: 8,
                unit: 'px',
              },
            },
            large: {
              $type: 'dimension',
              $value: {
                value: 32,
                unit: 'px',
              },
            },
          },
          typography: {
            fontFamily: {
              sans: {
                $type: 'fontFamily',
                $value: ['Inter', 'system-ui', 'sans-serif'],
              },
              mono: {
                $type: 'fontFamily',
                $value: ['Fira Code', 'monospace'],
              },
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
              background: {
                $type: 'color',
                $value: '{color.neutral.white}',
              },
              text: {
                $type: 'color',
                $value: '{color.neutral.black}',
              },
            },
          },
        ],
        dark: [
          {
            semantic: {
              background: {
                $type: 'color',
                $value: '{color.neutral.black}',
              },
              text: {
                $type: 'color',
                $value: '{color.neutral.white}',
              },
            },
          },
        ],
      },
    },
  },
  resolutionOrder: [{ $ref: '#/sets/base' }, { $ref: '#/modifiers/theme' }],
}

// Create Dispersa instance with in-memory resolver
// Note: No buildPath specified - output won't be written to files
const dispersa = new Dispersa({
  resolver, // Pass resolver object directly
})

console.log('📦 Building tokens in memory...\n')

// Build tokens without writing files
const result = await dispersa.build({
  // No buildPath - returns content instead of writing files
  outputs: [
    css({
      name: 'css',
      preset: 'bundle',
      selector: ':root',
      transforms: [nameKebabCase(), colorToHex(), dimensionToRem()],
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
  console.error('❌ Build failed!')
  console.error(result.errors)
  process.exit(1)
}

console.log(`✅ Built ${result.outputs.length} outputs in memory\n`)

// Display the generated content
console.log('📄 Generated Outputs:\n')

result.outputs.forEach((output, index) => {
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`)
  console.log(`Output #${index + 1}: ${output.platform}`)
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`)

  // Truncate long output for readability
  const content = output.content || ''
  const maxLines = 15
  const lines = content.split('\n')

  if (lines.length > maxLines) {
    console.log(lines.slice(0, maxLines).join('\n'))
    console.log(`\n... (${lines.length - maxLines} more lines) ...\n`)
  } else {
    console.log(content)
  }
  console.log()
})

// Example: Using resolved tokens directly
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
console.log('Example: Direct Token Resolution')
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

const lightTokens = await dispersa.resolveTokens(resolver, { theme: 'light' })
const darkTokens = await dispersa.resolveTokens(resolver, { theme: 'dark' })

console.log('Light theme background:')
console.log(JSON.stringify(lightTokens['semantic.background'], null, 2))
console.log()

console.log('Dark theme background:')
console.log(JSON.stringify(darkTokens['semantic.background'], null, 2))
console.log()

// Example: Getting all theme permutations
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
console.log('Example: All Permutations')
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

const permutations = await dispersa.resolveAllPermutations(resolver)

permutations.forEach((perm) => {
  console.log(`Theme: ${perm.modifierInputs.theme}`)
  console.log(`Tokens: ${Object.keys(perm.tokens).length}`)
  console.log()
})

console.log('✨ In-memory mode complete!\n')
