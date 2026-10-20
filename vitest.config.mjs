// Unit tests run under Node: the word font, the options and the SVG renderer.
// The browser suite (tests/*.spec.js) belongs to Playwright.
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/unit/**/*.test.js'],
    environment: 'node'
  }
});
