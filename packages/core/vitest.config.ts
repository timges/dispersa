import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    exclude: ['tests/performance/**'], // Run performance tests separately
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/**/*.ts'],
      exclude: ['src/**/*.d.ts', 'src/**/types.ts', 'src/**/*.types.ts'],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 75,
        statements: 80,
      },
    },
    sequence: {
      hooks: 'stack',
    },
  },
  resolve: {
    alias: {
      '@codegen': path.resolve(__dirname, './src/codegen'),
      '@tokens': path.resolve(__dirname, './src/tokens'),
      '@processing': path.resolve(__dirname, './src/processing'),
      '@resolution': path.resolve(__dirname, './src/resolution'),
      '@validation': path.resolve(__dirname, './src/validation'),
      '@build': path.resolve(__dirname, './src/build'),
      '@builders': path.resolve(__dirname, './src/builders'),
      '@renderers': path.resolve(__dirname, './src/renderers'),
      '@adapters': path.resolve(__dirname, './src/adapters'),
      '@shared': path.resolve(__dirname, './src/shared'),
      '@config': path.resolve(__dirname, './src/config'),
      '@lint': path.resolve(__dirname, './src/lint'),
      '@cli': path.resolve(__dirname, './src/cli'),
    },
  },
})
