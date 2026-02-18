---
title: 'Building a Design Token Ecosystem: From Source of Truth to Automated Distribution'
published: false
description: 'Learn how to architect a scalable design token system with semantic layers, the DTCG standard, and an automated CI/CD pipeline that packages tokens for every platform.'
---

Every design system starts with a lie: "We'll keep the colors in sync manually."

Then reality hits. Your brand blue is `#0066CC` in CSS, `UIColor(red: 0, green: 0.4, blue: 0.8, alpha: 1)` in Swift, and `Color(0xFF0066CC)` in Kotlin. Someone updates the web app. Nobody tells the mobile team. A designer changes the value in Figma. Three weeks later, you're staring at five shades of "the same blue" across your product.

Design tokens solve this. And when you pair them with the right architecture, a standard format, and a bit of CI automation, you get something powerful: a single source of truth that ships platform-ready values to every team, every time.

In this article, we'll build exactly that -- from zero to an automated token pipeline that publishes an npm package on every push. We'll use [Dispersa](https://dispersa.dev), a DTCG-native build system for design tokens, to process everything.

---

## What Are Design Tokens?

A design token is a **named, platform-agnostic design decision**. Instead of hard-coding `#0066CC` everywhere, you define it once as `color.brand.primary` and let tooling transform it into whatever each platform needs.

```
Token:  color.brand.primary
  ├─ CSS:      --color-brand-primary: #0066cc;
  ├─ JSON:     { "color.brand.primary": "#0066cc" }
  ├─ Swift:    static let colorBrandPrimary = Color(red: 0, green: 0.4, blue: 0.8)
  └─ Kotlin:   val ColorBrandPrimary = Color(0xFF0066CC)
```

Tokens typically capture colors, spacing, typography, shadows, borders, durations -- anything that represents a reusable design decision. The key insight is that the _name_ carries the intent, while the _value_ is an implementation detail that can change per platform, theme, or brand.

---

## What's DTCG?

If tokens are the idea, DTCG sets the language.

The [Design Tokens Community Group](https://www.designtokens.org/) (part of the W3C) maintains an open specification for how design tokens should be defined. The current standard is **DTCG 2025.10**, which covers the token format, color spaces, composite types, and a resolver system for organizing tokens into sets and themes.

Why does a standard matter?

- **Interoperability.** Tokens defined in DTCG format can be consumed by any tool that supports the spec -- no vendor lock-in.
- **Richness.** DTCG supports 13 token types (from simple colors and dimensions to composite types like `typography`, `shadow`, and `gradient`), proper color space definitions, and alias references out of the box.
- **Future-proofing.** As design tooling converges on this standard, your tokens won't need to be rewritten.

Here's what a DTCG token looks like:

```json
{
  "color": {
    "brand": {
      "primary": {
        "$type": "color",
        "$value": {
          "colorSpace": "srgb",
          "components": [0, 0.4, 0.8]
        },
        "$description": "Primary brand blue"
      }
    }
  }
}
```

Every token has a `$value` (the actual design decision) and a `$type` (what kind of token it is). Groups are represented by nesting -- the path `color.brand.primary` is implicit in the JSON structure. The `$description` field is optional but invaluable for documentation.

---

## Token Architecture: Thinking in Layers

Not all tokens are created equal. A well-architected token system organizes tokens into **layers**, each with a distinct role. This separation is what makes your token system scalable and maintainable.

### Layer 1: Base Tokens (The Palette)

Base tokens are the raw building blocks. They define _what exists_ without implying _how it's used_. Think of them as your design vocabulary.

```json
{
  "color": {
    "palette": {
      "$description": "Foundational color swatches",
      "blue-500": {
        "$type": "color",
        "$value": { "colorSpace": "srgb", "components": [0, 0.4, 0.8] },
        "$description": "Primary blue"
      },
      "blue-600": {
        "$type": "color",
        "$value": { "colorSpace": "srgb", "components": [0, 0.33, 0.67] },
        "$description": "Darker blue for hover states"
      },
      "gray-100": {
        "$type": "color",
        "$value": { "colorSpace": "srgb", "components": [0.96, 0.96, 0.97] },
        "$description": "Lightest gray"
      },
      "gray-900": {
        "$type": "color",
        "$value": { "colorSpace": "srgb", "components": [0.1, 0.11, 0.12] },
        "$description": "Darkest gray"
      }
    }
  }
}
```

Base tokens use neutral, descriptive names: `blue-500`, `gray-900`, `red-500`. They don't tell you where to use them -- that's the job of the next layer.

### Layer 2: Alias Tokens (The Intent)

Alias tokens reference base tokens and assign _meaning_. They answer the question: "What is this color _for_?" Notice how we organize by **concept** (text, background, surface, action, border) rather than lumping everything under a generic "semantic" bucket:

```json
{
  "color": {
    "text": {
      "$type": "color",
      "$description": "Text color tokens",
      "default": {
        "$value": "{color.palette.gray-900}",
        "$description": "Primary text color"
      },
      "muted": {
        "$root": {
          "$value": "{color.palette.gray-500}",
          "$description": "Secondary / de-emphasized text"
        },
        "disabled": {
          "$value": "{color.palette.gray-300}",
          "$description": "Disabled text color"
        }
      },
      "danger": {
        "$root": {
          "$value": "{color.palette.red-500}",
          "$description": "Danger / error text color"
        },
        "muted": {
          "$value": "{color.palette.red-400}",
          "$description": "Subdued danger text color"
        }
      }
    },
    "background": {
      "$type": "color",
      "default": {
        "$value": "{color.palette.white}",
        "$description": "Page background"
      },
      "danger": {
        "subtle": {
          "$value": "{color.palette.red-100}",
          "$description": "Subtle danger background"
        }
      }
    },
    "surface": {
      "$type": "color",
      "default": {
        "$value": "{color.palette.gray-100}",
        "$description": "Elevated surface (cards, panels)"
      }
    },
    "action": {
      "$type": "color",
      "brand": {
        "$root": {
          "$value": "{color.palette.blue-500}",
          "$description": "Primary brand action color"
        },
        "hover": {
          "$value": "{color.palette.blue-600}",
          "$description": "Primary action hover"
        }
      }
    },
    "border": {
      "$type": "color",
      "default": {
        "$root": {
          "$value": "{color.palette.gray-300}",
          "$description": "Default border color"
        },
        "focus": {
          "$value": "{color.palette.blue-500}",
          "$description": "Focused border color"
        }
      }
    }
  }
}
```

The `$value` syntax `"{color.palette.blue-500}"` is an **alias reference**. It doesn't contain a raw color -- it points to the base token. This indirection is what makes theming possible (more on that soon) and keeps your system refactorable. If your brand blue changes, you update one base token and every alias token that references it updates automatically.

You'll notice the **`$root`** pattern on tokens like `color.text.muted` and `color.action.brand`. In DTCG, a node can't be both a token (with `$value`) and a group (with children) at the same time. `$root` solves this: it holds the value for the node itself while allowing children to sit alongside it. So `color.text.muted` resolves to the `$root` value, while `color.text.muted.disabled` is a separate token one level deeper.

The concept-based grouping means every token _path_ carries intent: `color.text.danger.muted` tells you exactly what the token is for -- danger text, de-emphasized.

### Layer 3: Component Tokens (Optional, and Often Premature)

Component tokens map alias tokens to specific UI elements:

```json
{
  "button": {
    "background": {
      "default": { "$value": "{color.action.brand}" },
      "hover": { "$value": "{color.action.brand.hover}" }
    }
  }
}
```

**My advice: don't start here.** Component tokens add a third layer of indirection that's hard to justify until your system has dozens of components with genuinely different token needs. Start with base + alias. You can always add the component layer later when the need becomes clear.

![Diagram that displays the cascading of token layers. Component -> Alias -> Base](https://dev-to-uploads.s3.amazonaws.com/uploads/articles/vw04l8laqrchab3uvngz.png)

---

## Token Naming: A Six-Layer Path Convention

Good naming is half the battle. A consistent naming convention makes tokens discoverable, predictable, and self-documenting. You need enough structure to express _what_ a token is for, _which variant_ of it, _what state_ it's in, and _what size_ -- without collapsing those distinct concerns into a single grab-bag.

Here's a convention built on six explicit layers:

```
category.concept.sentiment.prominence.state.scale
```

| Layer          | Purpose                   | Values                                                                                                                        |
| -------------- | ------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| **category**   | Token type or domain      | `color`, `spacing`, `typography`, `shadow`, `size`, `...`                                                                     |
| **concept**    | What it's used for        | `text`, `background`, `surface`, `action`, `border`, `icon`, `overlay`, `gap`, `inset`, `heading`, `body`, `elevation`, `...` |
| **sentiment**  | Semantic intent or role   | `neutral`, `brand`, `danger`, `success`, `warning`, `info`, `...`                                                             |
| **prominence** | Visual weight or emphasis | `default`, `muted`, `subtle`, `strong`, `inverse`, `...`                                                                      |
| **state**      | Interaction state         | `hover`, `active`, `focus`, `disabled`, `selected`, `...`                                                                     |
| **scale**      | Size or intensity step    | `xs`, `sm`, `md`, `lg`, `xl`, `2xl`, `...`                                                                                    |

Each layer has its own **distinct vocabulary** -- the values never overlap between layers. This is key: it means layers can be omitted when they're not needed, and there's never ambiguity about which layer a segment belongs to. `muted` is always prominence. `danger` is always sentiment. `hover` is always state. `md` is always scale.

Different token categories lean on different layers. Color tokens typically use concept through state and skip scale. Spacing, typography, and shadow tokens typically use concept and scale, skipping the middle layers. The convention is the same -- each category just uses the subset it needs.

### How Layers Compose

Most tokens use two to four layers. Here's how they build up:

| Token path                         | Layers used                                         |
| ---------------------------------- | --------------------------------------------------- |
| `color.text.default`               | category + concept + prominence                     |
| `color.text.danger`                | category + concept + sentiment                      |
| `color.text.muted.disabled`        | category + concept + prominence + state             |
| `color.background.danger.subtle`   | category + concept + sentiment + prominence         |
| `color.action.brand.default.hover` | category + concept + sentiment + prominence + state |
| `spacing.gap.md`                   | category + concept + scale                          |
| `typography.heading.lg`            | category + concept + scale                          |

**The ordering rule:** you can skip layers, but you can never go back. Every token path must be a subsequence of the full six-layer order. The layers are arranged from broadest classification to most specific, so once you've "moved past" a layer, you can't return to it.

This means `color.text.danger.muted` is valid (sentiment before prominence), but `color.text.muted.danger` is not (prominence before sentiment -- going backwards). If you want a "muted danger text," the path is always `color.text.danger.muted` -- role first, then emphasis.

A comprehensive view across categories:

| Token path                          | Category   | Concept    | Sentiment | Prominence | State    | Scale |
| ----------------------------------- | ---------- | ---------- | --------- | ---------- | -------- | ----- |
| `color.text.default`                | color      | text       | --        | default    | --       | --    |
| `color.text.muted`                  | color      | text       | --        | muted      | --       | --    |
| `color.text.danger`                 | color      | text       | danger    | --         | --       | --    |
| `color.text.danger.muted`           | color      | text       | danger    | muted      | --       | --    |
| `color.text.muted.disabled`         | color      | text       | --        | muted      | disabled | --    |
| `color.background.default`          | color      | background | --        | default    | --       | --    |
| `color.background.danger.subtle`    | color      | background | danger    | subtle     | --       | --    |
| `color.surface.default`             | color      | surface    | --        | default    | --       | --    |
| `color.action.brand`                | color      | action     | brand     | --         | --       | --    |
| `color.action.brand.hover`          | color      | action     | brand     | --         | hover    | --    |
| `color.action.danger.strong.active` | color      | action     | danger    | strong     | active   | --    |
| `color.border.default`              | color      | border     | --        | default    | --       | --    |
| `color.border.default.focus`        | color      | border     | --        | default    | focus    | --    |
| `color.icon.success`                | color      | icon       | success   | --         | --       | --    |
| `spacing.gap.md`                    | spacing    | gap        | --        | --         | --       | md    |
| `spacing.inset.lg`                  | spacing    | inset      | --        | --         | --       | lg    |
| `typography.heading.lg`             | typography | heading    | --        | --         | --       | lg    |
| `typography.body.sm`                | typography | body       | --        | --         | --       | sm    |
| `shadow.elevation.md`               | shadow     | elevation  | --        | --         | --       | md    |

### The Principles

1. **Intent over implementation.** `color.action.brand` instead of `color.blue-500`. When your brand color changes from blue to purple, you rename zero tokens.
2. **Predictability.** If a developer knows `color.text.default` exists, they can guess that `color.text.muted` and `color.text.subtle` probably do too.
3. **Orthogonal layers.** Sentiment, prominence, state, and scale answer different questions: "what role?", "how loud?", "what interaction?", and "what size?" Keeping them separate prevents naming collisions and makes the system composable.
4. **No going back.** Layers always appear in the canonical order. You can skip, but you can't reorder. This keeps every path unambiguous and self-describing.

### Mapping to DTCG JSON

Each layer becomes a nesting level in the JSON structure:

```json
{
  "color": {
    "text": {
      "$type": "color",
      "default": { "$value": "{color.palette.gray-900}" },
      "muted": {
        "$root": { "$value": "{color.palette.gray-500}" },
        "disabled": { "$value": "{color.palette.gray-300}" }
      },
      "danger": { "$value": "{color.palette.red-500}" }
    },
    "action": {
      "$type": "color",
      "brand": {
        "$root": { "$value": "{color.palette.blue-500}" },
        "hover": { "$value": "{color.palette.blue-600}" }
      }
    }
  },
  "spacing": {
    "gap": {
      "$type": "dimension",
      "sm": { "$value": "{spacing.scale.sm}" },
      "md": { "$value": "{spacing.scale.md}" },
      "lg": { "$value": "{spacing.scale.lg}" }
    }
  }
}
```

Dispersa flattens this structure during parsing, so `color.text.muted` and `color.action.brand.hover` are exactly the token paths you'll see in your build output.

---

## Setting Up the Source of Truth

Let's build a real token repository. We'll use [Dispersa](https://dispersa.dev) to process and build our tokens.

### Scaffold the Project

```bash
pnpm create dispersa
```

Choose the **CLI** template when prompted -- it gives you a config-file workflow with `dispersa build`. After scaffolding, your project looks like this:

```
design-tokens/
├── tokens/
│   ├── base/
│   │   ├── colors.json
│   │   ├── typography.json
│   │   ├── spacing.json
│   │   └── effects.json
│   ├── alias/
│   │   ├── colors.json
│   │   ├── typography.json
│   │   ├── spacing.json
│   │   └── effects.json
│   └── themes/
│       ├── light.json
│       └── dark.json
├── tokens.resolver.json
├── dispersa.config.ts
└── package.json
```

### The Resolver: Assembling Your Tokens

The resolver document is the heart of the system. It tells Dispersa _which_ token files to load, _how_ to merge them, and _what_ variations (themes, densities, brands) to produce.

```json
{
  "$schema": "https://www.designtokens.org/schemas/2025.10/resolver.json",
  "name": "My Design Tokens",
  "version": "2025.10",
  "description": "Design tokens with light/dark themes",
  "sets": {
    "colors": {
      "description": "Color palette and alias colors",
      "sources": [{ "$ref": "./tokens/base/colors.json" }, { "$ref": "./tokens/alias/colors.json" }]
    },
    "typography": {
      "description": "Font families, sizes, weights, and line heights",
      "sources": [
        { "$ref": "./tokens/base/typography.json" },
        { "$ref": "./tokens/alias/typography.json" }
      ]
    },
    "spacing": {
      "description": "Spacing scale and alias spacing",
      "sources": [
        { "$ref": "./tokens/base/spacing.json" },
        { "$ref": "./tokens/alias/spacing.json" }
      ]
    },
    "effects": {
      "description": "Shadows and elevation",
      "sources": [
        { "$ref": "./tokens/base/effects.json" },
        { "$ref": "./tokens/alias/effects.json" }
      ]
    }
  },
  "modifiers": {
    "theme": {
      "description": "Theme variations",
      "default": "light",
      "contexts": {
        "light": [{ "$ref": "./tokens/themes/light.json" }],
        "dark": [{ "$ref": "./tokens/themes/dark.json" }]
      }
    }
  },
  "resolutionOrder": [
    { "$ref": "#/sets/colors" },
    { "$ref": "#/sets/typography" },
    { "$ref": "#/sets/spacing" },
    { "$ref": "#/sets/effects" },
    { "$ref": "#/modifiers/theme" }
  ]
}
```

A few things to unpack:

- **Sets** are groups of token source files. The `colors` set loads base colors first, then alias colors on top. Order matters -- later sources override earlier ones for the same token path.
- **Modifiers** define variations. Here, the `theme` modifier has two contexts: `light` and `dark`. Each context provides override files that replace specific alias tokens.
- **Resolution order** controls how everything merges. Sets are loaded first (building the complete token tree), then modifiers apply their overrides.

### The Build Configuration

The `dispersa.config.ts` file defines what outputs you want:

```typescript
import { css, json } from 'dispersa'
import { colorToHex, dimensionToRem, fontWeightToNumber } from 'dispersa/transforms'
import { defineConfig } from 'dispersa/config'

export default defineConfig({
  resolver: './tokens.resolver.json',
  buildPath: './dist',
  outputs: [
    css({
      name: 'css-bundle',
      file: 'tokens.css',
      preset: 'bundle',
      preserveReferences: true,
      transforms: [colorToHex(), dimensionToRem(), fontWeightToNumber()],
    }),
    json({
      name: 'json-tokens',
      file: 'tokens-{theme}.json',
      preset: 'standalone',
      structure: 'flat',
    }),
  ],
})
```

Each output specifies:

- **Transforms** -- how to convert token names and values. The CSS builder automatically applies `nameKebabCase()` to turn `color.text.default` into `color-text-default`. `colorToHex()` converts the DTCG sRGB color object to `#0066cc`. `dimensionToRem()` turns pixel dimensions into rem values.
- **Preset** -- how to handle modifier permutations. `bundle` puts everything in a single file. `standalone` generates one file per permutation (one per theme, in our case).
- **`preserveReferences`** -- when `true`, alias tokens emit `var(--other-token)` instead of the resolved value. This is exactly what you want for CSS.

### Build It

```bash
pnpm dispersa build
```

The output:

```
dist/
├── tokens.css          # Bundled CSS with all themes
├── tokens-light.json   # Flat JSON for the light theme
└── tokens-dark.json    # Flat JSON for the dark theme
```

The bundled CSS file contains your tokens as custom properties:

```css
:root {
  --color-palette-blue-500: #0066cc;
  --color-palette-blue-600: #0054ab;
  --color-palette-green-500: #21ad4c;
  /* ... more palette tokens ... */
  --color-text-default: var(--color-palette-gray-900);
  --color-text-muted: var(--color-palette-gray-500);
  --color-text-muted-disabled: var(--color-palette-gray-300);
  --color-background-default: var(--color-palette-white);
  --color-surface-default: var(--color-palette-gray-100);
  --color-action-brand: var(--color-palette-blue-500);
  --color-action-brand-hover: var(--color-palette-blue-600);
  --color-border-default: var(--color-palette-gray-300);
  --color-border-default-focus: var(--color-palette-blue-500);
  /* ... */
  --spacing-gap-sm: 0.5rem;
  --spacing-gap-md: 1rem;
  --spacing-gap-lg: 1.5rem;
}

[data-theme='dark'] {
  --color-text-default: var(--color-palette-gray-100);
  --color-text-muted: var(--color-palette-gray-400);
  --color-background-default: var(--color-palette-gray-900);
  --color-surface-default: var(--color-palette-gray-700);
  --color-border-default: var(--color-palette-gray-700);
}
```

Notice how the dark theme only overrides the tokens that change. That's the power of the alias layer: the dark theme swaps which base tokens the alias names point to, and `preserveReferences` keeps those relationships intact in CSS.

---

## Theming with Modifiers

The resolver's modifier system is what makes theming declarative. Instead of maintaining separate token sets for each theme, you define a base set and overlay modifiers that only contain the differences.

The dark theme file is small -- it only redefines the alias tokens that need to change:

```json
{
  "$description": "Dark theme overrides",
  "color": {
    "text": {
      "$type": "color",
      "default": {
        "$value": "{color.palette.gray-100}",
        "$description": "Light text on dark background"
      },
      "muted": {
        "$root": {
          "$value": "{color.palette.gray-400}",
          "$description": "Muted text on dark background"
        }
      }
    },
    "background": {
      "$type": "color",
      "default": {
        "$value": "{color.palette.gray-900}",
        "$description": "Dark page background"
      }
    },
    "surface": {
      "$type": "color",
      "default": {
        "$value": "{color.palette.gray-700}",
        "$description": "Dark surface for cards"
      }
    },
    "border": {
      "$type": "color",
      "default": {
        "$root": {
          "$value": "{color.palette.gray-700}",
          "$description": "Dark border color"
        }
      }
    }
  }
}
```

This is where the two-layer architecture pays off. The dark theme doesn't redefine `color.action.brand` because the primary action color stays blue in both themes. It only swaps the tokens that are theme-dependent: text, background, surface, and border colors.

Dispersa's presets control how these permutations become files:

| Preset       | What it produces                        | Best for                          |
| ------------ | --------------------------------------- | --------------------------------- |
| `bundle`     | A single file with all permutations     | Quick setup, single CSS import    |
| `standalone` | One file per permutation                | Platform-specific builds, JSON/JS |
| `modifier`   | Base file + per-modifier override files | CSS layering with `@import`       |

For CSS, `bundle` or `modifier` are the common choices. For JSON or JS output (feeding a React Native app, for instance), `standalone` gives each theme its own clean file.

---

## Automating with GitHub Actions

A source of truth is only as good as its distribution. Let's set up a GitHub Actions workflow that builds the tokens and publishes them as an npm package to GitHub Packages on every push to `main`.

### Prepare the Package

First, update `package.json` to define the publishable package:

```json
{
  "name": "@my-org/design-tokens",
  "version": "1.0.0",
  "description": "Design tokens for the my-org design system",
  "type": "module",
  "files": ["dist"],
  "exports": {
    "./tokens.css": "./dist/tokens.css",
    "./light.json": "./dist/tokens-light.json",
    "./dark.json": "./dist/tokens-dark.json",
    "./*": "./dist/*"
  },
  "scripts": {
    "build": "dispersa build"
  },
  "publishConfig": {
    "registry": "https://npm.pkg.github.com"
  },
  "dependencies": {
    "dispersa": "^0.3.1"
  }
}
```

The `exports` field gives consumers clean import paths: `@my-org/design-tokens/tokens.css` instead of digging into `dist/`.

### The Workflow

Create `.github/workflows/publish-tokens.yml`:

```yaml
name: Build & Publish Design Tokens

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

permissions:
  contents: read
  packages: write

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout repository
        uses: actions/checkout@v4

      - name: Setup pnpm
        uses: pnpm/action-setup@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'pnpm'
          registry-url: 'https://npm.pkg.github.com'

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Build tokens
        run: pnpm build

      - name: Verify build output
        run: |
          echo "Build output:"
          ls -la dist/

      - name: Publish to GitHub Packages
        if: github.ref == 'refs/heads/main' && github.event_name == 'push'
        run: pnpm publish --no-git-checks --access restricted
        env:
          NODE_AUTH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

This workflow:

1. **Runs on every push and PR** to `main` -- so PRs get a build check, but only merges to `main` actually publish.
2. **Builds the tokens** using your `dispersa.config.ts`.
3. **Publishes to GitHub Packages** using the built-in `GITHUB_TOKEN` -- no extra secrets needed. The `--access restricted` flag keeps the package private to your organization.

### Versioning Strategy

For versioning, you have a few options:

- **Manual:** Bump `version` in `package.json` before merging.
- **Changesets:** Use [changesets](https://github.com/changesets/changesets) for a PR-based versioning workflow. Add a changeset with each token change, and a release PR is generated automatically.
- **Commit-based:** Use a tool like `semantic-release` to derive versions from commit messages.

For a design token repo, changesets tend to work well -- they let you describe _what changed_ in human terms ("Updated primary brand color") which is valuable for consumers.

---

## Consuming the Token Package

### Configure GitHub Packages Access

Consumers need a `.npmrc` file in their project root to pull from GitHub Packages:

```ini
@my-org:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=${GITHUB_TOKEN}
```

Then install:

```bash
pnpm add @my-org/design-tokens
```

### Using CSS Tokens

Import the CSS file in your application's entry point:

```css
/* In your global stylesheet */
@import '@my-org/design-tokens/tokens.css';
```

Then use the custom properties anywhere:

```css
.card {
  background: var(--color-surface-default);
  border: 1px solid var(--color-border-default);
  padding: var(--spacing-gap-md);
  border-radius: var(--shape-border-radius-md);
  color: var(--color-text-default);
}
```

Switch themes by toggling a data attribute:

```html
<html data-theme="dark">
  <!-- Dark theme is now active -->
</html>
```

### Using JSON Tokens in JavaScript/TypeScript

```typescript
import lightTokens from '@my-org/design-tokens/light.json'
import darkTokens from '@my-org/design-tokens/dark.json'

// Use in a theming context (React Native, email templates, SSR, etc.)
const theme = userPrefersDark ? darkTokens : lightTokens
const primaryColor = theme['color.action.brand']
```

---

## What's Next?

What we've built is a solid foundation, but there's more you can do:

- **More platforms.** Dispersa supports [Tailwind CSS v4](https://dispersa.dev), [Swift/SwiftUI](https://dispersa.dev), and [Kotlin/Jetpack Compose](https://dispersa.dev) outputs. A single source of truth can ship to web, iOS, and Android simultaneously.
- **Component tokens.** As your design system grows, you may find the need for a third layer of tokens that map alias values to specific component APIs.
- **TypeScript type generation.** Dispersa can [generate `.d.ts` files](https://dispersa.dev) from your tokens, giving consumers type-safe access with full autocomplete.
- **Figma integration.** Tools like [Tokens Studio](https://tokens.studio/) can sync tokens between Figma and your repository, closing the loop between design and code.
- **Multi-brand support.** The resolver's modifier system scales to brands, platforms, and densities -- not just themes. Dispersa can build the cross-product of all these dimensions into separate output files.

---

## Wrapping Up

The design token ecosystem we've built follows a clear path:

1. **Define** tokens in DTCG format with a layered architecture (base and alias).
2. **Organize** with a consistent naming convention that communicates intent.
3. **Configure** a resolver that assembles sets and applies theme modifiers.
4. **Build** with Dispersa to transform tokens into CSS, JSON, and any other format you need.
5. **Automate** with GitHub Actions to publish tokens as a versioned package on every merge.
6. **Consume** the package in any application with a single import.

The result is a system where a design decision changes in one place and propagates everywhere -- reliably, automatically, and without a Slack message asking "did anyone update the mobile tokens?"

If you want to try it yourself, get started with:

```bash
pnpm create dispersa
```

Check out the full documentation at [dispersa.dev](https://dispersa.dev), and star the repo on [GitHub](https://github.com/dispersa-core/dispersa) if you find it useful.

---

_Have questions or want to share how you're using design tokens? Drop a comment below or find me on [GitHub](https://github.com/timges)._
