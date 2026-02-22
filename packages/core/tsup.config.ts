import { defineConfig } from 'tsup'
import path from 'path'

const sharedExternal = [
  'ajv',
  'ajv-formats',
  'change-case',
  'culori',
  'fast-glob',
  'json-ptr',
  'prettier',
]

const pathAliases = {
  '@build': path.resolve(__dirname, './src/build'),
  '@renderers': path.resolve(__dirname, './src/renderers'),
  '@adapters': path.resolve(__dirname, './src/adapters'),
  '@shared': path.resolve(__dirname, './src/shared'),
  '@config': path.resolve(__dirname, './src/config'),
  '@tokens': path.resolve(__dirname, './src/tokens'),
  '@codegen': path.resolve(__dirname, './src/codegen'),
  '@processing': path.resolve(__dirname, './src/processing'),
  '@resolution': path.resolve(__dirname, './src/resolution'),
  '@validation': path.resolve(__dirname, './src/validation'),
  '@lint': path.resolve(__dirname, './src/lint'),
  '@cli': path.resolve(__dirname, './src/cli'),
}

export default defineConfig([
  {
    entry: [
      'src/index.ts',
      'src/transforms.ts',
      'src/filters.ts',
      'src/builders.ts',
      'src/renderers.ts',
      'src/preprocessors.ts',
      'src/errors.ts',
      'src/lint.ts',
    ],
    format: ['esm', 'cjs'],
    dts: true,
    splitting: false,
    sourcemap: true,
    clean: true,
    treeshake: true,
    minify: false,
    external: sharedExternal,
    esbuildOptions(options) {
      options.alias = pathAliases
    },
  },
  {
    entry: ['src/cli/index.ts', 'src/cli/config.ts', 'src/cli/cli.ts'],
    outDir: 'dist/cli',
    format: ['esm'],
    dts: true,
    splitting: false,
    sourcemap: true,
    clean: false,
    treeshake: true,
    minify: false,
    external: [...sharedExternal, 'dispersa', 'jiti'],
    esbuildOptions(options) {
      options.alias = pathAliases
    },
  },
])
