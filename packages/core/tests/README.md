# Dispersa Test Suite

This directory contains the comprehensive test suite for Dispersa, following 2025 testing best practices with a proper test pyramid structure.

## 📊 Test Structure

```
tests/
├── unit/              # 70% - Fast, isolated tests
├── integration/       # 20% - Component interaction tests
├── e2e/              # 10% - Complete workflow tests
├── contract/         # API stability tests
├── performance/      # Benchmark tests
├── fixtures/         # Shared test data
└── utils/            # Test utilities
```

## 🧪 Test Types

### Unit Tests (`unit/`)

Fast, isolated tests for individual functions, classes, and modules.

- **Coverage Target**: 80%+
- **Execution Time**: < 5 seconds
- **Structure**: Mirrors `src/` directory organization
- **Purpose**: Test individual units in isolation with mocked dependencies

**Run**: `pnpm test:unit`

### Integration Tests (`integration/`)

Tests for interactions between multiple components.

- **Coverage**: Critical paths and component interactions
- **Execution Time**: < 20 seconds
- **Purpose**: Test how components work together

**Run**: `pnpm test:integration`

### E2E Tests (`e2e/`)

Complete workflow tests from user perspective.

- **Coverage**: Critical user journeys
- **Execution Time**: < 30 seconds
- **Purpose**: Test complete workflows end-to-end

**Run**: `pnpm test:e2e`

### Contract Tests (`contract/`)

API stability and backward compatibility tests.

- **Purpose**: Ensure public API remains stable across versions
- **Checks**: Export names, method signatures, return types

**Run**: `pnpm test:contract`

### Performance Tests (`performance/`)

Benchmark tests for critical performance paths.

**Baselines**:

- Token resolution: < 200ms for 1000 tokens
- Transforms: < 50ms for 1000 transformations
- Formatters: < 200ms for 1000 tokens
- Enterprise scale: < 1s for 5000 tokens

**Run**: `pnpm test:performance`

## 🚀 Running Tests

```bash
# Run all tests
pnpm test

# Run specific test types
pnpm test:unit
pnpm test:integration
pnpm test:e2e
pnpm test:contract
pnpm test:performance

# Watch mode
pnpm test:watch

# With coverage
pnpm test:coverage
```

## 📝 Test Organization

### Test Pyramid Ratio

```
         /\
        /  \  E2E (10%)
       /----\
      /      \  Integration (20%)
     /--------\
    /          \  Unit (70%)
   /____________\
```

### File Naming

- Test files: `*.test.ts`
- Location: Mirror source structure in appropriate test folder
- Example: `src/resolution/alias-resolver.ts` → `tests/unit/resolution/alias-resolver.test.ts`

## 🔧 Test Utilities

### Fixtures

Shared test data located in `fixtures/`. Use helpers from `utils/fixtures.ts`:

```typescript
import { loadFixture, getFixturePath } from '../utils/fixtures'

const data = await loadFixture('tokens/colors.json')
const path = getFixturePath('tokens.resolver.json')
```

### Performance Helpers

```typescript
import { measureTime, assertPerformance } from '../utils/performance-helpers'

const time = await measureTime(() => someAsyncOperation())
assertPerformance(time, 100, 'Operation name')
```

### Contract Helpers

```typescript
import { assertHasProperties, verifyExports } from '../utils/contract-helpers'

assertHasProperties(obj, ['prop1', 'prop2'])
const { missing, unexpected } = verifyExports(API, expectedNames)
```

## 📊 Coverage Goals

- **Overall**: 80%+
- **Critical Paths**: 95%+
- **New Code**: 90%+

Coverage thresholds are enforced in `vitest.config.ts`:

- Lines: 80%
- Functions: 80%
- Branches: 75%
- Statements: 80%

## ✅ Best Practices

1. **Test Isolation**: Each test should be independent
2. **Clear Naming**: Use descriptive test names
3. **Arrange-Act-Assert**: Follow AAA pattern
4. **One Assertion Per Test**: Focus on single behavior
5. **Mock External Dependencies**: Keep tests fast and reliable
6. **Cleanup**: Always cleanup resources (temp files, etc.)
7. **Deterministic**: Tests should always produce same result

## 🐛 Debugging Tests

```bash
# Run specific test file
pnpm test tests/unit/resolution/alias-resolver.test.ts

# Run tests matching pattern
pnpm test --grep "color transform"

# Run with verbose output
pnpm test:performance  # Already verbose
```

## 📚 Additional Resources

- [GUIDELINES.md](./GUIDELINES.md) - Detailed testing guidelines
- [CONTRIBUTING.md](./CONTRIBUTING.md) - How to add new tests
- [fixtures/README.md](./fixtures/README.md) - Test data documentation
