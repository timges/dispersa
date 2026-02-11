import { access } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { dirname, isAbsolute, resolve } from 'node:path'
import process from 'node:process'

import { Dispersa, type BuildConfig } from 'dispersa'
import { createJiti } from 'jiti'

import type { CliConfig } from './config'

type CliIO = {
  stdout: (message: string) => void
  stderr: (message: string) => void
}

type RunOptions = {
  cwd?: string
  io?: CliIO
}

const defaultConfigNames = [
  'dispersa.config.ts',
  'dispersa.config.js',
  'dispersa.config.mts',
  'dispersa.config.mjs',
  'dispersa.config.cts',
  'dispersa.config.cjs',
]

export async function runCli(args: string[], options: RunOptions = {}): Promise<number> {
  const cwd = options.cwd ?? process.cwd()
  const io: CliIO = options.io ?? {
    stdout: (message) => process.stdout.write(`${message}\n`),
    stderr: (message) => process.stderr.write(`${message}\n`),
  }

  const command = args[0] ?? 'build'
  if (command === '--help' || command === '-h' || command === 'help') {
    printHelp(io)
    return 0
  }

  if (command !== 'build') {
    io.stderr(`Unknown command: ${command}`)
    printHelp(io)
    return 1
  }

  const configPath = getArgValue(args, '--config')
  const verbose = hasFlag(args, '--verbose') || hasFlag(args, '-v')
  const resolvedPath = await resolveConfigPath(configPath, cwd)
  if (resolvedPath === undefined) {
    io.stderr(
      `No config found. Expected one of: ${defaultConfigNames.join(', ')} ` +
        'or pass --config <path>.',
    )
    return 1
  }

  if (verbose) {
    io.stdout(`Config: ${resolvedPath}`)
  }

  let config: CliConfig
  try {
    config = await loadConfig(resolvedPath, cwd)
  } catch (error) {
    io.stderr(`Failed to load config: ${resolvedPath}`)
    io.stderr(`- ${error instanceof Error ? error.message : String(error)}`)
    return 1
  }

  const configDir = dirname(resolvedPath)
  const normalizedConfig = normalizeConfigPaths(config, configDir)
  const { validation, resolver, buildPath, ...buildConfig } = normalizedConfig

  if (verbose) {
    const outputCount = buildConfig.outputs?.length ?? 0
    io.stdout(`Outputs: ${outputCount} configured`)
    if (buildPath) {
      io.stdout(`Build path: ${buildPath}`)
    }
  }

  const startTime = Date.now()
  const dispersa = new Dispersa({ resolver, buildPath, validation })
  const result = await dispersa.build(buildConfig as BuildConfig)
  const elapsed = Date.now() - startTime

  if (!result.success) {
    io.stderr('Build failed.')
    for (const error of result.errors ?? []) {
      io.stderr(`- [${error.code}] ${error.message}`)
      if (verbose && error.tokenPath) {
        io.stderr(`  Token: ${error.tokenPath}`)
      }
      if (verbose && error.path) {
        io.stderr(`  File: ${error.path}`)
      }
      if (verbose && error.suggestions && error.suggestions.length > 0) {
        io.stderr(`  Suggestions: ${error.suggestions.join(', ')}`)
      }
    }
    if (verbose) {
      io.stderr(`Duration: ${elapsed}ms`)
    }
    return 1
  }

  io.stdout('Build succeeded.')
  for (const output of result.outputs) {
    const location = output.path ?? '(in-memory)'
    io.stdout(`- ${output.name}: ${location}`)
  }

  if (verbose) {
    io.stdout(`Duration: ${elapsed}ms`)
  }

  return 0
}

function getArgValue(args: string[], flag: string): string | undefined {
  const index = args.indexOf(flag)
  if (index === -1 || index === args.length - 1) {
    return undefined
  }
  const value = args[index + 1]
  if (value == null || value.startsWith('-')) {
    return undefined
  }
  return value
}

