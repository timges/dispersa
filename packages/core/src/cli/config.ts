import type { LintConfig } from '@lint/types'
import type { BuildConfig, ValidationOptions } from 'dispersa'

export type CliConfig = BuildConfig & {
  validation?: ValidationOptions
  lint?: LintConfig
}

export function defineConfig(config: CliConfig): CliConfig {
  return config
}
