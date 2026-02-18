# AGENTS.md - Dispersa Development Guide

This guide helps agentic coding agents understand the Dispersa codebase structure, conventions, and workflows.

## Project Overview

Dispersa is a TypeScript monorepo for design token processing and transformation. It processes design tokens from various sources and outputs CSS, JSON, and JS formats.

**Structure:**

- `packages/core/` - Main dispersa library (includes CLI at `src/cli/`)
- `examples/` - Usage examples

## Development Commands

### Root Level (run from project root)

```bash
pnpm build          # Build all packages and sync README
pnpm test           # Run all tests across packages
pnpm lint           # ESLint across entire project
pnpm lint:fix       # Auto-fix linting issues
pnpm format         # Prettier formatting
pnpm format:check   # Check formatting without changes
pnpm typecheck      # TypeScript type checking
pnpm dev            # Development mode with watch
```

### Core Package (run from packages/core/)

```bash
# Testing
pnpm test                    # All tests
pnpm test:unit              # Unit tests only
pnpm test:integration       # Integration tests only
pnpm test:e2e              # End-to-end tests only
pnpm test:contract         # API contract tests
pnpm test:performance      # Performance benchmarks
pnpm test:watch           # Watch mode for development
pnpm test:coverage        # Generate coverage report

# Running single tests
pnpm test path/to/file.test.ts          # Single file
pnpm test --grep "transform"            # By pattern
pnpm test --reporter=verbose            # Verbose output

# Building
pnpm build          # Production build
pnpm dev            # Development build with watch
```

## Code Style Guidelines

### Formatting (Prettier)

```json
{
  "singleQuote": true,
  "semi": false,
  "trailingComma": "all",
  "tabWidth": 2,
  "printWidth": 100,
  "arrowParens": "always",
  "endOfLine": "lf"
}
```

### TypeScript Configuration

- Strict mode enabled
- ES2022 target with ESM modules (`"type": "module"`)
- Path aliases using @prefix: `@build`, `@renderers`, `@processing`, `@resolution`, `@tokens`, `@config`, `@shared`, `@validation`, `@adapters`, `@codegen`

### Import Order (ESLint enforced)

1. Built-in Node.js modules
2. External packages
3. Internal packages (with path aliases)
4. Parent/sibling/index imports

```typescript
// External dependencies
import { Dispersa } from 'dispersa'
import { formatCss } from 'culori'

// Internal path aliases
import type { Transform } from '@processing/transforms/types'
import { colorObjectToHex } from './color-converter'
```

### Naming Conventions

- **Files**: kebab-case (`color-transforms.ts`, `token-utils.ts`)
- **Folders**: kebab-case, plural for collections of things (`renderers/`, `tokens/`, `adapters/`), singular for domains/concerns (`resolution/`, `validation/`, `processing/`, `config/`, `build/`)
- **Type files**: `types.ts` inside their module directory (e.g. `renderers/types.ts`, `resolution/types.ts`)
- **Barrel exports**: `index.ts` in each module directory
- **Classes**: PascalCase (`Dispersa`, `TokenReferenceError`)
- **Functions**: camelCase (`colorToHex`, `formatDeprecationMessage`)
- **Constants**: UPPER_SNAKE_CASE (`DEFAULT_OPTIONS`)
- **Types**: PascalCase (`Transform`, `Filter`, `RenderContext`)
- **Interfaces**: No `I` prefix, follow TypeScript conventions

## Module Structure (packages/core/src/)

```
src/
├── index.ts              # Main public API
├── dispersa.ts           # Dispersa class
├── builders.ts           # Output builder functions (css, json, js, ...)
├── transforms.ts         # Subpath: dispersa/transforms
├── filters.ts            # Subpath: dispersa/filters
├── renderers.ts          # Subpath: dispersa/renderers
├── preprocessors.ts      # Subpath: dispersa/preprocessors
├── errors.ts             # Subpath: dispersa/errors
├── adapters/filesystem/  # File I/O, resolver loading/parsing
├── build/pipeline/       # Build orchestration and pipeline stages
├── cli/                  # CLI entry point and config
├── codegen/              # Type generation for tokens
├── config/               # BuildConfig, OutputConfig, DispersaOptions
├── processing/           # Transforms, filters, preprocessors
│   ├── filters/built-in/ # Built-in filter implementations
│   ├── transforms/built-in/ # Built-in transform implementations
│   └── preprocessors/    # Preprocessor types
├── renderers/bundlers/   # Format-specific renderers + bundling presets
├── resolution/           # Alias/reference resolution, modifier processing
├── shared/               # Cross-cutting: errors, utils, constants
├── tokens/               # Token types, parser, group extension resolver
└── validation/           # DTCG JSON schemas + AJV validation
```

### Import Rules

- Import types from their **source module**, not through re-exports
- `config/` only exports what it defines: `BuildConfig`, `OutputConfig`, `DispersaOptions`, `LifecycleHooks`, `FileFunction`
- `config/` and `renderers/types` have an accepted mutual type-only dependency (OutputConfig uses Renderer, RenderContext uses OutputConfig)
- Root-level files (`transforms.ts`, `filters.ts`, etc.) are curated subpath entry points -- they may differ from internal barrel exports

## Architecture Patterns

### Pipeline Architecture

Processing follows: `resolution → transform → render`

### Factory Functions

Transforms and filters use factory pattern:

```typescript
export const colorTransform = (options: ColorTransformOptions) => ({
  type: 'transform',
  name: 'colorTransform',
  process: async (token) => {
    /* ... */
  },
})
```

### Builder Pattern for Output

```typescript
const result = await dispersa.build({
  output: dispersa.output.css(), // .json(), .js()
  // ...config
})
```

### Error Handling

Use custom error hierarchy extending `DispersaError`:

```typescript
DispersaError (base)
├── TokenReferenceError
├── CircularReferenceError
├── ValidationError
├── FileOperationError
├── ConfigurationError
├── BasePermutationError
└── ModifierError
```

**Guidelines:**

- Include contextual information (token names, file paths, suggestions)
- Use `build()` returns `BuildResult`, `buildOrThrow()` throws
- Validation errors include AJV details and suggestions
- File operation errors wrap original error

## Testing Guidelines

### Test Structure

```
packages/core/tests/
├── unit/           # Individual function tests
├── integration/    # Component interaction tests
├── e2e/           # Complete workflow tests
├── contract/      # API stability tests
└── performance/   # Performance benchmarks
```

### Test Patterns

- Use `describe`, `it`, `expect` from Vitest
- Contract tests ensure API stability
- Snapshot tests for example outputs
- Coverage thresholds: 80% lines/functions/statements, 75% branches
- Performance tests use verbose reporting

### File Headers

All source files must include MIT license header:

```typescript
/**
 * @license MIT
 * Copyright (c) [year]-present [author]
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
```

### Documentation

- Use comprehensive JSDoc with `@example` blocks
- Include `@fileoverview` headers on files
- Maintain detailed README with multiple usage examples

## Key Dependencies

- **Build**: tsup (bundling), Vitest (testing)
- **Validation**: AJV (JSON schema validation)
- **Color**: culori (color space conversions)
- **Text**: change-case (naming conventions)
- **Files**: fast-glob, json-ptr
- **CLI**: jiti (dynamic ESM imports)

## Performance Considerations

- Use async/await for file operations
- Minimize transform overhead in hot paths
- Leverage fast-glob for efficient file pattern matching
- Use AJV compilation for repeated schema validation