function hasFlag(args: string[], flag: string): boolean {
  return args.includes(flag)
}

async function resolveConfigPath(
  configPath: string | undefined,
  cwd: string,
): Promise<string | undefined> {
  if (configPath) {
    const fullPath = resolve(cwd, configPath)
    if (!(await fileExists(fullPath))) {
      return undefined
    }
    return fullPath
  }

  for (const name of defaultConfigNames) {
    const fullPath = resolve(cwd, name)
    if (await fileExists(fullPath)) {
      return fullPath
    }
  }

  return undefined
}

async function loadConfig(configPath: string, cwd: string): Promise<CliConfig> {
  const alias = await buildAliasMap(cwd)
  const loader = createJiti(cwd, {
    interopDefault: true,
    alias,
  })
  const loaded = await loader(configPath)
  const config = (loaded as { default?: CliConfig }).default ?? (loaded as CliConfig)

  if (config == null || typeof config !== 'object') {
    throw new Error(`Invalid config: ${configPath} did not export an object`)
  }

  return config
}

function normalizeConfigPaths(config: CliConfig, configDir: string): CliConfig {
  const resolver =
    typeof config.resolver === 'string'
      ? resolveIfRelative(config.resolver, configDir)
      : config.resolver
  const buildPath = resolveIfRelative(config.buildPath, configDir)
  const outputs = (config.outputs ?? []).map((output) => ({
    ...output,
    file: resolveOutputFile(output.file, configDir),
  }))

  return {
    ...config,
    resolver,
    buildPath,
    outputs,
  }
}

function resolveIfRelative(value: string | undefined, baseDir: string): string | undefined {
  if (!value) {
    return value
  }
  return isAbsolute(value) ? value : resolve(baseDir, value)
}

function resolveOutputFile(
  file: string | ((inputs: Record<string, string>) => string) | undefined,
  baseDir: string,
): string | ((inputs: Record<string, string>) => string) | undefined {
  if (!file || typeof file === 'function') {
    return file
  }
  return isAbsolute(file) ? file : resolve(baseDir, file)
}

async function fileExists(path: string): Promise<boolean> {
  try {
    await access(path)
    return true
  } catch {
    return false
  }
}

async function buildAliasMap(cwd: string): Promise<Record<string, string>> {
  const alias: Record<string, string> = {}

  // Dev monorepo: point to source files for hot-reload
  const coreRoot = resolve(cwd, 'packages/core/src')
  const coreSourcePath = resolve(coreRoot, 'index.ts')
  if (await fileExists(coreSourcePath)) {
    alias['dispersa'] = coreSourcePath
    alias['@adapters'] = resolve(coreRoot, 'adapters')
    alias['@build'] = resolve(coreRoot, 'build')
    alias['@builders'] = resolve(coreRoot, 'builders')
    alias['@config'] = resolve(coreRoot, 'config')
    alias['@lib'] = resolve(coreRoot, 'lib')
    alias['@renderers'] = resolve(coreRoot, 'renderers')
    alias['@shared'] = resolve(coreRoot, 'shared')
    return alias
  }

  // Not resolvable from cwd — try from the CLI module's own location
  // (handles workspace symlinks and global installs)
  if (!isPackageResolvable('dispersa', cwd)) {
    const require = createRequire(import.meta.url)
    try {
      alias['dispersa'] = require.resolve('dispersa')
    } catch {
      // Not resolvable at all; config loading will fail with a clear error
    }
  }

  return alias
}

function isPackageResolvable(name: string, cwd: string): boolean {
  const require = createRequire(import.meta.url)
  try {
    require.resolve(name, { paths: [cwd] })
    return true
  } catch {
    return false
  }
}

function printHelp(io: CliIO): void {
  io.stdout('dispersa build [options]')
  io.stdout('')
  io.stdout('Options:')
  io.stdout('  --config <path>   Path to dispersa.config.(ts|js|mts|mjs|cts|cjs)')
  io.stdout('  --verbose, -v     Show detailed build output (timing, error context)')
}
