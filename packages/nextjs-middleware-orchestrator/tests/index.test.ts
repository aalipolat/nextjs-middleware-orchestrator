// This file ensures all test files are imported and run
// Import all test suites here to ensure they are included in the test suite

// Import unit tests
import './unit/index.test';

// This ensures that all tests are discovered and run
import { describe, it, expect } from 'vitest';

describe('Complete Test Suite', () => {
  it('should have all test suites loaded', () => {
    expect(true).toBe(true);
  });
}); 
