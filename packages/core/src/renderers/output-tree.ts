import type { OutputTree } from './types'

export const outputTree = (files: Record<string, string>): OutputTree => {
  return {
    kind: 'outputTree',
    files,
  }
}

export const isOutputTree = (value: unknown): value is OutputTree => {
  return (
    typeof value === 'object' &&
    value !== null &&
    (value as { kind?: unknown }).kind === 'outputTree'
  )
}
