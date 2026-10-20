#!/usr/bin/env node
/**
 * render-svg.js - the rain as an animated SVG, for places that cannot run a canvas: a GitHub
 * README renders an animated SVG image but never runs its script. CSS animation only, no
 * script, ASCII-only output, and the same seed always produces the same bytes.
 *
 *   node scripts/render-svg.js [--out assets/rain.svg] [--width 1200] [--height 300] [--font 16]
 *     [--chars RJL] [--word RJL] [--scale 2] [--seed 7] [--color #00FF00] [--bright #B6FFB6]
 *     [--background #000000] [--title "..."]
 *
 * Each column is a strip of glyphs (a faded tail and a bright head) sliding down on its own
 * speed and phase. The word is spelled in the middle on a slow fade cycle. Viewers who ask
 * for reduced motion get one still frame with the word showing.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const { wordShape } = require('../rjl-rain.js');

const DEFAULTS = {
    out: 'assets/rain.svg', width: 1200, height: 300, font: 16, chars: 'RJL', word: 'RJL', scale: 2, seed: 7,
    color: '#00FF00', bright: '#B6FFB6', background: '#000000', title: 'rjl-rain: Matrix digital rain'
};
const NUMERIC = ['width', 'height', 'font', 'scale', 'seed'];

// Small, fast, seedable PRNG (mulberry32).
function createRng(seed) {
    let a = seed >>> 0;
    return function next() {
        a = (a + 0x6D2B79F5) >>> 0;
        let t = a;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

// XML-safe and ASCII-only: anything outside printable ASCII becomes a character reference.
function esc(s) {
    return Array.from(String(s)).map((ch) => {
        if (ch === '&') return '&amp;';
        if (ch === '<') return '&lt;';
        if (ch === '>') return '&gt;';
        if (ch === '"') return '&quot;';
        const c = ch.codePointAt(0);
        return c < 32 || c > 126 ? `&#x${c.toString(16).toUpperCase()};` : ch;
    }).join('');
}

const num = (n) => String(Math.round(n * 10) / 10);

function renderSvg(options) {
    const o = Object.assign({}, DEFAULTS, options);
    const rnd = createRng(o.seed);
    const size = o.font;
    const cols = Math.floor(o.width / size);
    const rows = Math.ceil(o.height / size);
    const glyphs = Array.from(o.chars);
    const pick = () => glyphs[Math.floor(rnd() * glyphs.length)];
    const left = (o.width - cols * size) / 2 + size / 2;   // glyph center of column 0
    const baseline = (row) => (row + 1) * size - size * 0.2;

    // Every strip is maxLen glyphs tall; a shorter trail just leaves a longer gap before it repeats.
    const maxLen = Math.max(4, Math.round(rows * 0.9));
    const strip = maxLen * size;
    const travel = o.height + strip;

    const columns = [];
    for (let i = 0; i < cols; i++) {
        const len = 3 + Math.floor(rnd() * (maxLen - 2));
        const speed = (8 + rnd() * 12) * size;               // px per second
        const duration = travel / speed;
        const delay = -rnd() * duration;
        const still = -strip + rnd() * travel;               // where the reduced-motion frame shows it
        const x = num(left + i * size);
        const tail = [];
        for (let k = maxLen - len; k < maxLen - 1; k++) tail.push(k);
        columns.push(
            `<g class="c" style="animation-duration:${num(duration)}s;animation-delay:${num(delay)}s" transform="translate(0 ${num(still)})">` +
            `<text x="${tail.map(() => x).join(' ')}" y="${tail.map((k) => num(baseline(k))).join(' ')}" fill="url(#tail)">${esc(tail.map(pick).join(''))}</text>` +
            `<text class="h" x="${x}" y="${num(baseline(maxLen - 1))}">${esc(pick())}</text></g>`
        );
    }

    let word = '';
    const shape = wordShape(o.word, o.scale);
    if (shape.cells.length && shape.width <= cols && shape.height <= rows) {
        const c0 = Math.floor((cols - shape.width) / 2);
        const r0 = Math.floor((rows - shape.height) / 2);
        word = `<text class="w" filter="url(#glow)" x="${shape.cells.map(([, c]) => num(left + (c0 + c) * size)).join(' ')}" ` +
            `y="${shape.cells.map(([r]) => num(baseline(r0 + r))).join(' ')}">${'1'.repeat(shape.cells.length)}</text>`;
    }

    return [
        `<svg xmlns="http://www.w3.org/2000/svg" width="${o.width}" height="${o.height}" viewBox="0 0 ${o.width} ${o.height}" role="img" aria-labelledby="title">`,
        `<title id="title">${esc(o.title)}</title>`,
        '<style>',
        `text{font-family:ui-monospace,Menlo,Consolas,"DejaVu Sans Mono",monospace;font-size:${size}px;text-anchor:middle}`,
        `.h{fill:${o.bright}}.w{fill:${o.bright};animation:w 9s ease-in-out infinite}`,
        `.c{animation-name:f;animation-timing-function:linear;animation-iteration-count:infinite}`,
        `@keyframes f{from{transform:translateY(${-strip}px)}to{transform:translateY(${o.height}px)}}`,
        '@keyframes w{0%,52%,100%{opacity:0}60%,88%{opacity:1}}',
        '@media (prefers-reduced-motion:reduce){.c{animation:none}.w{animation:none;opacity:1}}',
        '</style>',
        '<defs>',
        `<linearGradient id="tail" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${o.color}" stop-opacity="0"/>` +
            `<stop offset="0.6" stop-color="${o.color}" stop-opacity="0.55"/><stop offset="1" stop-color="${o.color}"/></linearGradient>`,
        '<filter id="glow" x="-10%" y="-10%" width="120%" height="120%"><feGaussianBlur stdDeviation="2.5" result="b"/>' +
            '<feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>',
        '</defs>',
        `<rect width="100%" height="100%" fill="${o.background}"/>`,
        ...columns,
        word,
        '</svg>',
        ''
    ].filter((line, i, all) => line !== '' || i === all.length - 1).join('\n');
}

function parseArgs(argv) {
    const out = {};
    for (let i = 0; i < argv.length; i++) {
        const m = /^--([a-z]+)$/.exec(argv[i]);
        if (!m || !(m[1] in DEFAULTS) || i + 1 >= argv.length) throw new Error(`unknown or incomplete option: ${argv[i]}`);
        const value = argv[++i];
        out[m[1]] = NUMERIC.includes(m[1]) ? Number(value) : value;
    }
    return out;
}

function main() {
    const o = Object.assign({}, DEFAULTS, parseArgs(process.argv.slice(2)));
    const svg = renderSvg(o);
    const file = path.resolve(process.cwd(), o.out);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, svg);
    console.log(`wrote ${path.relative(process.cwd(), file)} (${o.width}x${o.height}, ${(svg.length / 1024).toFixed(1)} KB)`);
}

if (require.main === module) {
    try { main(); } catch (err) { console.error(`render-svg: ${err.message}`); process.exit(1); }
}

module.exports = { renderSvg, createRng, esc, DEFAULTS };
