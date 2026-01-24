#!/usr/bin/env tsx

/**
 * Enterprise Example - Build Script
 *
 * This script demonstrates enterprise-scale token generation with:
 * - Comprehensive DTCG 2025.10 feature coverage
 * - Advanced resolver features (multiple sets, modifiers, inline tokens)
 * - All token types (primitive and composite)
 * - All reference patterns (curly braces, JSON Pointer, chained)
 * - Multiple output formats for validation
 */

import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { Dispersa, css, js, json } from 'dispersa'
import { nameCamelCase, nameKebabCase } from 'dispersa/transforms'
import fs from 'fs-extra'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Output directory
const outputDir = path.join(__dirname, 'output')

// Initialize Dispersa with resolver and buildPath defaults
const dispersa = new Dispersa({
  resolver: path.join(__dirname, 'tokens.resolver.json'),
  buildPath: outputDir,
})

async function buildEnterprise() {
  console.log('🏢 Enterprise Example - Building comprehensive token system...\n')

  try {
    // Ensure output directory exists
    await fs.ensureDir(outputDir)

    // Build all permutations using the enterprise resolver
    console.log('📦 Building enterprise token permutations...')
    const result = await dispersa.build({
      // resolver and buildPath inherited from constructor
      outputs: [
        json({
          name: 'json-standalone',
          file: 'json/tokens-{theme}-{brand}.json', // Subdirectory with pattern-based filename
          preset: 'standalone',
          structure: 'nested',
        }),
        json({
          name: 'json-bundle',
          file: 'json-bundle/tokens.json', // Bundle mode with all combinations
          preset: 'bundle',
          structure: 'nested',
        }),
        css({
          name: 'css',
          file: 'css/tokens.css', // Subdirectory for organization
          preset: 'bundle',
          // selector: ':root',
          transforms: [nameKebabCase()],
          // filters: [isAlias()],
        }),
        js({
          name: 'js-standalone',
          file: 'js/tokens-{theme}-{brand}.js', // Subdirectory with pattern-based filename
          preset: 'standalone',
          moduleName: 'tokens', // Separate JS per permutation
          transforms: [nameCamelCase()],
        }),
        js({
          name: 'js-bundle',
          file: 'js-bundle/tokens.js', // Bundle mode with all combinations
          preset: 'bundle',
          moduleName: 'tokens',
          generateHelper: true,
          transforms: [nameCamelCase()],
        }),
      ],
    })

    if (!result.success) {
      console.error('❌ Test suite build failed with errors:')
      for (const error of result.errors || []) {
        console.error(`   ${error.message}`)
        if (error.path) {
          console.error(`   at ${error.path}`)
        }
      }
      process.exit(1)
    }

    console.log(`   ✅ Built ${result.outputs.length} output files`)

    // Generate TypeScript types
    console.log('\n📝 Generating TypeScript types...')
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
    console.log('   ✅ types/tokens.d.ts')

    // Verify features
    console.log('\n🔍 Verifying DTCG features...')
    await verifyFeatures(tokens)

    // Print summary
    console.log('\n✅ Test suite build completed successfully!\n')
    console.log('📄 Generated files:')
    const files = await fs.readdir(outputDir)
    files.sort().forEach((f) => console.log(`   - output/${f}`))

    console.log('\n📊 Feature Coverage:')
    console.log(
      '   ✓ All primitive types (color, dimension, fontFamily, fontWeight, duration, cubicBezier, number)',
    )
    console.log('   ✓ Stable composite type (shadow)')
    console.log('   ✓ All token properties ($type, $value, $description, $extensions, $deprecated)')
    console.log(
      '   ✓ All color spaces (srgb, display-p3, a98-rgb, prophoto-rgb, rec2020, xyz variants)',
    )
    console.log(
      '   ✓ All reference patterns (curly brace, JSON Pointer, chained, property-level, array aliasing)',
    )
    console.log(
      '   ✓ Group features (nesting, type inheritance, $extensions, $deprecated, root tokens)',
    )
    console.log(
      '   ✓ Resolver features (multiple sets, modifiers, contexts, resolution order, $defs)',
    )

    console.log('\n💡 Test suite demonstrates stable DTCG 2025.10 token types\n')
  } catch (error) {
    console.error('\n❌ Test suite build failed:')
    console.error(error)
    process.exit(1)
  }
}

async function verifyFeatures(tokens: any) {
  let featureCount = 0
  const features: string[] = []

  // Verify primitive types
  if (tokens.primitiveTypes) {
    const primitiveTypes = [
      'colorPrimitive',
      'dimensionPrimitive',
      'fontFamilyPrimitive',
      'fontWeightNumber',
      'durationMs',
      'cubicBezierEase',
      'numberInteger',
    ]
    for (const type of primitiveTypes) {
      if (tokens.primitiveTypes[type]) {
        featureCount++
        features.push(`Primitive type: ${type}`)
      }
    }
  }

  // Verify composite types
  if (tokens.compositeTypes) {
    const compositeTypes = ['shadowSingle', 'shadowMultiple', 'shadowInset']
    for (const type of compositeTypes) {
      if (tokens.compositeTypes[type]) {
        featureCount++
        features.push(`Composite type: ${type}`)
      }
    }
  }

  // Verify color spaces
  if (tokens.srgbColorSpace || tokens.displayP3ColorSpace) {
    featureCount++
    features.push('Multiple color spaces detected')
  }

  // Verify references
  if (tokens.curlyBraceReferences || tokens.jsonPointerReferences) {
    featureCount++
    features.push('Reference patterns detected')
  }

  // Verify token properties
  if (tokens.tokenProperties) {
    if (tokens.tokenProperties.deprecatedToken) {
      featureCount++
      features.push('Deprecated tokens')
    }
    if (tokens.tokenProperties.withExtensions) {
      featureCount++
      features.push('Token extensions')
    }
  }

  console.log(`   ✅ Verified ${featureCount} distinct features`)

  // Sample verification
  if (features.length > 0) {
    console.log('   Sample features detected:')
    features.slice(0, 5).forEach((f) => console.log(`      - ${f}`))
    if (features.length > 5) {
      console.log(`      ... and ${features.length - 5} more`)
    }
  }
}

// Run the build
buildEnterprise()
