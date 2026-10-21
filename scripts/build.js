#!/usr/bin/env node
/**
 * build.js - makes the generated files from source:
 *
 *   rjl-rain.min.js    rjl-rain.js minified by Terser (the license banner survives)
 *   rjl-rain.mjs       the ES module build: the same factory, exported as default
 *   rjl-rain.min.mjs   the ES module build, minified
 *   rjl-rain.d.mts     the ES module types, from rjl-rain.d.ts
 *   assets/rain.svg    the README banner (scripts/render-svg.js defaults)
 *   README.md          keeps its CDN version, SRI hash and gzipped size in step
 *
 * All of them are committed - the CDN serves the scripts straight from a tag - and the build is
 * deterministic, so CI rebuilds and fails on any diff.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const crypto = require('crypto');
const { minify } = require('terser');
const { renderSvg } = require('./render-svg.js');
const { version } = require('../package.json');

const ROOT = path.join(__dirname, '..');
const read = (name) => fs.readFileSync(path.join(ROOT, name), 'utf8').replace(/\r\n/g, '\n');
const write = (name, text) => fs.writeFileSync(path.join(ROOT, name), text);

// The UMD wrapper around the factory in rjl-rain.js; the ES module build swaps it for an export.
const UMD_HEAD = "(function (root, factory) {\n  if (typeof module === 'object' && module.exports) module.exports = factory();\n" +
    "  else root.RJLRain = factory();\n}(typeof self !== 'undefined' ? self : this, function () {\n";
const UMD_TAIL = /\}\)\);\n*$/;

function toModule(src) {
    if (!src.includes(UMD_HEAD) || !UMD_TAIL.test(src)) throw new Error('rjl-rain.js lost its UMD wrapper, so the ES module build cannot be made');
    const lines = src.replace(UMD_HEAD, 'const RJLRain = (function () {\n').replace(UMD_TAIL, '})();\n\nexport default RJLRain;\n').split('\n');
    lines.splice(1, 0, '// rjl-rain.mjs - the ES module build, generated from rjl-rain.js by scripts/build.js. Edit that file instead.');
    return lines.join('\n');
}

function toModuleTypes(dts) {
    const tail = 'export = RJLRain;\nexport as namespace RJLRain;\n';
    if (!dts.endsWith(tail)) throw new Error('rjl-rain.d.ts must end with `export = RJLRain;` and `export as namespace RJLRain;`');
    const lines = dts.slice(0, -tail.length).concat('export default RJLRain;\n').split('\n');
    lines[1] = '// rjl-rain.d.mts - the ES module types, generated from rjl-rain.d.ts by scripts/build.js. Edit that file instead.';
    return lines.join('\n');
}

async function squeeze(code, module) {
    const result = await minify(code, {
        module,
        compress: { passes: 2 },
        mangle: true,
        format: { comments: /^!/ }
    });
    const min = result.code + '\n';
    if (!min.startsWith('/*! rjl-rain v') || !min.includes('RJLRain')) {
        throw new Error('minified output lost its license banner or its RJLRain export');
    }
    return min;
}

function syncReadme(min, gzKb) {
    const sri = 'sha384-' + crypto.createHash('sha384').update(min).digest('base64');
    const before = read('README.md');
    const after = before
        .replace(/rjl-rain@v\d+\.\d+\.\d+/g, `rjl-rain@v${version}`)
        .replace(/rjl-rain@\d+\.\d+\.\d+/g, `rjl-rain@${version}`)
        .replace(/rjlsoftware\/rjl-rain#v\d+\.\d+\.\d+/g, `rjlsoftware/rjl-rain#v${version}`)
        .replace(/(rjl-rain\.min\.js" integrity=")sha384-[A-Za-z0-9+/=]+"/g, `$1${sri}"`)
        .replace(/gzipped-\d+(\.\d+)?_KB/g, `gzipped-${gzKb}_KB`)
        .replace(/\d+(\.\d+)? KB gzipped/g, `${gzKb} KB gzipped`);
    if (after !== before) write('README.md', after);
    console.log(`README.md        v${version}, ${sri.slice(0, 19)}..., ${gzKb} KB gzipped${after === before ? ' (unchanged)' : ''}`);
}

async function build() {
    const src = read('rjl-rain.js');
    const min = await squeeze(src, false);
    write('rjl-rain.min.js', min);
    const gz = zlib.gzipSync(min, { level: 9 }).length;
    const gzKb = (gz / 1024).toFixed(1);
    console.log(`rjl-rain.min.js  ${(min.length / 1024).toFixed(1)} KB (${gzKb} KB gzipped)`);

    const esm = toModule(src);
    write('rjl-rain.mjs', esm);
    const minEsm = await squeeze(esm, true);
    write('rjl-rain.min.mjs', minEsm);
    console.log(`rjl-rain.mjs     ${(esm.length / 1024).toFixed(1)} KB, minified ${(minEsm.length / 1024).toFixed(1)} KB`);

    write('rjl-rain.d.mts', toModuleTypes(read('rjl-rain.d.ts')));
    console.log('rjl-rain.d.mts   from rjl-rain.d.ts');

    const svg = renderSvg({});
    fs.mkdirSync(path.join(ROOT, 'assets'), { recursive: true });
    write(path.join('assets', 'rain.svg'), svg);
    console.log(`assets/rain.svg  ${(svg.length / 1024).toFixed(1)} KB`);

    syncReadme(min, gzKb);
}

build().catch((err) => {
    console.error(`build failed: ${err.message}`);
    process.exit(1);
});
