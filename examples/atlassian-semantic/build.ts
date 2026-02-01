#!/usr/bin/env tsx

import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { Dispersa, css, js, json } from 'dispersa'
import { nameCamelCase, nameKebabCase } from 'dispersa/transforms'
import fs from 'fs-extra'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const outputDir = path.join(__dirname, 'output')

const dispersa = new Dispersa({
  resolver: path.join(__dirname, 'tokens.resolver.json'),
  buildPath: outputDir,
})

async function buildAll() {
  await fs.emptyDir(outputDir)

  const result = await dispersa.build({
    outputs: [
      css({
        name: 'css',
        file: 'css/tokens.css',
        preset: 'bundle',
        preserveReferences: true,
        transforms: [nameKebabCase()],
      }),
      json({
        name: 'json',
        file: 'json/tokens-{theme}-{density}-{motion}.json',
        preset: 'standalone',
        structure: 'flat',
      }),
      js({
        name: 'js',
        file: 'js/tokens.js',
        preset: 'bundle',
        moduleName: 'tokens',
        structure: 'flat',
        transforms: [nameCamelCase()],
      }),
    ],
  })

  if (!result.success) {
    for (const error of result.errors ?? []) {
      // eslint-disable-next-line no-console
      console.error(error.message)
    }
    process.exit(1)
  }

  // eslint-disable-next-line no-console
  console.log(`✅ Built ${result.outputs.length} file(s) into output/`)
}

await buildAll()
