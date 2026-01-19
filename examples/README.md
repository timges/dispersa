# Token Forge Examples

This directory contains examples demonstrating Token Forge at different scales, following the base/alias architecture pattern.

## Examples by Scale

### basic (Small/Medium Scale)

**The simplest Token Forge setup** - perfect for getting started with small to medium projects.

Features:

- Base tokens (foundational values)
- Alias tokens (semantic references)
- Theme modifiers (light/dark)
- Single CSS output with theme switching
- Minimal configuration (~50 lines)

**Start here if you're new to Token Forge!**

```bash
cd basic
pnpm install
pnpm build
```

### advanced (Large Scale)

A comprehensive multi-platform design system with layered architecture.

Features:

- Base → Alias → Component token layers
- Multi-platform delivery (web, mobile, desktop)
- Multiple themes (light, dark, high-contrast)
- Component tokens (button, card)
- Multiple output formats (CSS, JSON, JS, Figma)
- TypeScript type generation
- Interactive HTML demo

Perfect for:

- Multi-platform applications
- Design systems serving multiple products
- Teams needing platform-specific overrides

```bash
cd advanced
pnpm install
pnpm build
```

### enterprise (Enterprise Scale)

Enterprise-scale example demonstrating comprehensive DTCG 2025.10 feature coverage.

Features:

- All primitive token types (color, dimension, fontFamily, etc.)
- All composite token types (shadow, typography, transition, etc.)
- Multiple color spaces (srgb, display-p3, rec2020, etc.)
- Advanced reference patterns (curly braces, JSON Pointer, chained)
- Advanced resolver features (inline tokens, multiple sets, modifiers)
- Feature verification and validation

Perfect for:

- Complex multi-brand systems
- Comprehensive design system validation
- DTCG spec compliance testing

```bash
cd enterprise
pnpm install
pnpm build
```

### no-filesystem

Demonstrates **in-memory mode** where Token Forge operates without reading or writing files.

Perfect for:

- Build tool plugins (Vite, Webpack, Rollup)
- Runtime token generation
- API servers
- Testing and CI/CD
- Design tool integrations

Features:

- Inline token definitions (no token files)
- No disk I/O (all in memory)
- Direct token resolution
- Multiple output formats

```bash
cd no-filesystem
pnpm install
pnpm build
```

### custom-plugins

Demonstrates **custom plugin development** - extending Token Forge with custom filters, renderers, and transforms.

Perfect for:

- Custom output formats (SCSS, LESS, YAML, XML)
- Proprietary formats for specific tools
- Custom transformation logic
- Complex filtering requirements
- Learning plugin architecture

Features:

- Custom YAML renderer (flat and nested structures)
- Custom filter (color tokens only)
- Custom transform (uppercase names)
- Complete plugin examples with documentation

```bash
cd custom-plugins
pnpm install
pnpm build
```

## Project Structure Patterns

### Basic (Small Scale)

```
root/
├── tokens.resolver.json
└── tokens/
    ├── base.json           # Foundation
    ├── alias.json          # Semantic
    └── themes/             # Theme mods
```

**Use when:**

- Single application
- Simple theming (light/dark)
- Small team (1-3 people)

### Advanced (Large Scale)

```
root/
├── tokens.resolver.json
└── tokens/
    ├── base/               # Organized by type
    │   ├── colors.json
    │   ├── spacing.json
    │   └── effects.json
    ├── alias/              # Semantic + components
    │   ├── colors.json
    │   └── components/
    └── modifiers/
        ├── themes/         # Theme variations
        └── platforms/      # Platform overrides
```

**Use when:**

- Multi-platform delivery
- Multiple themes
- Medium team (3-10 people)
- Component token needs

### Enterprise (Enterprise Scale)

```
root/
├── tokens.resolver.json
└── tokens/
    ├── base/
    │   ├── colors/         # Deep categorization
    │   ├── dimensions/
    │   └── effects/
    ├── alias/
    │   ├── colors.json
    │   └── components/
    └── modifiers/
        ├── themes/
        ├── brands/         # Multi-brand support
        ├── platforms/
        ├── density/        # UI density
        └── accessibility/  # A11y overrides
```

**Use when:**

- Multiple products/brands
- Complex variation matrix
- Large team (10+ people)
- Advanced modifier needs

## Learning Path

We recommend exploring the examples in this order:

1. **basic** (10 minutes)
   - Learn base/alias architecture
   - Understand theme modifiers
   - See simple resolver patterns

2. **no-filesystem** (10 minutes)
   - Understand programmatic usage
   - Learn build tool integration patterns
   - See inline token definitions

3. **custom-plugins** (15 minutes)
   - Learn plugin architecture
   - Create custom output formats
   - Implement custom filters and transforms

4. **advanced** (20 minutes)
   - Learn multi-platform delivery
   - Understand component tokens
   - See advanced output modes

5. **enterprise** (30 minutes)
   - Master DTCG 2025.10 features
   - Understand complex resolver patterns
   - Learn advanced validation

## Key Concepts Across Examples

### Base vs Alias Tokens

All examples use this fundamental pattern:

| Aspect       | Base Tokens             | Alias Tokens        |
| ------------ | ----------------------- | ------------------- |
| **Purpose**  | Foundation              | Context             |
| **Values**   | Absolute                | References          |
| **Naming**   | Descriptive             | Semantic            |
| **Examples** | `blue-500`, `spacing-4` | `primary`, `medium` |

### Resolution Order

Tokens are resolved in layers:

```
Base → Alias → Modifiers
```

Each layer can reference the previous layer, creating a cascade effect.

### Modifier Patterns

Modifiers provide variation without duplication:

- **Theme**: Color scheme variations (light/dark)
- **Platform**: Platform-specific adjustments (web/mobile)
- **Brand**: Multi-brand support (primary/partner)
- **Density**: UI density (comfortable/compact)
- **Accessibility**: A11y overrides (reduced-motion/high-contrast)

## Technical Details

All examples are written in TypeScript and use `tsx` for direct execution.

Each example includes:

- `build.ts` - Build script demonstrating Token Forge API
- `tokens.resolver.json` - Resolver configuration
- `tsconfig.json` - TypeScript configuration
- `package.json` - Dependencies and scripts

## Quick Start for Your Project

1. **Choose your scale** based on project complexity
2. **Copy the example** that matches your needs
3. **Customize tokens** for your design system
4. **Run the build** to generate outputs
5. **Integrate** into your application

## Need Help?

- Read the [Token Forge Documentation](../README.md)
- Check the [DTCG Specification](https://www.designtokens.org/)
- Review example READMEs for detailed explanations
