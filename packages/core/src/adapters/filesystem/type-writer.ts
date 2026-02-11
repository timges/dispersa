/**
 * @fileoverview TypeScript type file writer
 */

import { mkdir, writeFile } from 'node:fs/promises'
import * as path from 'node:path'

import { TypeGenerator, type TypeGeneratorOptions } from '@lib/codegen/type-generator'
import type { ResolvedTokens } from '@lib/tokens/types'

export type TypeWriterOptions = TypeGeneratorOptions & {
  fileName: string
}

export class TypeWriter {
  private generator: TypeGenerator

  constructor() {
    this.generator = new TypeGenerator()
  }

  /**
   * Write type definitions to file
   */
  async write(tokens: ResolvedTokens, options: TypeWriterOptions): Promise<void> {
    const content = this.generator.generate(tokens, options)
    const fileName = path.isAbsolute(options.fileName)
      ? options.fileName
      : path.resolve(process.cwd(), options.fileName)

    // Ensure directory exists
    await mkdir(path.dirname(fileName), { recursive: true })

    // Write file
    await writeFile(fileName, content, 'utf-8')
  }

  /**
   * Generate type definitions without writing to file
   */
  generate(tokens: ResolvedTokens, options?: TypeGeneratorOptions): string {
    return this.generator.generate(tokens, options)
  }
}
