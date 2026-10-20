// The parts of rjl-rain that need no browser: the word font, the glyph presets and the
// defaults. (rjl-rain.js is a UMD file, so Node loads it with require.)
import { describe, it, expect } from 'vitest';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const RJLRain = require('../../rjl-rain.js');
const pkg = require('../../package.json');

describe('wordShape', () => {
  it('lights the cells of a 5x5 glyph', () => {
    const { width, height, cells } = RJLRain.wordShape('I');
    expect([width, height]).toEqual([5, 5]);
    expect(cells).toHaveLength(13); // top bar, stem, bottom bar
    expect(cells).toContainEqual([2, 2]);
    expect(cells).not.toContainEqual([2, 0]);
  });

  it('spaces letters one cell apart and scales by whole cells', () => {
    expect(RJLRain.wordShape('RJL').width).toBe(17);
    const big = RJLRain.wordShape('I', 2);
    expect([big.width, big.height, big.cells.length]).toEqual([10, 10, 52]);
  });

  it('is case-insensitive, falls back to ? for unknown glyphs, and handles empty input', () => {
    expect(RJLRain.wordShape('rjl')).toEqual(RJLRain.wordShape('RJL'));
    expect(RJLRain.wordShape('~')).toEqual(RJLRain.wordShape('?'));
    expect(RJLRain.wordShape('')).toEqual({ width: 0, height: 0, cells: [] });
    expect(RJLRain.wordShape(null).cells).toEqual([]);
  });
});

describe('presets and defaults', () => {
  it('ships the classic half-width katakana plus digits', () => {
    const classic = Array.from(RJLRain.glyphs.classic);
    expect(classic).toHaveLength(66);
    expect(classic.every(ch => /[0-9]/.test(ch) || (ch.charCodeAt(0) >= 0xFF66 && ch.charCodeAt(0) <= 0xFF9D))).toBe(true);
    expect(RJLRain.defaults.chars).toBe(RJLRain.glyphs.classic);
  });

  it('keeps its shared objects frozen and its version in step with package.json', () => {
    expect(Object.isFrozen(RJLRain.defaults)).toBe(true);
    expect(Object.isFrozen(RJLRain.glyphs)).toBe(true);
    expect(RJLRain.version).toBe(pkg.version);
  });

  it('says plainly that it needs a browser', () => {
    expect(() => RJLRain()).toThrow(/needs a browser/);
  });
});
