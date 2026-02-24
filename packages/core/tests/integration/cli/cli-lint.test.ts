import { mkdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'

import { describe, expect, it } from 'vitest'

import { runCli } from '../../../src/cli/cli'
import { getFixturePath } from '../../utils/test-helpers'

describe('Dispersa CLI Lint', () => {
  const resolverPath = getFixturePath('tokens.resolver.json')
  const resolverDir = dirname(resolverPath)

  it('runs lint command and reports issues', async () => {
    const stdout: string[] = []
    const stderr: string[] = []
    const code = await runCli(['lint', '--config', getFixturePath('lint-error.config.ts')], {
      cwd: resolverDir,
      io: {
        stdout: (message) => stdout.push(message),
        stderr: (message) => stderr.push(message),
      },
    })

    expect(code).toBe(1)
    expect(stderr.join('\n')).toContain('Lint failed')

    await rm(join(resolverDir, 'dist'), { recursive: true, force: true })
  })

  it('runs lint with stylish format and reports warnings', async () => {
    const stdout: string[] = []
    const stderr: string[] = []
    const code = await runCli(['lint', '--config', getFixturePath('lint-warning.config.ts')], {
      cwd: resolverDir,
      io: {
        stdout: (message) => stdout.push(message),
        stderr: (message) => stderr.push(message),
      },
    })

    expect(code).toBe(0)
    expect(stdout.join('\n')).toContain('dispersa/require-description')
    expect(stdout.join('\n')).toContain('warning')

    await rm(join(resolverDir, 'dist'), { recursive: true, force: true })
  })

  it('runs lint with json format', async () => {
    const stdout: string[] = []
    const stderr: string[] = []
    const code = await runCli(
      ['lint', '--config', getFixturePath('lint-warning.config.ts'), '--format', 'json'],
      {
        cwd: resolverDir,
        io: {
          stdout: (message) => stdout.push(message),
          stderr: (message) => stderr.push(message),
        },
      },
    )

    expect(code).toBe(0)
    const output = stdout.join('\n')
    expect(() => JSON.parse(output)).not.toThrow()
    const parsed = JSON.parse(output)
    expect(parsed).toHaveProperty('issues')

    await rm(join(resolverDir, 'dist'), { recursive: true, force: true })
  })

  it('returns error when no lint config found', async () => {
    const tempDir = join(tmpdir(), `dispersa-cli-lint-no-config-${Date.now()}`)
    await mkdir(tempDir, { recursive: true })

    const configPath = join(tempDir, 'dispersa.config.ts')

    await writeFile(
      configPath,
      ['export default {', "  resolver: './tokens.resolver.json',", '  outputs: [],', '}', ''].join(
        '\n',
      ),
      'utf8',
    )

    const stdout: string[] = []
    const stderr: string[] = []
    const code = await runCli(['lint', '--config', configPath], {
      cwd: tempDir,
      io: {
        stdout: (message) => stdout.push(message),
        stderr: (message) => stderr.push(message),
      },
    })

    expect(code).toBe(1)
    expect(stderr.join('\n')).toContain('No lint configuration found')

    await rm(tempDir, { recursive: true, force: true })
  })

  it('returns error when no resolver config found', async () => {
    const tempDir = join(tmpdir(), `dispersa-cli-lint-no-resolver-${Date.now()}`)
    await mkdir(tempDir, { recursive: true })

    const configPath = join(tempDir, 'dispersa.config.ts')

    await writeFile(
      configPath,
      [
        "import { dispersaPlugin } from 'dispersa/lint'",
        '',
        'export default {',
        '  lint: {',
        '    plugins: { dispersa: dispersaPlugin },',
        '    rules: {},',
        '  },',
        '}',
        '',
      ].join('\n'),
      'utf8',
    )

    const stdout: string[] = []
    const stderr: string[] = []
    const code = await runCli(['lint', '--config', configPath], {
      cwd: tempDir,
      io: {
        stdout: (message) => stdout.push(message),
        stderr: (message) => stderr.push(message),
      },
    })

    expect(code).toBe(1)
    expect(stderr.join('\n')).toContain('No resolver configuration found')

    await rm(tempDir, { recursive: true, force: true })
  })

  it('shows help for lint command', async () => {
    const stdout: string[] = []
    const stderr: string[] = []
    const code = await runCli(['--help'], {
      io: {
        stdout: (message) => stdout.push(message),
        stderr: (message) => stderr.push(message),
      },
    })

    expect(code).toBe(0)
    expect(stdout.join('\n')).toContain('lint')
    expect(stdout.join('\n')).toContain('--format')
  })
})
