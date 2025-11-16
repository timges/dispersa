import { defineConfig } from 'tsup'
import path from 'path'

export default defineConfig({
  entry: [
    'src/index.ts',
    'src/transforms.ts',
    'src/filters.ts',
    'src/builders.ts',
    'src/renderers.ts',
    'src/preprocessors.ts',
    'src/errors.ts',
  ],
  format: ['esm', 'cjs'],
  dts: true,
  splitting: false,
  sourcemap: true,
  clean: true,
  treeshake: true,
  minify: false,
  external: ['ajv', 'ajv-formats', 'change-case', 'culori', 'fast-glob', 'json-ptr', 'prettier'],
  esbuildOptions(options) {
    options.alias = {
      '@lib': path.resolve(__dirname, './src/lib'),
      '@build': path.resolve(__dirname, './src/build'),
      '@renderers': path.resolve(__dirname, './src/renderers'),
      '@adapters': path.resolve(__dirname, './src/adapters'),
      '@shared': path.resolve(__dirname, './src/shared'),
      '@config': path.resolve(__dirname, './src/config'),
      '@builders': path.resolve(__dirname, './src/builders'),
    }
  },
})
