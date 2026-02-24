import { execSync } from 'node:child_process'
import { readFile, readdir, rm } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

const examplesDir = path.dirname(fileURLToPath(import.meta.url))

/** Recursively read all files in a directory, returning { relativePath: content }. */
async function readOutputFiles(dir: string, base = dir): Promise<Record<string, string>> {
  const result: Record<string, string> = {}
  const entries = await readdir(dir, { withFileTypes: true })

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      Object.assign(result, await readOutputFiles(fullPath, base))
    } else {
      const relPath = path.relative(base, fullPath)
      result[relPath] = await readFile(fullPath, 'utf-8')
    }
  }

  return result
}

/** Sort object keys for deterministic snapshots. */
function sortKeys<T>(obj: Record<string, T>): Record<string, T> {
  const sorted: Record<string, T> = {}
  for (const key of Object.keys(obj).sort()) {
    sorted[key] = obj[key] as T
  }
  return sorted
}

// Small examples: snapshot full file contents
const smallExamples = ['typescript-starter', 'split-by-type', 'custom-plugins']

// Examples with many file permutations
const largeExamples = ['multi-format', 'multi-brand', 'atlassian-semantic', 'multi-platform']

for (const example of smallExamples) {
  describe(example, () => {
    const dir = path.join(examplesDir, example)
    const outputDir = path.join(dir, 'output')

    beforeAll(async () => {
      await rm(outputDir, { recursive: true, force: true })
      execSync('pnpm build', { cwd: dir, stdio: 'pipe' })
    })

    afterAll(async () => {
      await rm(outputDir, { recursive: true, force: true })
    })

    it('should produce expected output', async () => {
      const files = sortKeys(await readOutputFiles(outputDir))
      expect(files).toMatchSnapshot()
    })
  })
}

for (const example of largeExamples) {
  describe(example, () => {
    const dir = path.join(examplesDir, example)
    const outputDir = path.join(dir, 'output')

    beforeAll(async () => {
      await rm(outputDir, { recursive: true, force: true })
      execSync('pnpm build', { cwd: dir, stdio: 'pipe' })
    })

    afterAll(async () => {
      await rm(outputDir, { recursive: true, force: true })
    })

    it('should produce expected file structure and content', async () => {
      const files = sortKeys(await readOutputFiles(outputDir))
      expect(files).toMatchSnapshot()
    })
  })
}

describe('in-memory', () => {
  it('should produce expected output', () => {
    const dir = path.join(examplesDir, 'in-memory')
    const stdout = execSync('pnpm build', {
      cwd: dir,
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
    })
    const normalized = stdout.replace(/^> .+ build .+\n/gm, '')
    expect(normalized).toMatchSnapshot()
  })
})

describe('cli-starter', () => {
  const dir = path.join(examplesDir, 'cli-starter')
  const outputDir = path.join(dir, 'dist')

  beforeAll(async () => {
    await rm(outputDir, { recursive: true, force: true })
    execSync('pnpm build', { cwd: dir, stdio: 'pipe' })
  })

  afterAll(async () => {
    await rm(outputDir, { recursive: true, force: true })
  })

  it('should produce expected output', async () => {
    const files = sortKeys(await readOutputFiles(outputDir))
    expect(files).toMatchSnapshot()
  })
})
