# Integration Tests

Integration tests verify that multiple components work together correctly. These tests exercise real interactions between modules and subsystems.

## Directory Structure

```
integration/
├── build/           # Build process integration tests
│   ├── build-basic.test.ts              # Basic build operations
│   ├── build-transforms.test.ts         # Transform integration
│   ├── build-multioutput.test.ts        # Multi-output builds
│   ├── build-permutations.test.ts       # Permutation generation
│   ├── build-output-modes.test.ts       # Output mode variations
│   ├── build-error-handling.test.ts     # Error handling in builds
│   ├── build-root-tokens.test.ts        # Root token handling
│   └── lifecycle-hooks.test.ts          # Lifecycle hook integration
├── cli/             # CLI integration tests
│   └── cli-build.test.ts               # CLI build command
├── output/          # Output generation tests
│   ├── output-standalone.test.ts        # Standalone output mode
│   ├── output-bundle.test.ts            # Bundle output mode
│   ├── output-determinism.test.ts       # Output determinism verification
│   └── css-function-selectors.test.ts   # CSS function-based selectors
├── resolution/      # Token resolution tests
│   ├── resolution-engine.test.ts        # Resolution engine integration
│   ├── resolution-ordering.test.ts      # Resolution order behavior
│   ├── in-memory-ref-basedir.test.ts    # In-memory $ref base directory
│   ├── pipeline-ref-resolution.test.ts  # Pipeline $ref resolution
│   ├── array-aliasing.test.ts           # Array aliasing in composites
│   └── property-level-references.test.ts # Property-level references
├── dtcg/           # DTCG specification compliance
│   ├── dtcg-compliance.test.ts          # Core DTCG compliance
│   ├── color-spec-compliance.test.ts    # Color space compliance
│   ├── composite-tokens.test.ts         # Composite token handling
│   ├── group-features.test.ts           # Group features ($root, $extends)
│   ├── group-schema-validation.test.ts  # Group schema validation
│   └── unsupported-types.test.ts        # Unsupported type handling
└── resolver.test.ts # Resolver loading and parsing
```

## Test Categories

### Build Tests (`build/`)

Test the complete build pipeline including:

- Basic build operations (resolve, resolveAll, build)
- Transform application (global and per-output)
- Multi-output simultaneous builds
- Permutation generation and iteration
- Output mode handling (standalone vs bundle)
- Error handling and recovery
- Lifecycle hook execution

**Key Features:**

- Tests use real filesystem operations with cleanup
- Each test file focuses on a specific build aspect
- Includes both success and failure scenarios

### Output Tests (`output/`)

Test output file generation:

- Standalone mode (one file per permutation)
- Bundle mode (single file with all permutations)
- Output determinism across builds
- CSS function-based selectors and media queries

**Key Features:**

- Verifies correct file structure and content
- Tests dynamic selector and media query functions
- Validates bundling behavior across renderers

### Resolution Tests (`resolution/`)

Test token resolution engine:

- Core resolution engine with modifiers
- Array aliasing in composite types (DTCG 9.1)
- Property-level references

**Key Features:**

- Tests complex alias resolution scenarios
- Validates DTCG-compliant composite handling
- Verifies modifier application

### DTCG Compliance Tests (`dtcg/`)

Verify DTCG specification compliance:

- Core spec validation (pointers, contexts, defaults)
- Color space handling (all DTCG color spaces)
- Composite token types (shadow, border, typography, etc.)
- Group features ($root tokens, $extends)
- Schema validation
- Unsupported type handling

**Key Features:**

- Direct DTCG spec reference in comments
- Comprehensive color space coverage
- Group inheritance testing

## Running Tests

```bash
# Run all integration tests
pnpm test:integration

# Run specific category
pnpm vitest run tests/integration/build
pnpm vitest run tests/integration/output
pnpm vitest run tests/integration/resolution
pnpm vitest run tests/integration/dtcg

# Run specific file
pnpm vitest run tests/integration/build/build-basic.test.ts

# Watch mode for development
pnpm vitest watch tests/integration
```

## Writing Integration Tests

### File Cleanup

Tests that create files should clean up in `afterEach`:

```typescript
import { rm } from 'node:fs/promises'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

describe('My Integration Test', () => {
  const testBuildPath = '/tmp/test-' + Date.now()

  afterEach(async () => {
    await rm(testBuildPath, { recursive: true, force: true })
  })

  it('creates files', async () => {
    // Test implementation
  })
})
```

### Test Organization

- **One concern per file**: Keep tests focused on a specific integration point
- **Clear describe blocks**: Use nested describes to organize related scenarios
- **Descriptive test names**: Test names should explain the scenario and expected outcome
- **Setup/teardown**: Use beforeEach/afterEach consistently

### Test Data

- Use shared fixtures from `tests/fixtures/`
- Create test-specific data inline for clarity
- Use `getFixturePath()` helper for fixture resolution

### Assertions

- Verify both success and error cases
- Check intermediate states, not just final output
- Assert on structure and content, not just existence

## Best Practices

1. **Integration Scope**: Test real interactions between components, not isolated units
2. **Realistic Scenarios**: Use realistic token sets and configurations
3. **Fast Execution**: Keep tests reasonably fast (<100ms per test ideal)
4. **Independence**: Each test should be independent and idempotent
5. **Clear Failures**: Tests should fail with clear, actionable messages
6. **Comprehensive Coverage**: Cover happy path, edge cases, and error scenarios

## Common Patterns

### Testing Build Pipeline

```typescript
it('builds with custom transform', async () => {
  const result = await dispersa.build({
    resolver: resolverPath,
    buildPath: testBuildPath,
    outputs: [
      css({
        name: 'css',
        file: 'tokens.css',
        preset: 'standalone',
        selector: ':root',
        transforms: [myTransform],
      }),
    ],
  })

  expect(result.success).toBe(true)
  expect(result.outputs[0]!.content).toContain('expected-output')
})
```

### Testing Resolution

```typescript
it('resolves aliases correctly', async () => {
  const tokens = await dispersa.resolveTokens(resolverPath, {
    theme: 'light',
  })

  const token = tokens['semantic.primary']
  expect(token).toBeDefined()
  expect(token!.$value).toEqual(expectedResolvedValue)
})
```

### Testing DTCG Compliance

```typescript
it('validates DTCG pointer format', () => {
  const invalid: TokenCollection = {
    color: {
      primary: {
        $value: '{/invalid/absolute/pointer}', // Invalid per DTCG
        $type: 'color',
      },
    },
  }

  expect(() => parser.flatten(invalid)).toThrow('Invalid token reference')
})
```

## Debugging Failed Tests

1. **Check test output**: Read the full error message and stack trace
2. **Run in watch mode**: Use `pnpm vitest watch` for rapid iteration
3. **Inspect generated files**: Check `/tmp/test-*` directories for actual output
4. **Add logging**: Use `console.log` to inspect intermediate values
5. **Isolate the test**: Run only the failing test with `.only`

## Related Documentation

- [Test Guidelines](../GUIDELINES.md) - General testing guidelines
- [Unit Tests](../unit/README.md) - Unit test documentation
- [E2E Tests](../e2e/README.md) - End-to-end test documentation
- [DTCG Specification](https://design-tokens.github.io/community-group/format/) - Official spec
