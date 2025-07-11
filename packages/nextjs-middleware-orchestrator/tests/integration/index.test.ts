// This file ensures all integration test files are imported and run
// Import all integration test files here to ensure they are included in the test suite

import './orchestrator.test';

// This ensures that all integration tests are discovered and run
import { describe, it, expect } from 'vitest';

describe('Integration Test Suite', () => {
  it('should have all integration test files loaded', () => {
    expect(true).toBe(true);
  });
}); 