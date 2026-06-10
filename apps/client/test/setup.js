/**
 * Global test setup for the client suite.
 *  - Registers @testing-library/jest-dom matchers (toBeDisabled, toBeInTheDocument…)
 *    via the framework-agnostic `/matchers` entry + expect.extend, so it resolves
 *    cleanly under npm-workspaces hoisting (the `/vitest` entry hard-imports
 *    `vitest` from the hoisted location and fails).
 *  - Unmounts React trees and resets localStorage after every test so cases stay
 *    isolated (many components read the `user` object from localStorage).
 */
import * as matchers from '@testing-library/jest-dom/matchers';
import { cleanup } from '@testing-library/react';
import { afterEach, beforeEach, expect } from 'vitest';

expect.extend(matchers);

beforeEach(() => {
  localStorage.clear();
});

afterEach(() => {
  cleanup();
  localStorage.clear();
});
