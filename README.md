# Dispersa

A TypeScript build system for processing [DTCG 2025.10](https://www.designtokens.org/) design tokens. Dispersa loads resolver documents, resolves references and modifiers, applies filters and transforms, then renders output to CSS, JSON, and JS/TS modules.

## Features

- **DTCG 2025.10 compliant** -- full support for the resolver and token format specifications
- **Multiple outputs** -- CSS custom properties, JSON, JS/TS modules
- **Extensible pipeline** -- custom preprocessors, filters, transforms, and renderers
- **Schema validation** -- AJV runtime validation with schema-generated TypeScript types
- **In-memory mode** -- use without the filesystem for build tools, APIs, and testing
- **CLI** -- config-first workflow with auto-discovery

## Token types

**Standard DTCG types:** `color`, `dimension`, `fontFamily`, `fontWeight`, `duration`, `cubicBezier`, `number`

**Composite types:** `shadow`, `typography`, `border`, `strokeStyle`, `transition`, `gradient`

## Installation

```bash
pnpm add dispersa
```

## Quick start

Define a DTCG resolver document (`tokens.resolver.json`):

```json
{
  "version": "2025.10",
  "sets": {
    "core": {
      "sources": [{ "$ref": "./tokens/base.json" }, { "$ref": "./tokens/alias.json" }]
    }
  },
  "modifiers": {
    "theme": {
      "default": "light",
      "contexts": {
        "light": [{ "$ref": "./tokens/themes/light.json" }],
        "dark": [{ "$ref": "./tokens/themes/dark.json" }]
      }
    }
  },
  "resolutionOrder": [{ "$ref": "#/sets/core" }, { "$ref": "#/modifiers/theme" }]
}
```

Build tokens:

```typescript
import { Dispersa, css, json } from 'dispersa'
import { colorToHex, nameKebabCase } from 'dispersa/transforms'

const dispersa = new Dispersa({
  resolver: './tokens.resolver.json',
  buildPath: './dist',
})

const result = await dispersa.build({
  outputs: [
    css({
      name: 'css',
      file: 'tokens.css',
      preset: 'bundle',
      selector: ':root',
      transforms: [nameKebabCase(), colorToHex()],
    }),
    json({
      name: 'json',
      file: 'tokens-{theme}.json',
      preset: 'standalone',
      structure: 'flat',
    }),
  ],
})

if (result.success) {
  console.log(`Generated ${result.outputs.length} file(s)`)
}
```

## Output formats

Dispersa ships four builder functions. Each returns an `OutputConfig` that can be passed to `build()`.

### `css(config)`

Renders CSS custom properties.

| Option               | Type                                     | Default    | Description                                  |
| -------------------- | ---------------------------------------- | ---------- | -------------------------------------------- |
| `name`               | `string`                                 | --         | Unique output identifier                     |
| `file`               | `string \| function`                     | --         | Output path (supports `{modifier}` patterns) |
| `preset`             | `'bundle' \| 'standalone' \| 'modifier'` | `'bundle'` | Output preset                                |
| `selector`           | `string \| SelectorFunction`             | `':root'`  | CSS selector                                 |
| `mediaQuery`         | `string \| MediaQueryFunction`           | --         | Media query wrapper                          |
| `preserveReferences` | `boolean`                                | `false`    | Emit `var()` references for aliases          |
| `minify`             | `boolean`                                | `false`    | Minify output                                |
| `transforms`         | `Transform[]`                            | --         | Per-output transforms                        |
| `filters`            | `Filter[]`                               | --         | Per-output filters                           |

### `json(config)`

Renders JSON output.

| Option            | Type                       | Default        | Description                                  |
| ----------------- | -------------------------- | -------------- | -------------------------------------------- |
| `name`            | `string`                   | --             | Unique output identifier                     |
| `file`            | `string \| function`       | --             | Output path (supports `{modifier}` patterns) |
| `preset`          | `'bundle' \| 'standalone'` | `'standalone'` | Output preset                                |
| `structure`       | `'flat' \| 'nested'`       | --             | Token structure in output                    |
| `includeMetadata` | `boolean`                  | --             | Include DTCG metadata fields                 |
| `minify`          | `boolean`                  | --             | Minify output                                |
| `transforms`      | `Transform[]`              | --             | Per-output transforms                        |
| `filters`         | `Filter[]`                 | --             | Per-output filters                           |

### `js(config)`

Renders JavaScript/TypeScript modules.

| Option           | Type                       | Default        | Description                                  |
| ---------------- | -------------------------- | -------------- | -------------------------------------------- |
| `name`           | `string`                   | --             | Unique output identifier                     |
| `file`           | `string \| function`       | --             | Output path (supports `{modifier}` patterns) |
| `preset`         | `'bundle' \| 'standalone'` | `'standalone'` | Output preset                                |
| `structure`      | `'flat' \| 'nested'`       | --             | Token structure in output                    |
| `moduleName`     | `string`                   | --             | Module name for exports                      |
| `generateHelper` | `boolean`                  | --             | Generate token lookup helper (bundle mode)   |
| `minify`         | `boolean`                  | --             | Minify output                                |
| `transforms`     | `Transform[]`              | --             | Per-output transforms                        |
| `filters`        | `Filter[]`                 | --             | Per-output filters                           |

## Output presets

Presets control how modifier permutations are packaged into files.

**`standalone`** -- each permutation produces its own complete file. Use pattern-based filenames to distinguish them:

```typescript
css({
  name: 'css',
  file: 'tokens-{theme}.css',
  preset: 'standalone',
  selector: ':root',
})
// -> tokens-light.css, tokens-dark.css (each with all tokens)
```

**`bundle`** -- all permutations are bundled into a single file with format-specific grouping (CSS selectors, JSON keys, JS named exports):

```typescript
css({
  name: 'css',
  file: 'tokens.css',
  preset: 'bundle',
  selector: ':root',
})
// -> tokens.css with :root { ... } and [data-theme="dark"] { ... }
```

**`modifier`** -- CSS-only preset that emits only the tokens that differ per modifier context, not the full set:

```typescript
css({
  name: 'css',
  file: 'tokens.css',
  preset: 'modifier',
  selector: (modifierName, context, isBase) => {
    if (isBase) return ':root'
    return `[data-${modifierName}="${context}"]`
  },
})
```

## Built-in transforms

Import from `dispersa/transforms`. All transforms are factory functions that return a `Transform` object.

### Color

| Factory                  | Output                  |
| ------------------------ | ----------------------- |
| `colorToHex()`           | `#rrggbb` / `#rrggbbaa` |
| `colorToRgb()`           | `rgb()` / `rgba()`      |
| `colorToHsl()`           | `hsl()` / `hsla()`      |
| `colorToOklch()`         | `oklch()`               |
| `colorToOklab()`         | `oklab()`               |
| `colorToLch()`           | `lch()`                 |
| `colorToLab()`           | `lab()`                 |
| `colorToHwb()`           | `hwb()`                 |
| `colorToColorFunction()` | CSS `color()` function  |

### Dimension

| Factory                 | Output         |
| ----------------------- | -------------- |
| `dimensionToPx()`       | `"16px"`       |
| `dimensionToRem()`      | `"1rem"`       |
| `dimensionToUnitless()` | `16` (numeric) |

### Name

| Factory              | Output                      |
| -------------------- | --------------------------- |
| `nameKebabCase()`    | `color-brand-primary`       |
| `nameCamelCase()`    | `colorBrandPrimary`         |
| `nameSnakeCase()`    | `color_brand_primary`       |
| `namePascalCase()`   | `ColorBrandPrimary`         |
| `nameConstantCase()` | `COLOR_BRAND_PRIMARY`       |
| `nameCssVar()`       | `--color-brand-primary`     |
| `namePrefix(prefix)` | `ds-color-brand-primary`    |
| `nameSuffix(suffix)` | `color-brand-primary-token` |

### Other

| Factory                | Output             |
| ---------------------- | ------------------ |
| `fontWeightToNumber()` | `400`, `700`, etc. |
| `durationToMs()`       | `"200ms"`          |
| `durationToSeconds()`  | `"0.2s"`           |

## Built-in filters

Import from `dispersa/filters`. All filters are factory functions that return a `Filter` object.

| Factory           | Description                                                 |
| ----------------- | ----------------------------------------------------------- |
| `byType(type)`    | Include tokens matching the given `$type`                   |
| `byPath(pattern)` | Include tokens whose path matches a string or `RegExp`      |
| `isAlias()`       | Include only alias tokens (tokens referencing other tokens) |
| `isBase()`        | Include only base tokens (tokens with direct values)        |

```typescript
import { byType, isAlias } from 'dispersa/filters'

css({
  name: 'colors-only',
  file: 'colors.css',
  preset: 'bundle',
  filters: [byType('color')],
  transforms: [nameKebabCase(), colorToHex()],
})

css({
  name: 'semantic-only',
  file: 'semantic.css',
  preset: 'modifier',
  filters: [isAlias()],
  transforms: [nameKebabCase(), colorToHex()],
})
```

## Extending the pipeline

### Custom transforms

A `Transform` has an optional `matcher` (to scope which tokens it applies to) and a `transform` function:

```typescript
import type { Transform } from 'dispersa'

const addPrefix: Transform = {
  matcher: (token) => token.$type === 'color',
  transform: (token) => ({
    ...token,
    name: `brand-${token.name}`,
  }),
}
```

### Custom filters

A `Filter` has a single `filter` function that returns `true` to keep a token:

```typescript
import type { Filter } from 'dispersa'

const excludeDeprecated: Filter = {
  filter: (token) => !token.$deprecated,
}
```

### Custom preprocessors

A `Preprocessor` transforms raw token objects before parsing:

```typescript
import type { Preprocessor } from 'dispersa'

const stripMetadata: Preprocessor = {
  name: 'strip-metadata',
  preprocess: (rawTokens) => {
    const { _metadata, ...tokens } = rawTokens
    return tokens
  },
}

await dispersa.build({
  preprocessors: [stripMetadata],
  outputs: [
    /* ... */
  ],
})
```

### Custom renderers

Use `defineRenderer<T>()` to create type-safe custom renderers. The generic parameter gives you autocomplete and type-checking on both `context` and `options` inside `format()`:

```typescript
import { defineRenderer, outputTree } from 'dispersa'
import type { RenderContext } from 'dispersa'

// 1. Define your renderer-specific options
type SwiftUIOptions = {
  structName?: string
  accessLevel?: 'public' | 'internal'
}

// 2. Create the renderer with defineRenderer<T>()
const swiftUIRenderer = defineRenderer<SwiftUIOptions>({
  format(context, options) {
    const structName = options?.structName ?? 'DesignTokens'
    const access = options?.accessLevel ?? 'public'
    const tokens = context.permutations[0]?.tokens ?? {}

    const props = Object.entries(tokens)
      .map(([name, token]) => `    ${access} static let ${name} = ${JSON.stringify(token.$value)}`)
      .join('\n')

    return `import SwiftUI\n\n${access} struct ${structName} {\n${props}\n}\n`
  },
})

// 3. Use it in your build config
await dispersa.build({
  outputs: [
    {
      name: 'swift',
      renderer: swiftUIRenderer,
      file: 'DesignTokens.swift',
      options: { structName: 'AppTokens', accessLevel: 'public' },
      transforms: [nameCamelCase()],
    },
  ],
})
```

#### RenderContext

Every renderer receives a `RenderContext` with these fields:

| Field          | Type                           | Description                                                                                   |
| -------------- | ------------------------------ | --------------------------------------------------------------------------------------------- |
| `permutations` | `{ tokens, modifierInputs }[]` | Resolved tokens for each permutation (theme/platform combo)                                   |
| `output`       | `OutputConfig`                 | The current output configuration (name, file, options, transforms, filters)                   |
| `resolver`     | `ResolverDocument`             | The resolved DTCG resolver document                                                           |
| `meta`         | `RenderMeta`                   | Modifier metadata: `dimensions` (e.g. `['theme', 'platform']`), `defaults`, `basePermutation` |
| `buildPath`    | `string \| undefined`          | Output directory (undefined in in-memory mode)                                                |

#### Multi-file output with outputTree

When your renderer needs to produce multiple files, return an `OutputTree` instead of a string:

```typescript
import { defineRenderer, outputTree } from 'dispersa'

const multiFileRenderer = defineRenderer({
  format(context) {
    const files: Record<string, string> = {}

    for (const { tokens, modifierInputs } of context.permutations) {
      const content = Object.entries(tokens)
        .map(([name, token]) => `${name}: ${JSON.stringify(token.$value)}`)
        .join('\n')

      const key = Object.values(modifierInputs).join('-') || 'default'
      files[`tokens-${key}.yaml`] = content
    }

    return outputTree(files)
  },
})
```

#### Presets: bundle, standalone, modifier

The built-in renderers support three presets that control how permutations are handled:

| Preset       | Behavior                                                                      | Use case                 |
| ------------ | ----------------------------------------------------------------------------- | ------------------------ |
| `bundle`     | All permutations in one file (e.g. CSS cascade with `:root` + `[data-theme]`) | Single-file delivery     |
| `standalone` | One file per permutation (e.g. `tokens-light.css`, `tokens-dark.css`)         | Platform-specific builds |
| `modifier`   | Only the diff between a permutation and the base                              | Overlay/patch files      |

Custom renderers can use `context.meta.basePermutation` to determine which permutation is the base.

#### Composing transforms and filters with renderers

Each `OutputConfig` (returned by builders like `css()` or constructed manually) bundles transforms, filters, and a renderer together. Global transforms/filters from `BuildConfig` are applied first, then per-output transforms/filters:

```typescript
await dispersa.build({
  // Global: applied to ALL outputs
  transforms: [nameKebabCase()],
  filters: [byType('color')],

  outputs: [
    css({
      name: 'css',
      preset: 'bundle',
      // Per-output: applied AFTER global transforms
      transforms: [colorToHex()],
    }),
    {
      name: 'swift',
      renderer: swiftUIRenderer,
      // Per-output: applied AFTER global transforms
      transforms: [nameCamelCase()],
    },
  ],
})
```

## Dynamic selectors and media queries

The CSS builder accepts functions for `selector` and `mediaQuery`, giving full control over how rules are generated per modifier context:

```typescript
css({
  name: 'css',
  file: 'tokens.css',
  preset: 'bundle',
  selector: (modifierName, context, isBase, allInputs) => {
    if (isBase) return ':root'
    return `[data-${modifierName}="${context}"]`
  },
  mediaQuery: (modifierName, context, isBase) => {
    if (modifierName === 'platform' && context === 'mobile') {
      return '(max-width: 768px)'
    }
    return ''
  },
})
```

The function signature for both is:

```typescript
;(
  modifierName: string,
  context: string,
  isBase: boolean,
  allModifierInputs: Record<string, string>,
) => string
```

## Token references

Dispersa supports two reference mechanisms:

**Aliases** (`{token.name}`) reference another token's value within `$value`:

```json
{
  "color": {
    "primary": {
      "$type": "color",
      "$value": { "colorSpace": "srgb", "components": [0, 0.4, 0.8] }
    },
    "action": {
      "$type": "color",
      "$value": "{color.primary}"
    }
  }
}
```

**JSON Pointer `$ref`** references files, resolver sets, or property-level values:

```json
{
  "colors": {
    "blue": {
      "$type": "color",
      "$value": { "colorSpace": "srgb", "components": [0.2, 0.4, 0.9] }
    },
    "primary": {
      "$type": "color",
      "$ref": "#/colors/blue/$value"
    }
  }
}
```

Token-level `$ref` preserves the token shape and resolves into `$value`. When `$type` is missing on an alias or `$ref` token, it is inferred from the referenced token.

## In-memory mode

Dispersa can run entirely without the filesystem. Pass a `ResolverDocument` object directly and omit `buildPath` to get output content in memory:

```typescript
import type { ResolverDocument } from 'dispersa'
import { Dispersa, css } from 'dispersa'
import { colorToHex, nameKebabCase } from 'dispersa/transforms'

const resolver: ResolverDocument = {
  version: '2025.10',
  sets: {
    base: {
      sources: [
        {
          color: {
            primary: {
              $type: 'color',
              $value: { colorSpace: 'srgb', components: [0, 0.4, 0.8] },
            },
          },
        },
      ],
    },
  },
  resolutionOrder: [{ $ref: '#/sets/base' }],
}

const dispersa = new Dispersa({ resolver })

const result = await dispersa.build({
  outputs: [
    css({
      name: 'css',
      preset: 'bundle',
      selector: ':root',
      transforms: [nameKebabCase(), colorToHex()],
    }),
  ],
})

// Access generated content directly
for (const output of result.outputs) {
  console.log(output.content)
}
```

## Error handling

- **`build()`** returns a `BuildResult` object. It never throws.
- **`buildOrThrow()`** is the fail-fast variant that throws on invalid config, resolver errors, or build failures.

```typescript
type BuildResult = {
  success: boolean
  outputs: { name: string; path?: string; content: string }[]
  errors?: BuildError[]
}

type BuildError = {
  message: string
  code: ErrorCode
  path?: string // file path (for FILE_OPERATION errors)
  tokenPath?: string // token path (for TOKEN_REFERENCE, CIRCULAR_REFERENCE errors)
  severity: 'error' | 'warning'
  suggestions?: string[] // e.g. similar token names for TOKEN_REFERENCE errors
}
```

`ErrorCode` is a union of all failure types:

| Code                 | Description                                 |
| -------------------- | ------------------------------------------- |
| `TOKEN_REFERENCE`    | Unresolved alias reference (`{token.name}`) |
| `CIRCULAR_REFERENCE` | Circular alias chain detected               |
| `VALIDATION`         | Schema or structural validation failure     |
| `COLOR_PARSE`        | Invalid color value                         |
| `DIMENSION_FORMAT`   | Invalid dimension value                     |
| `FILE_OPERATION`     | File read/write failure                     |
| `CONFIGURATION`      | Invalid build or renderer configuration     |
| `BASE_PERMUTATION`   | Missing base permutation for bundle mode    |
| `MODIFIER`           | Invalid modifier input or context           |
| `UNKNOWN`            | Catch-all for unexpected errors             |

## Lifecycle hooks

Both `BuildConfig.hooks` (global) and `OutputConfig.hooks` (per-output) accept the same `LifecycleHooks` type. Global hooks fire once per build; per-output hooks fire in the context of each output.

```typescript
await dispersa.build({
  outputs: [
    css({
      name: 'css',
      preset: 'bundle',
      hooks: {
        onBuildStart: ({ config }) => {
          console.log(`[css] starting...`)
        },
        onBuildEnd: (result) => {
          console.log(`[css] ${result.success ? 'done' : 'failed'}`)
        },
      },
    }),
  ],
  hooks: {
    onBuildStart: ({ config }) => {
      console.log(`Building ${config.outputs.length} output(s)...`)
    },
    onBuildEnd: (result) => {
      if (result.success) {
        console.log(`Build succeeded: ${result.outputs.length} file(s)`)
      } else {
        console.error(`Build failed: ${result.errors?.length} error(s)`)
      }
    },
  },
})
```

**Execution order:**

| #   | Hook           | Scope      | When it fires                                   |
| --- | -------------- | ---------- | ----------------------------------------------- |
| 1   | `onBuildStart` | Global     | Before permutation resolution                   |
| 2   | `onBuildStart` | Per-output | Before each output is processed                 |
| 3   | `onBuildEnd`   | Per-output | After each output finishes (success or failure) |
| 4   | `onBuildEnd`   | Global     | After all outputs complete (success or failure) |

All hooks support both sync and async functions.

## CLI

Dispersa ships a CLI package (`dispersa-cli`) with a config-first workflow.

```bash
pnpm add dispersa-cli
```

```bash
dispersa build
dispersa build --config ./dispersa.config.ts
```

The CLI auto-discovers config files named `dispersa.config.(ts|js|mts|mjs|cts|cjs)`. Use `defineConfig` for type safety:

```typescript
// dispersa.config.ts
import { defineConfig } from 'dispersa-cli'
import { css, json } from 'dispersa'
import { colorToHex, nameKebabCase } from 'dispersa/transforms'

export default defineConfig({
  resolver: './tokens.resolver.json',
  buildPath: './dist',
  outputs: [
    css({
      name: 'css',
      file: 'tokens.css',
      preset: 'bundle',
      selector: ':root',
      transforms: [nameKebabCase(), colorToHex()],
    }),
    json({
      name: 'json',
      file: 'tokens-{theme}.json',
      preset: 'standalone',
      structure: 'flat',
    }),
  ],
})
```

## API reference

### `Dispersa` class

```typescript
const dispersa = new Dispersa(options?: DispersaOptions)
```

**Constructor options:**

| Option       | Type                                    | Description                                            |
| ------------ | --------------------------------------- | ------------------------------------------------------ |
| `resolver`   | `string \| ResolverDocument`            | Default resolver (file path or inline object)          |
| `buildPath`  | `string`                                | Default output directory                               |
| `validation` | `{ mode?: 'error' \| 'warn' \| 'off' }` | Validation behavior (`'warn'` logs via `console.warn`) |

**Methods:**

| Method                                      | Description                                           |
| ------------------------------------------- | ----------------------------------------------------- |
| `build(config)`                             | Build tokens. Returns `BuildResult` (never throws).   |
| `buildOrThrow(config)`                      | Build tokens. Throws on failure.                      |
| `buildPermutation(config, modifierInputs?)` | Build a single permutation.                           |
| `resolveTokens(resolver, modifierInputs?)`  | Resolve tokens for one permutation without rendering. |
| `resolveAllPermutations(resolver)`          | Resolve tokens for every permutation.                 |
| `generateTypes(tokens, fileName, options?)` | Generate a `.d.ts` file from resolved tokens.         |

### Subpath exports

| Export                   | Description                                                      |
| ------------------------ | ---------------------------------------------------------------- |
| `dispersa`               | `Dispersa` class, builder functions (`css`, `json`, `js`), types |
| `dispersa/transforms`    | Built-in transform factories                                     |
| `dispersa/filters`       | Built-in filter factories                                        |
| `dispersa/builders`      | Output builder functions                                         |
| `dispersa/renderers`     | Renderer types, `defineRenderer`, and `outputTree` helper        |
| `dispersa/preprocessors` | Preprocessor type                                                |
| `dispersa/errors`        | Error classes (`DispersaError`, `TokenReferenceError`, etc.)     |

Everything outside these entry points is internal and not a stable API contract.

## Pipeline overview

```
Resolver -> Preprocessors -> $ref resolution -> Parse/flatten -> Alias resolution -> Filters -> Transforms -> Renderers
```

1. **Resolver** -- loads sets and applies modifier contexts per the DTCG resolver spec
2. **Preprocessors** -- transform raw token objects before parsing
3. **$ref resolution** -- resolves JSON Pointer references within token documents
4. **Parse/flatten** -- resolves group extensions, validates names, flattens to dot-path keys
5. **Alias resolution** -- resolves `{token.name}` references with cycle detection
6. **Filters** -- removes tokens (global filters first, then per-output)
7. **Transforms** -- mutates token values and names (global first, then per-output)
8. **Renderers** -- formats tokens into the target output (CSS, JSON, JS, or custom)

## Examples

See [`examples/`](./examples/) for complete working projects. Suggested learning path:

| Example                                        | Focus                                         |
| ---------------------------------------------- | --------------------------------------------- |
| [`basic`](./examples/basic/)                   | Minimal setup with light/dark themes          |
| [`no-filesystem`](./examples/no-filesystem/)   | In-memory mode with inline tokens             |
| [`custom-plugins`](./examples/custom-plugins/) | Custom transforms, filters, and renderers     |
| [`advanced`](./examples/advanced/)             | Multi-modifier system with all output formats |
| [`enterprise`](./examples/enterprise/)         | Multi-brand, multi-platform at scale          |

## License

MIT
