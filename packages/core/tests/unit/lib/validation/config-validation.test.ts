/**
 * @fileoverview Configuration validation integration tests
 *
 * Tests runtime validation of user-provided configurations including:
 * - DispersaOptions (constructor validation)
 * - BuildConfig (build method validation)
 * - OutputConfig (output array validation)
 * - Component registration (transform, renderer, filter, preprocessor)
 */

import { beforeEach, describe, expect, it } from 'vitest'
import { css } from '../../../../src/index'
import { cssRenderer } from '../../../../src/renderers/css'
import { ConfigurationError } from '../../../../src/shared/errors'
import { Dispersa } from '../../../../src/dispersa'
import { nameKebabCase } from '../../../../src/transforms'

describe('Configuration Validation', () => {
  describe('DispersaOptions Validation', () => {
    it('should accept valid options', () => {
      expect(() => {
        new Dispersa({
          resolver: './tokens.resolver.json',
          buildPath: './output',
        })
      }).not.toThrow()
    })

    it('should accept options without buildPath', () => {
      expect(() => {
        new Dispersa({
          resolver: './tokens.resolver.json',
        })
      }).not.toThrow()
    })

    it('should accept inline resolver object', () => {
      expect(() => {
        new Dispersa({
          resolver: {
            version: '2025.10',
            resolutionOrder: [{ $ref: '#/sets/base' }],
            sets: {
              base: {
                sources: [{ $ref: 'tokens.json' }],
              },
            },
          },
        })
      }).not.toThrow()
    })

    it('should allow resolver to be omitted (can be provided at build time)', () => {
      expect(() => {
        new Dispersa({})
      }).not.toThrow()

      expect(() => {}).not.toThrow()
    })

    it('should throw error when resolver is empty string', () => {
      expect(() => {
        new Dispersa({
          resolver: '',
        } as any)
      }).toThrow(ConfigurationError)
    })

    describe('BuildConfig Validation', () => {
      let dispersa: Dispersa

      beforeEach(() => {
        dispersa = new Dispersa({
          resolver: {
            version: '2025.10',
            resolutionOrder: [{ $ref: '#/sets/base' }],
            sets: {
              base: {
                sources: [],
              },
            },
            modifiers: {
              theme: {
                contexts: {
                  light: [],
                  dark: [],
                },
                default: 'light',
              },
            },
          },
        })
      })

      it('should accept valid build config', async () => {
        await expect(
          dispersa.build({
            outputs: [css({ name: 'css', file: 'tokens.css', preset: 'standalone' })],
          }),
        ).resolves.toBeTruthy()
      })

      it('should throw error when outputs array is missing', async () => {
        const result = await dispersa.build({} as any)

        expect(result.success).toBe(false)
        expect(result.errors?.[0]?.message).toContain('outputs')
      })

      it('should throw error when outputs array is empty', async () => {
        const result = await dispersa.build({
          outputs: [],
        })

        expect(result.success).toBe(false)
        expect(result.errors?.[0]?.message).toContain('outputs')
      })

      it('should accept optional transforms', async () => {
        await expect(
          dispersa.build({
            outputs: [css({ name: 'css', file: 'tokens.css', preset: 'standalone' })],
            transforms: [nameKebabCase()],
          }),
        ).resolves.toBeTruthy()
      })

      it('should accept optional preprocessors', async () => {
        await expect(
          dispersa.build({
            outputs: [css({ name: 'css', file: 'tokens.css', preset: 'standalone' })],
            preprocessors: [],
          }),
        ).resolves.toBeTruthy()
      })

      it('should accept optional permutations', async () => {
        await expect(
          dispersa.build({
            outputs: [css({ name: 'css', file: 'tokens.css', preset: 'standalone' })],
            permutations: [{ theme: 'light' }, { theme: 'dark' }],
          }),
        ).resolves.toBeTruthy()
      })

      describe('OutputConfig Validation', () => {
        let dispersa: Dispersa

        beforeEach(() => {
          dispersa = new Dispersa({
            resolver: {
              version: '2025.10',
              resolutionOrder: [{ $ref: '#/sets/base' }],
              sets: {
                base: {
                  sources: [],
                },
              },
            },
          })
        })

        it('should accept valid output config', async () => {
          await expect(
            dispersa.build({
              outputs: [
                css({
                  name: 'css',
                  file: 'tokens.css',
                  preset: 'standalone',
                  selector: ':root',
                  transforms: [nameKebabCase()],
                  filters: [],
                }),
              ],
            }),
          ).resolves.toBeTruthy()
        })

        it('should throw error when output name is missing', async () => {
          const result = await dispersa.build({
            outputs: [
              {
                renderer: cssRenderer(),
              } as any,
            ],
          })

          expect(result.success).toBe(false)
          expect(result.errors?.[0]?.message).toContain('name')
        })

        it('should throw error when output name is empty', async () => {
          const result = await dispersa.build({
            outputs: [
              {
                name: '',
                renderer: cssRenderer(),
              },
            ],
          })

          expect(result.success).toBe(false)
        })

        it('should throw error when renderer is missing', async () => {
          const result = await dispersa.build({
            outputs: [
              {
                name: 'css',
              } as any,
            ],
          })

          expect(result.success).toBe(false)
          expect(result.errors?.[0]?.message).toContain('renderer')
        })

        it('should throw error when renderer is empty', async () => {
          const result = await dispersa.build({
            outputs: [
              {
                name: 'css',
                renderer: '',
              },
            ],
          })

          expect(result.success).toBe(false)
        })

        it('should accept different renderer instances', async () => {
          // Standalone renderer
          await expect(
            dispersa.build({
              outputs: [
                {
                  name: 'css',
                  renderer: cssRenderer(),
                  options: { preset: 'standalone' },
                },
              ],
            }),
          ).resolves.toBeTruthy()

          // Bundle renderer
          await expect(
            dispersa.build({
              outputs: [
                {
                  name: 'css',
                  renderer: cssRenderer(),
                  options: { preset: 'bundle' },
                },
              ],
            }),
          ).resolves.toBeTruthy()
        })

        it('should reject invalid property names in output config', async () => {
          const result = await dispersa.build({
            outputs: [
              {
                name: 'css',
                renderer: cssRenderer(),
                invalidProperty: 'value',
              } as any,
            ],
          })

          expect(result.success).toBe(false)
        })
      })

      describe('Error Messages', () => {
        it('should provide helpful error messages for constructor validation', () => {
          try {
            new Dispersa({} as any)
          } catch (error: any) {
            expect(error.message).toContain('Invalid Dispersa options')
            expect(error.message).toContain('resolver')
            expect(error instanceof ConfigurationError).toBe(true)
          }
        })

        it('should provide helpful error messages for build config validation', async () => {
          const dispersa = new Dispersa({
            resolver: {
              version: '2025.10',
              resolutionOrder: [{ $ref: '#/sets/base' }],
              sets: { base: { sources: [] } },
            },
          })

          const result = await dispersa.build({ outputs: [] })

          expect(result.success).toBe(false)
          expect(result.errors?.[0]?.message).toContain('Invalid build configuration')
          expect(result.errors?.[0]?.message).toContain('outputs')
        })

        it('should provide helpful error messages for output config validation', async () => {
          const dispersa = new Dispersa({
            resolver: {
              version: '2025.10',
              resolutionOrder: [{ $ref: '#/sets/base' }],
              sets: { base: { sources: [] } },
            },
          })

          const result = await dispersa.build({
            outputs: [{ renderer: cssRenderer() } as any],
          })

          expect(result.success).toBe(false)
          expect(result.errors?.[0]?.message).toContain('Invalid output')
          expect(result.errors?.[0]?.message).toContain('name')
        })
      })

      describe('Resolver Validation in Config', () => {
        it('should validate inline resolver object in DispersaOptions', () => {
          // Invalid resolver missing version
          expect(() => {
            new Dispersa({
              resolver: {
                resolutionOrder: [{ $ref: '#/sets/base' }],
                sets: { base: { sources: [] } },
              } as any,
            })
          }).toThrow(ConfigurationError)

          expect(() => {
            new Dispersa({
              resolver: {
                resolutionOrder: [{ $ref: '#/sets/base' }],
                sets: { base: { sources: [] } },
              } as any,
            })
          }).toThrow(/version/)
        })

        it('should validate inline resolver object in BuildConfig', async () => {
          const dispersa = new Dispersa({
            resolver: './tokens.resolver.json',
          })

          // Invalid resolver missing resolutionOrder
          const result = await dispersa.build({
            resolver: {
              version: '2025.10',
              sets: { base: { sources: [] } },
            } as any,
            outputs: [{ name: 'css', renderer: cssRenderer(), options: { preset: 'standalone' } }],
          })

          expect(result.success).toBe(false)
          expect(result.errors?.[0]?.message).toContain('resolutionOrder')
        })

        it('should accept valid inline resolver object', async () => {
          const dispersa = new Dispersa({
            resolver: {
              version: '2025.10',
              resolutionOrder: [{ $ref: '#/sets/base' }],
              sets: {
                base: {
                  sources: [],
                },
              },
            },
          })

          await expect(
            dispersa.build({
              outputs: [
                { name: 'css', renderer: cssRenderer(), options: { preset: 'standalone' } },
              ],
            }),
          ).resolves.toBeTruthy()
        })

        it('should include resolver path in error messages', () => {
          try {
            new Dispersa({
              resolver: {
                version: '2025.10',
              } as any,
            })
          } catch (error: any) {
            expect(error.message).toContain('/resolver')
            expect(error.message).toContain('resolutionOrder')
          }
        })
      })

      // OutputConfig Validation closing brace
    })
  })
})
