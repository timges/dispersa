# Split-by-Type Example - Dispersa

Demonstrates how to split CSS output into **separate files by token category** using filters. Instead of a single `tokens.css`, this generates:

```
output/css/
  colors.css       - Color tokens only
  spacings.css     - Spacing tokens only
  typography.css   - Font family, size, and weight tokens
```

## Quick Start

```bash
cd split-by-type
pnpm install
pnpm build
```

## How It Works

Each output in the build config targets a different token category using a **filter**:

```typescript
outputs: [
  css({
    name: 'colors',
    file: 'css/colors.css',
    filters: [byType('color')],
    // ...
  }),
  css({
    name: 'spacings',
    file: 'css/spacings.css',
    filters: [byPath(/^spacing/)],
    // ...
  }),
  css({
    name: 'typography',
    file: 'css/typography.css',
    filters: [byPath(/^font/)],
    // ...
  }),
]
```

Each output runs the full pipeline independently - filters, transforms, and rendering are all scoped per output. Bundle features like `:root` and `[data-theme]` blocks work as expected in each file.

## Choosing Between `byType()` and `byPath()`

| Filter            | Best for                                     | Example                                                                |
| ----------------- | -------------------------------------------- | ---------------------------------------------------------------------- |
| `byType(type)`    | Categories that map 1:1 to a DTCG `$type`    | `byType('color')` - the `color` type is unique                         |
| `byPath(pattern)` | Categories that span multiple `$type` values | `byPath(/^font/)` - groups `fontFamily`, `fontWeight`, and `dimension` |

**Why not `byType('dimension')` for spacings?** Because `dimension` is shared between spacing tokens (`spacing.base.4 = 16px`) and font size tokens (`font.size.lg = 1.25rem`). Using `byPath(/^spacing/)` targets only the spacing namespace.

## Project Structure

```
split-by-type/
  tokens.resolver.json
  tokens/
    base.json                # Colors, spacing, and typography primitives
    alias.json               # Semantic aliases for all three categories
    themes/
      light.json             # Light theme color overrides
      dark.json              # Dark theme color overrides
  build.ts                   # Build script with three filtered outputs
  output/                    # Generated after build
    css/
      colors.css
      spacings.css
      typography.css
```
