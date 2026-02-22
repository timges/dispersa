#!/usr/bin/env tsx

/**
 * Linting Starter - Dispersa
 *
 * Comprehensive example demonstrating:
 * - Built-in lint rules (require-description, naming-convention, path-schema, etc.)
 * - Custom lint plugin with multiple rules
 * - Three-tier token validation (base, semantic, component)
 * - Running lint as part of build or standalone
 */

import { Dispersa, css } from 'dispersa'
import { dispersaPlugin } from 'dispersa/lint'
import { colorToHex, dimensionToRem, fontWeightToNumber } from 'dispersa/transforms'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { customPlugin } from './lint-plugins/index.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const lintOnly = process.argv.includes('--lint-only')

const dispersa = new Dispersa({
  resolver: path.join(__dirname, 'tokens.resolver.json'),
  buildPath: path.join(__dirname, 'output'),
})

const lintPlugins = {
  dispersa: dispersaPlugin,
  custom: customPlugin,
}

const pathSchemaSegments = {
  category: {
    values: ['color', 'spacing', 'typography', 'shadow'],
  },
  component: {
    values: ['button'],
    description: 'Component name',
  },
  variant: {
    values: ['primary', 'secondary', 'ghost', 'danger', 'success', 'warning'],
    optional: true,
  },
  property: {
    values: ['background', 'text', 'border', 'padding', 'shadow', 'radius', 'gap'],
  },
  state: {
    values: ['hover', 'active', 'focus', 'disabled', 'selected'],
    optional: true,
  },
}

const pathSchemaPatterns = [
  '{category}.{component}.{property}',
  '{category}.{component}.{property}.{state}',
  '{category}.{component}.{variant}.{property}',
  '{category}.{component}.{variant}.{property}.{state}',
]

const lintRules = {
  'dispersa/require-description': 'warn' as const,
  'dispersa/naming-convention': ['error' as const, { format: 'kebab-case' }] as const,
  'dispersa/no-deprecated-usage': 'warn' as const,
  'dispersa/no-duplicate-values': ['warn' as const, { types: ['color'] }] as const,
  'custom/require-type': 'error' as const,
  'custom/no-legacy-prefix': 'warn' as const,
  'custom/token-prefix': 'warn' as const,
}

console.log('='.repeat(60))
console.log('Dispersa Linting Example')
console.log('='.repeat(60))

console.log('\n--- Running standalone lint with recommended config ---')
try {
  const result = await dispersa.lint(path.join(__dirname, 'tokens.resolver.json'), {
    plugins: lintPlugins,
    rules: {
      ...lintRules,
      'dispersa/path-schema': [
        'warn',
        { segments: pathSchemaSegments, paths: pathSchemaPatterns, strict: true },
      ],
    },
    failOnError: false,
  })

  console.log(`\nLint Results:`)
  console.log(`  Errors: ${result.errorCount}`)
  console.log(`  Warnings: ${result.warningCount}`)

  if (result.issues.length > 0) {
    console.log('\nIssues:')
    for (const issue of result.issues) {
      console.log(`  [${issue.severity.toUpperCase()}] ${issue.ruleId}`)
      console.log(`    Token: ${issue.tokenName}`)
      console.log(`    Message: ${issue.message}`)
    }
  }
} catch (error) {
  console.error('Lint failed:', error)
}

if (lintOnly) {
  console.log('\n--lint-only flag detected, skipping build')
  process.exit(0)
}

console.log('\n--- Running build with lint enabled ---')

const result = await dispersa.build({
  lint: {
    enabled: true,
    failOnError: false,
    plugins: lintPlugins,
    rules: {
      ...lintRules,
      'dispersa/path-schema': [
        'warn',
        { segments: pathSchemaSegments, paths: pathSchemaPatterns, strict: false },
      ],
    },
  },
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

console.log('\n--- Build Results ---')
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

console.log('\n--- Demonstrating different configs ---')

console.log('\n1. Minimal config (rules only):')
console.log('   - dispersa/no-deprecated-usage: warn')

console.log('\n2. Recommended config (rules):')
console.log('   - dispersa/require-description: warn')
console.log('   - dispersa/naming-convention: warn')
console.log('   - dispersa/no-deprecated-usage: warn')

console.log('\n3. Strict config (rules):')
console.log('   - dispersa/require-description: error')
console.log('   - dispersa/naming-convention: error')
console.log('   - dispersa/no-deprecated-usage: error')
console.log('   - dispersa/no-duplicate-values: error')
console.log('   - dispersa/no-going-back: error')
console.log('   - dispersa/path-schema: error (component token structure)')

console.log('\n4. Custom plugin configs:')
console.log('   Recommended rules:')
console.log('     - custom/color-palette: warn')
console.log('     - custom/require-type: error')
console.log('   Strict rules:')
console.log('     - custom/color-palette: error')
console.log('     - custom/no-legacy-prefix: warn')
console.log('     - custom/semantic-depth: warn')
console.log('     - custom/require-type: error')
console.log('     - custom/token-prefix: warn')
