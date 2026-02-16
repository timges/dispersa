# Contributing to Dispersa

Thank you for your interest in contributing to Dispersa! This guide will help you get set up and walk you through the contribution process.

## Code of Conduct

This project follows the [Contributor Covenant Code of Conduct](CODE_OF_CONDUCT.md). By participating, you are expected to uphold this code.

## Prerequisites

- **Node.js** >= 18
- **pnpm**

## Getting Started

1. Fork the repository and clone your fork:

```bash
git clone git@github.com:<your-username>/dispersa.git
cd dispersa
```

2. Install dependencies:

```bash
pnpm install
```

3. Build all packages:

```bash
pnpm build
```

4. Run the test suite to verify everything works:

```bash
pnpm test
```

## Project Structure

```
dispersa/
├── packages/
│   └── core/       # Main library and CLI — token processing, transforms, builders, renderers
├── examples/       # Example projects demonstrating various use cases
├── .changeset/     # Changeset configuration for versioning
└── .github/        # CI workflows, issue and PR templates
```

- **`packages/core`** is published as `dispersa` on npm. It includes the library API and the CLI (`src/cli/`).
- **`examples/`** contains standalone projects that consume the core library.

## Development Workflow

### Common Commands

| Command             | Description                       |
| ------------------- | --------------------------------- |
| `pnpm build`        | Build all packages and examples   |
| `pnpm dev`          | Start all packages in watch mode  |
| `pnpm test`         | Run all tests across the monorepo |
| `pnpm typecheck`    | Run TypeScript type checking      |
| `pnpm lint`         | Lint the codebase with ESLint     |
| `pnpm lint:fix`     | Auto-fix lint issues              |
| `pnpm format`       | Format all files with Prettier    |
| `pnpm format:check` | Check formatting without writing  |

### Package-Specific Commands

You can run commands in a specific package using pnpm filters:

```bash
pnpm --filter dispersa test          # Run core tests only
pnpm --filter dispersa test:unit     # Run unit tests only
pnpm --filter dispersa test:coverage # Run tests with coverage
```

## Testing

The core package uses [Vitest](https://vitest.dev/) with multiple test tiers:

| Command                                   | Scope                  |
| ----------------------------------------- | ---------------------- |
| `pnpm --filter dispersa test:unit`        | Unit tests             |
| `pnpm --filter dispersa test:integration` | Integration tests      |
| `pnpm --filter dispersa test:e2e`         | End-to-end tests       |
| `pnpm --filter dispersa test:contract`    | Contract tests         |
| `pnpm --filter dispersa test:performance` | Performance benchmarks |

For detailed guidance on when to write each type of test, see the [Testing Guidelines](packages/core/tests/GUIDELINES.md).

## Making Changes

### 1. Create a Branch

Use a descriptive branch name:

```bash
git checkout -b feat/add-shadow-transform
git checkout -b fix/css-color-output
git checkout -b docs/update-examples
```

### 2. Make Your Changes

Follow the conventions described in the [Code Style](#code-style) section below.

### 3. Add a Changeset

Every user-facing change needs a changeset. This is how we track what goes into the next release:

```bash
pnpm changeset
```

You will be prompted to:

1. Select which packages are affected (`dispersa`).
2. Choose a semver bump type (`patch`, `minor`, or `major`).
3. Write a short summary of the change.

This creates a markdown file in `.changeset/` that gets consumed during the release process. Commit it alongside your changes.

### 4. Commit Your Changes

Write clear, descriptive commit messages following the [conventional commits](https://www.conventionalcommits.org/en/v1.0.0/) guardrails. The pre-commit hook will automatically lint and format staged files via [lint-staged](https://github.com/lint-staged/lint-staged).

### 5. Push and Open a Pull Request

```bash
git push origin your-branch-name
```

Then open a pull request against `main`. Fill in the PR template and ensure CI checks pass.

## Pull Request Process

1. Fill out the PR template with a description of your changes.
2. Ensure all CI checks pass (build, typecheck, lint, format, tests).
3. Include a changeset if the PR contains user-facing changes.
4. A maintainer will review your PR and may request changes.
5. Once approved, a maintainer will merge the PR.

## Code Style

Formatting is enforced automatically via **Prettier** and **ESLint**, run on every commit through **Husky + lint-staged**. You generally do not need to think about whitespace, quotes, or semicolons — they are handled for you.

The sections below cover conventions that tooling alone cannot enforce.

### Formatting (Prettier)

| Setting         | Value        |
| --------------- | ------------ |
| Quotes          | Single (`'`) |
| Semicolons      | None         |
| Trailing commas | Always       |
| Print width     | 100          |
| Indent          | 2 spaces     |
| Arrow parens    | Always       |
| End of line     | LF           |

### TypeScript

- **Strict mode** is enabled (`strict: true`, `noUncheckedIndexedAccess`, `noImplicitReturns`, etc.).
- Use `type` for object shapes. Reserve `interface` for cases that require it (e.g. recursive index signatures).
- Use `import type` for type-only imports.
- Prefix unused parameters with `_` (e.g. `_event`).
- Prefer `??` over `||` for default values (`prefer-nullish-coalescing` is enforced by ESLint).
- Prefer optional chaining (`?.`) over manual null checks.
- Use `== null` to check for both `null` and `undefined` (configured via `eqeqeq`).
- Always use braces for conditionals — single-line `if` without braces is an error.

### Functions and Structure

- Keep functions short and focused. If a function exceeds ~50 lines, consider extracting helpers.
- Prefer early returns and guard clauses — validate inputs at the top, main logic below.
- Avoid deep nesting; flatten with early returns (aim for max 3 levels).
- Use `async`/`await` over raw promise chains.

### Naming Conventions

| Category              | Convention           | Example                                   |
| --------------------- | -------------------- | ----------------------------------------- |
| Files                 | kebab-case           | `alias-resolver.ts`, `name-transforms.ts` |
| Variables / functions | camelCase            | `resolveToken`, `tokenModes`              |
| Types / classes       | PascalCase           | `ResolvedToken`, `AliasResolver`          |
| Constants             | SCREAMING_SNAKE_CASE | `DEFAULT_MAX_ALIAS_DEPTH`                 |

### Exports and Modules

- Use **named exports** only — no default exports.
- Re-export public API through barrel files (`index.ts`).
- Use classes for stateful services and builders (e.g. `AliasResolver`, `CssBundler`).
- Use pure functions for stateless logic (transforms, converters, utilities).
- Internal imports use path aliases (`@lib/*`, `@shared/*`, `@builders/*`, etc.).

### Error Handling

- Throw custom error classes that extend `DispersaError`.
- Include domain context in errors (e.g. `TokenReferenceError` carries `referenceName` and `suggestions`).
- Set `this.name` to the class name in the constructor.

### Imports

Imports are sorted by ESLint (`import/order`):

1. Node built-ins
2. External packages
3. Internal (path aliases)
4. Parent / sibling / index

A blank line separates each group, and entries within a group are alphabetized.

### Documentation

- Add `@fileoverview` JSDoc at the top of source files.
- Document exported functions and types with JSDoc.

## Reporting Issues

- Use the [bug report template](https://github.com/timges/dispersa/issues/new?template=bug_report.yml) for bugs.
- Use the [feature request template](https://github.com/timges/dispersa/issues/new?template=feature_request.yml) for ideas and enhancements.

## License

By contributing to Dispersa, you agree that your contributions will be licensed under the [MIT License](LICENSE).
