# Testing Guidelines

## When to Write Each Type of Test

### Unit Tests

Write unit tests when:

- Testing a single function, class, or module
- Testing pure functions (same input → same output)
- Testing business logic in isolation
- No external dependencies needed

**Example**: Testing color transform functions, name transforms, validators

### Integration Tests

Write integration tests when:

- Testing interaction between 2+ components
- Testing data flow through a pipeline
- Testing configuration validation
- Components have real dependencies

**Example**: Token resolution pipeline, build orchestration, formatter chains

### E2E Tests

Write E2E tests when:

- Testing complete user workflows
- Testing from public API to final output
- Testing real-world scenarios
- File I/O or external systems involved

**Example**: Complete build workflows, in-memory API usage, multi-platform builds

### Contract Tests

Write contract tests when:

- Defining or modifying public API
- Ensuring backward compatibility
- Documenting expected interfaces
- Preventing breaking changes

**Example**: Public API exports, class method signatures, interface implementations

### Performance Tests

Write performance tests when:

- Optimizing critical paths
- Establishing performance baselines
- Testing at scale
- Preventing performance regressions

**Example**: Large token set resolution, batch transformations, formatter performance

## Test Naming Conventions

### Test Files

```typescript
// ✅ Good
alias - resolver.test.ts
color - transforms.test.ts
build - orchestration.test.ts

// ❌ Bad
tests.ts
spec.ts
aliasResolverTest.ts
```

### Describe Blocks

```typescript
// ✅ Good - Describes the unit being tested
describe('AliasResolver', () => {})
describe('colorToHex transform', () => {})
describe('Complete Build Workflow', () => {})

// ❌ Bad
describe('Tests', () => {})
describe('it should work', () => {})
```

### Test Names

```typescript
// ✅ Good - Describes expected behavior
it('should resolve simple color aliases', () => {})
it('should throw on circular references', () => {})
it('should transform sRGB colors to hex format', () => {})

// ❌ Bad
it('works', () => {})
it('test 1', () => {})
it('alias resolver', () => {})
```

## Test Structure (AAA Pattern)

```typescript
it('should transform color to hex format', () => {
  // Arrange - Setup test data and preconditions
  const colorToken = {
    $value: { colorSpace: 'srgb', components: [1, 0, 0] },
    $type: 'color',
    path: ['color', 'red'],
    name: 'color.red',
    originalValue: { colorSpace: 'srgb', components: [1, 0, 0] },
  }

  // Act - Perform the operation being tested
  const result = colorToHex.transform(colorToken)

  // Assert - Verify the expected outcome
  expect(result.$value).toBe('#ff0000')
  expect(result.path).toEqual(colorToken.path)
})
```

## Mocking Guidelines

### When to Mock

- External APIs or services
- File system operations (except in E2E tests)
- Time-dependent functions
- Expensive operations

### When NOT to Mock

- Internal modules (in integration tests)
- Simple data structures
- Pure functions
- Test doubles that hide bugs

### Example

```typescript
// ✅ Good - Mock external dependency
vi.mock('node:fs/promises', () => ({
  readFile: vi.fn().mockResolvedValue('test content'),
}))

// ❌ Bad - Over-mocking hides integration issues
vi.mock('../../src/resolution/alias-resolver')
vi.mock('../../src/tokens/token-parser')
// Now your test doesn't actually test anything!
```

## Fixtures and Test Data

### Fixture Organization

```
fixtures/
├── tokens/           # Token JSON files
├── resolvers/        # Resolver documents
└── expected/         # Expected output samples
```

### Using Fixtures

```typescript
import { loadFixture, getFixturePath } from '../utils/fixtures'

// ✅ Load and cache fixtures
const tokens = await loadFixture('tokens/colors.json')

// ✅ Get path for Dispersa API
const resolverPath = getFixturePath('tokens.resolver.json')
await dispersa.resolveTokens(resolverPath)

// ❌ Don't hardcode paths
const badPath = __dirname + '/../../fixtures/tokens.json'
```

## Assertions

### Clear and Specific

```typescript
// ✅ Good - Specific assertions
expect(result).toHaveProperty('$value')
expect(result.$value).toBe('#ff0000')
expect(result.path).toEqual(['color', 'red'])

// ❌ Bad - Vague assertions
expect(result).toBeTruthy()
expect(result).toBeDefined()
```

### One Concept Per Test

