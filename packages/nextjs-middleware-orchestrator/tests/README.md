# Test Suite Documentation

This test package contains comprehensive unit tests for the nextjs-middleware-orchestrator library.

## Running Tests

### Run All Tests
```bash
npm test
```

### Run in Watch Mode
```bash
npm run test:watch
```

### Run with Coverage Report
```bash
npm run test:coverage
```

## Test Configuration

Tests are configured in `vitest.config.ts`:

- **Environment**: Node.js
- **Coverage**: V8 provider with 80% threshold
- **Setup**: Next.js mocks via `tests/setup.ts`
- **Timeout**: 10 seconds

## Mocks

The following mocks are defined in the test setup:

- `NextRequest`: Mock request object
- `NextResponse`: Mock response object (next, redirect, rewrite)
- `console`: Log, error, warn methods

## Coverage Targets

- **Branches**: 80%
- **Functions**: 80%
- **Lines**: 80%
- **Statements**: 80%

## Test Writing Guidelines

1. Each test file should test functionality in its own category
2. Test names should be descriptive
3. Each test should be independent (cleanup with beforeEach)
4. Mocks should be used appropriately
5. Edge cases should be tested
6. Error scenarios should be covered

## Troubleshooting

### If Tests Don't Run
1. Check dependencies with `npm install`
2. Verify `vitest.config.ts` is correct
3. Ensure `tests/setup.ts` properly defines mocks

### If Coverage is Low
1. Add new test cases
2. Test edge cases
3. Cover error scenarios
4. Test complex logic 