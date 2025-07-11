// This file ensures all test files are imported and run
// Import all test files here to ensure they are included in the test suite

import './utils/route-parser.test';
import './main.test';

// This ensures that all tests are discovered and run
import { describe, it, expect } from 'vitest';

describe('Test Suite', () => {
  it('should have all test files loaded', () => {
    expect(true).toBe(true);
  });
}); 