```typescript
// ✅ Good - Tests one concept
it('should transform color to hex', () => {
  const result = colorToHex.transform(colorToken)
  expect(result.$value).toBe('#ff0000')
})

it('should preserve token metadata', () => {
  const result = colorToHex.transform(colorToken)
  expect(result.path).toEqual(colorToken.path)
  expect(result.name).toBe(colorToken.name)
})

// ❌ Bad - Tests multiple concepts
it('should work correctly', () => {
  const result = colorToHex.transform(colorToken)
  expect(result.$value).toBe('#ff0000')
  expect(result.path).toEqual(colorToken.path)
  expect(result.name).toBe(colorToken.name)
  // ... many more assertions
})
```

## Error Testing

```typescript
// ✅ Good - Test error cases
it('should throw on circular reference', () => {
  expect(() => resolver.resolve(circularTokens)).toThrow(/circular/i)
})

it('should reject promise on invalid input', async () => {
  await expect(dispersa.resolveTokens('invalid')).rejects.toThrow()
})

// ✅ Good - Test error messages
it('should provide helpful error message', () => {
  try {
    resolver.resolve(invalidTokens)
    expect.fail('Should have thrown')
  } catch (error) {
    expect(error.message).toContain('token.missing')
  }
})
```

## Async Testing

```typescript
// ✅ Good - Use async/await
it('should resolve tokens asynchronously', async () => {
  const result = await dispersa.resolveTokens(resolver)
  expect(result).toBeDefined()
})

// ❌ Bad - Missing await
it('should resolve tokens', () => {
  const result = dispersa.resolveTokens(resolver) // Returns Promise!
  expect(result).toBeDefined() // Tests the Promise, not the result
})
```

## Cleanup

```typescript
describe('File Operations', () => {
  let tempDir: string

  beforeEach(async () => {
    tempDir = await createTempDir()
  })

  afterEach(async () => {
    await cleanupTempDir(tempDir)
  })

  it('should create files', async () => {
    // Test uses tempDir...
  })
})
```

## Performance Testing Guidelines

```typescript
it('should meet performance baseline', async () => {
  const time = await measureTime(() => expensiveOperation())

  // Include context in console output
  console.log(`  ✓ Operation completed in ${time.toFixed(2)}ms`)

  // Assert baseline
  expect(time).toBeLessThan(100) // 100ms baseline
})
```

## Common Pitfalls

### ❌ Don't: Share State Between Tests

```typescript
// ❌ Bad
let sharedState = {}

it('test 1', () => {
  sharedState.value = 'test'
})

it('test 2', () => {
  // Depends on test 1!
  expect(sharedState.value).toBe('test')
})
```

### ✅ Do: Isolate Tests

```typescript
// ✅ Good
it('test 1', () => {
  const state = { value: 'test' }
  // Test with state
})

it('test 2', () => {
  const state = { value: 'test' }
  // Independent test
})
```

### ❌ Don't: Test Implementation Details

```typescript
// ❌ Bad - Tests internal implementation
it('should call parseColor method', () => {
  const spy = vi.spyOn(converter, 'parseColor')
  converter.convert(color)
  expect(spy).toHaveBeenCalled()
})
```

### ✅ Do: Test Behavior

```typescript
// ✅ Good - Tests output behavior
it('should convert color to hex format', () => {
  const result = converter.convert(color)
  expect(result).toBe('#ff0000')
})
```

## Code Coverage

- Coverage is a metric, not a goal
- 100% coverage doesn't mean bug-free code
- Focus on critical paths and edge cases
- Don't write tests just to increase coverage
- Use coverage reports to find untested code

## Integration Test Patterns

### File Cleanup Pattern

All integration tests that create files should clean up in `afterEach`:

```typescript
import { rm } from 'node:fs/promises'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

describe('Build Integration', () => {
  const testBuildPath = '/tmp/test-build-' + Date.now()

  afterEach(async () => {
    await rm(testBuildPath, { recursive: true, force: true })
  })

  it('builds files', async () => {
    const result = await dispersa.build({
      buildPath: testBuildPath,
      // ...config
    })

    expect(result.success).toBe(true)
  })
})
```

### Build Test Pattern

Test complete build workflows with real file operations:

```typescript
it('applies transforms during build', async () => {
  const result = await dispersa.build({
    resolver: resolverPath,
    buildPath: testBuildPath,
    outputs: [
      css({
        name: 'css',
        file: 'tokens.css',
        preset: 'standalone',
        selector: ':root',
      }),
    ],
  })

  expect(result.success).toBe(true)
  expect(result.outputs[0]!.content).toContain('--color-')
})
```

### Resolution Test Pattern

Test resolution engine with real resolver documents:

```typescript
it('resolves with specific modifiers', async () => {
  const tokens = await dispersa.resolveTokens(resolverPath, {
    theme: 'dark',
    scale: 'mobile',
  })

  const bgToken = tokens['color.base.background']
  expect(bgToken).toBeDefined()
  expect(bgToken!.$type).toBe('color')
})
```

