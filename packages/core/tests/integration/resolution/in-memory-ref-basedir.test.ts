import { mkdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import type { ResolverDocument } from '../../../src/resolution/resolution.types'
import { Dispersa } from '../../../src/dispersa'

describe('In-Memory Resolver BaseDir', () => {
  let tempDir: string
  let originalCwd: string

  beforeEach(async () => {
    originalCwd = process.cwd()
    tempDir = join(tmpdir(), `dispersa-inline-${Date.now()}`)
    await mkdir(tempDir, { recursive: true })
    process.chdir(tempDir)
  })

  afterEach(async () => {
    process.chdir(originalCwd)
    await rm(tempDir, { recursive: true, force: true })
  })

  it('resolves relative $ref files for inline resolver documents', async () => {
    const tokenFile = join(tempDir, 'tokens.json')
    await writeFile(
      tokenFile,
      JSON.stringify(
        {
          color: {
            primary: {
              $value: { colorSpace: 'srgb', components: [1, 0, 0] },
              $type: 'color',
            },
          },
        },
        null,
        2,
      ),
      'utf8',
    )

    const resolver: ResolverDocument = {
      version: '2025.10',
      sets: {
        base: {
          sources: [{ $ref: './tokens.json' }],
        },
      },
      resolutionOrder: [{ $ref: '#/sets/base' }],
    }

    const dispersa = new Dispersa()
    const tokens = await dispersa.resolveTokens(resolver)

    expect(tokens['color.primary'].$value).toEqual({
      colorSpace: 'srgb',
      components: [1, 0, 0],
    })
  })
})
