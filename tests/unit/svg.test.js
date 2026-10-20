// The animated SVG banner: deterministic, ASCII-only, script-free, and honest about its shape.
import { describe, it, expect } from 'vitest';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';

const require = createRequire(import.meta.url);
const { renderSvg, esc, DEFAULTS } = require('../../scripts/render-svg.js');
const { wordShape } = require('../../rjl-rain.js');

describe('renderSvg', () => {
  const svg = renderSvg({});

  it('is deterministic per seed', () => {
    expect(renderSvg({})).toBe(svg);
    expect(renderSvg({ seed: 8 })).not.toBe(svg);
  });

  it('is plain ASCII with no script, a title, and a reduced-motion still frame', () => {
    expect([...svg].every(ch => ch.charCodeAt(0) < 128)).toBe(true);
    expect(svg).not.toMatch(/<script/i);
    expect(svg).toMatch(/<title id="title">rjl-rain: Matrix digital rain<\/title>/);
    expect(svg).toContain('@media (prefers-reduced-motion:reduce)');
  });

  it('draws one strip per column and spells the word in lit cells', () => {
    expect(svg.match(/<g class="c"/g)).toHaveLength(Math.floor(DEFAULTS.width / DEFAULTS.font));
    const lit = /<text class="w"[^>]*>(1+)<\/text>/.exec(svg)[1];
    expect(lit.length).toBe(wordShape(DEFAULTS.word, DEFAULTS.scale).cells.length);
  });

  it('leaves the word out when it does not fit', () => {
    expect(renderSvg({ width: 200, word: 'TOO WIDE' })).not.toContain('class="w"');
  });

  it('escapes markup and non-ASCII glyphs', () => {
    expect(esc('<a&"b">')).toBe('&lt;a&amp;&quot;b&quot;&gt;');
    expect(esc('\uFF71')).toBe('&#xFF71;');
  });

  it('matches the committed banner (run npm run build after changing the renderer)', () => {
    expect(readFileSync(new URL('../../assets/rain.svg', import.meta.url), 'utf8')).toBe(svg);
  });
});