### DTCG Compliance Test Pattern

Reference DTCG spec sections in tests:

```typescript
/**
 * DTCG Section 9.1: Arrays in composite types may mix references and explicit values
 */
it('resolves arrays with mixed references', () => {
  const tokens: ResolvedTokens = {
    'shadow.mixed': {
      $type: 'shadow',
      $value: [
        {
          color: '{colors.black}', // Reference
          offsetX: { value: 0, unit: 'px' }, // Explicit
          // ...
        },
      ],
      path: ['shadow', 'mixed'],
      name: 'shadow.mixed',
      originalValue: {
        /* ... */
      },
    },
  }

  const resolved = aliasResolver.resolve(tokens)
  expect(resolved['shadow.mixed'].$value[0].color).toBeDefined()
})
```

### Output Mode Test Pattern

Test both standalone and bundle modes:

```typescript
it('generates separate files in standalone mode', async () => {
  const result = await dispersa.build({
    resolver: resolverPath,
    buildPath: testBuildPath,
    outputs: [
      css({
        name: 'css',
        file: 'tokens-{theme}.css',
        preset: 'standalone',
        selector: ':root',
      }),
    ],
  })

  expect(result.outputs.length).toBe(2) // One per permutation
})

it('generates single file in bundle mode', async () => {
  const result = await dispersa.build({
    resolver: resolverPath,
    buildPath: testBuildPath,
    outputs: [
      css({
        name: 'css',
        file: 'tokens.css',
        preset: 'bundle',
        selector: (modifierName, context, isBase) => {
          if (isBase) return ':root'
          return `[data-${modifierName}="${context}"]`
        },
      }),
    ],
  })

  expect(result.outputs.length).toBe(1) // Single bundled file
  expect(result.outputs[0]!.content).toContain(':root')
  expect(result.outputs[0]!.content).toContain('[data-theme="dark"]')
})
```

### Lifecycle Hooks Test Pattern

Test lifecycle hooks receive correct context:

```typescript
it('fires hooks in correct order', async () => {
  const events: string[] = []

  const result = await dispersa.build({
    resolver: resolverPath,
    buildPath: testBuildPath,
    outputs: [
      css({
        name: 'css',
        file: 'tokens.css',
        preset: 'bundle',
        selector: ':root',
        hooks: {
          onBuildStart: () => events.push('output-start'),
          onBuildEnd: () => events.push('output-end'),
        },
      }),
    ],
    hooks: {
      onBuildStart: () => events.push('global-start'),
      onBuildEnd: () => events.push('global-end'),
    },
  })

  expect(result.success).toBe(true)
  expect(events).toEqual(['global-start', 'output-start', 'output-end', 'global-end'])
})
```

### Error Handling Test Pattern

Test both error detection and recovery:

```typescript
it('handles invalid renderer gracefully', async () => {
  const brokenRenderer = defineRenderer({
    format: () => {
      throw new Error('Renderer error')
    },
  })

  const result = await dispersa.build({
    resolver: resolverPath,
    buildPath: testBuildPath,
    outputs: [
      {
        name: 'broken',
        renderer: brokenRenderer,
        file: 'tokens.txt',
      },
    ],
  })

  expect(result.success).toBe(false)
  expect(result.errors).toBeDefined()
  expect(result.errors![0]!.message).toContain('Renderer error')
})
```

## Integration Test Organization

### Directory Structure

Keep integration tests organized by concern:

```
integration/
├── build/          # Build pipeline tests
├── output/         # Output generation tests
├── resolution/     # Resolution engine tests
└── dtcg/          # DTCG compliance tests
```

### File Naming

- `build-*.test.ts` - Build-related integration
- `output-*.test.ts` - Output generation
- `resolution-*.test.ts` - Resolution features
- `*-compliance.test.ts` - Spec compliance

### Test Separation

One integration concern per file:

```typescript
// ✅ Good - Focused on transforms
// build-transforms.test.ts
describe('Build Transform Integration', () => {
  describe('Global Transforms', () => {})
  describe('Platform-Specific Transforms', () => {})
  describe('Custom Transforms', () => {})
})

// ❌ Bad - Too many concerns
// build.test.ts
describe('Build Tests', () => {
  describe('Transforms', () => {})
  describe('Formatters', () => {})
  describe('Permutations', () => {})
  describe('Error Handling', () => {})
  describe('Output Modes', () => {})
  // File is now 1000+ lines and hard to navigate
})
```

## Documentation

- Complex test setups deserve comments
- Document WHY, not WHAT
- Link to relevant issues or decisions
- Keep comments up-to-date
- Reference DTCG spec sections where relevant
