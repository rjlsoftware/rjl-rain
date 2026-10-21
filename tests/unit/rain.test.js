// The parts of rjl-rain that need no browser: the word font, the glyph presets and the
// defaults. (rjl-rain.js is a UMD file, so Node loads it with require.)
import { describe, it, expect } from 'vitest';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

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

  it('keeps the 1.0 look unless the 1.1 options are asked for', () => {
    const d = RJLRain.defaults;
    expect([d.head, d.speed, d.speedVariance, d.wordPosition, d.onWord, d.controls, d.background])
      .toEqual(['', 1, 0, 'random', null, false, '#000000']);
    expect(d.pauseOffscreen).toBe(true);
    expect(typeof RJLRain.auto).toBe('function');
  });
});

describe('builds', () => {
  it('ships an ES module build of the same library', async () => {
    const esm = (await import('../../rjl-rain.mjs')).default;
    expect(esm.version).toBe(pkg.version);
    expect(Object.keys(esm.defaults)).toEqual(Object.keys(RJLRain.defaults));
    expect(esm.wordShape('RJL')).toEqual(RJLRain.wordShape('RJL'));
  });

  it('pins the README CDN snippet to this version and the SRI hash of rjl-rain.min.js', () => {
    const readme = readFileSync(new URL('../../README.md', import.meta.url), 'utf8');
    const min = readFileSync(new URL('../../rjl-rain.min.js', import.meta.url));
    const sri = 'sha384-' + createHash('sha384').update(min).digest('base64');
    expect(readme).toContain(`rjl-rain@v${pkg.version}/rjl-rain.min.js" integrity="${sri}" crossorigin="anonymous"`);
    const versions = readme.match(/rjl-rain[@#]v?\d+\.\d+\.\d+/g) || [];
    expect(versions.length).toBeGreaterThan(2);
    expect(versions.every((v) => v.endsWith(pkg.version))).toBe(true);
  });
});
