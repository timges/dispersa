/**
 * Test helper utilities
 */

import { constants as fsConstants } from 'node:fs'
import { access, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import * as os from 'node:os'
import * as path from 'node:path'

// Re-export fixture helpers from the canonical source
export { clearFixtureCache, getFixturesDir, getFixturePath, loadFixture } from './fixtures'

/**
 * Create a temporary directory for test outputs
 */
export async function createTempDir(prefix = 'dispersa-test-'): Promise<string> {
  const tempDir = await mkdtemp(path.join(os.tmpdir(), prefix))
  return tempDir
}

/**
 * Clean up a temporary directory
 */
export async function cleanupTempDir(tempDir: string): Promise<void> {
  await rm(tempDir, { recursive: true, force: true })
}

/**
 * Write content to a file in temp directory
 */
export async function writeTempFile(
  tempDir: string,
  filename: string,
  content: string,
): Promise<string> {
  const filePath = path.join(tempDir, filename)
  await mkdir(path.dirname(filePath), { recursive: true })
  await writeFile(filePath, content, 'utf-8')
  return filePath
}

/**
 * Read a file from temp directory
 */
export async function readTempFile(tempDir: string, filename: string): Promise<string> {
  const filePath = path.join(tempDir, filename)
  return readFile(filePath, 'utf-8')
}

/**
 * Check if file exists in temp directory
 */
export async function tempFileExists(tempDir: string, filename: string): Promise<boolean> {
  const filePath = path.join(tempDir, filename)
  try {
    await access(filePath, fsConstants.F_OK)
    return true
  } catch {
    return false
  }
}

/**
 * Normalize line endings for cross-outputs snapshot compatibility
 */
export function normalizeLineEndings(content: string): string {
  return content.replace(/\r\n/g, '\n')
}
