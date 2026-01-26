# In-Memory Mode Example

This example demonstrates using Token Forge completely in memory, without reading token files or writing output files to disk.

## When to Use In-Memory Mode

In-memory mode is ideal for:

- **🔌 Build Tool Plugins** - Vite, Webpack, Rollup, ESBuild plugins
- **🚀 Runtime Generation** - Generate tokens dynamically at runtime
- **✅ Testing & Validation** - CI/CD pipelines, unit tests
- **🌐 API Servers** - Serve tokens via HTTP endpoints
- **📊 Analysis Tools** - Token validation, documentation generators
- **🎨 Design Tools** - Figma plugins, design tool integrations

## Key Features

✨ **No Files Required** - Define tokens directly in code  
✨ **No Disk I/O** - All operations happen in memory  
✨ **Fast** - Skip file system operations for maximum speed  
✨ **Flexible** - Perfect for programmatic token generation

## Quick Start

```bash
cd in-memory-example
pnpm install
pnpm build
```

This will:

1. Define tokens inline (no token files)
2. Build all theme variations
3. Output content to console (no files written)

## Code Walkthrough

### 1. Define Tokens Inline

Instead of loading from files, define your resolver directly:

```typescript
import type { ResolverDocument } from '@token-forge/core'

const resolver: ResolverDocument = {
  version: '2025-10-01',
  sets: {
    base: {
      sources: [
        {
          color: {
            primary: {
              $type: 'color',
              $value: '#0066cc',
            },
          },
        },
      ],
    },
  },
  resolutionOrder: [{ $ref: '#/sets/base' }],
}
```

### 2. Create Token Forge Instance

Pass the resolver object directly (not a file path):

```typescript
const forge = new TokenForge({
  resolver, // Object, not string path
  // No buildPath - enables in-memory mode
})
```

### 3. Build Without Writing Files

When you omit `buildPath`, Token Forge returns content instead of writing files:

```typescript
const result = await forge.build({
  platforms: [
    {
      name: 'css',
      renderer: cssRenderer,
      // outputPath optional in in-memory mode
    },
  ],
})

// Access generated content
result.outputs.forEach((output) => {
  console.log(output.content) // String content
  console.log(output.path) // undefined (no file written)
})
```

### 4. Resolve Tokens Directly

Get resolved tokens without any renderers:

```typescript
// Resolve for specific modifier context
const lightTokens = await forge.resolveTokens(resolver, { theme: 'light' })
const darkTokens = await forge.resolveTokens(resolver, { theme: 'dark' })

// Access token values
const bgColor = lightTokens['semantic.background'].$value
```

### 5. Get All Permutations

Resolve all modifier combinations at once:

```typescript
const permutations = await forge.resolveAllPermutations(resolver)

permutations.forEach((perm) => {
  console.log(perm.modifierInputs) // { theme: 'light' }
  console.log(perm.tokens) // All resolved tokens
})
```

## API Reference

### In-Memory Build

```typescript
const forge = new TokenForge({
  resolver: resolverObject, // Pass object instead of path
  // Omit buildPath for in-memory mode
})

const result = await forge.build({
  // No buildPath needed
  platforms: [...],
})

// result.outputs contains generated content
result.outputs[0].content // Generated string
result.outputs[0].path // undefined
```

### Direct Token Resolution

```typescript
// Resolve with specific modifiers
const tokens = await forge.resolveTokens(resolver, {
  theme: 'dark',
  platform: 'mobile',
})

// Resolve all permutations
const permutations = await forge.resolveAllPermutations(resolver)
```

## Use Case Examples

### Build Tool Plugin

```typescript
// Example Vite plugin
export function tokenForgePlugin() {
  return {
    name: 'token-forge',
    async transform(code, id) {
      if (id.endsWith('.tokens.json')) {
        const forge = new TokenForge({ resolver: JSON.parse(code) })
        const result = await forge.build({
          platforms: [
            {
              name: 'css',
              renderer: cssRenderer,
            },
          ],
        })
        return result.outputs[0].content
      }
    },
  }
}
```

### API Endpoint

```typescript
// Example Express endpoint
app.get('/api/tokens/:theme', async (req, res) => {
  const forge = new TokenForge({ resolver })
  const tokens = await forge.resolveTokens(resolver, {
    theme: req.params.theme,
  })
  res.json(tokens)
})
```

### Testing

```typescript
// Example test
it('should generate valid CSS', async () => {
  const forge = new TokenForge({ resolver })
  const result = await forge.build({
    platforms: [{ name: 'css', renderer: cssRenderer }],
  })

  expect(result.success).toBe(true)
  expect(result.outputs[0].content).toContain('--color-primary')
})
```

## Performance Benefits

In-memory mode is significantly faster because it:

- ❌ No file system reads
- ❌ No file system writes
- ❌ No path resolution
- ✅ Direct memory operations
- ✅ Ideal for hot module replacement
- ✅ Perfect for CI/CD pipelines

## Comparison: File Mode vs In-Memory Mode

| Feature      | File Mode                     | In-Memory Mode            |
| ------------ | ----------------------------- | ------------------------- |
| Token Source | JSON files                    | JavaScript objects        |
| Output       | Written to files              | Returned as strings       |
| buildPath    | Required                      | Omit or undefined         |
| resolver     | File path string              | Object or file path       |
| Use Case     | CLI builds, static generation | Plugins, runtime, testing |
| Performance  | Slower (I/O)                  | Faster (memory only)      |

## Next Steps

- Try modifying the inline tokens in `build.ts`
- Experiment with different renderers
- Use the patterns in your own build tools
- Explore the [basic-example](../basic-example/) for file-based builds

## Learn More

- [Token Forge Documentation](../../README.md)
- [DTCG Resolver Specification](https://www.designtokens.org/tr/2025.10/resolver/)
