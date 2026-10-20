#!/usr/bin/env node
/**
 * build.js - makes the two generated files from source:
 *
 *   rjl-rain.min.js   rjl-rain.js minified by Terser (the license banner survives)
 *   assets/rain.svg   the README banner (scripts/render-svg.js defaults)
 *
 * Both are committed - the minified file is what the CDN serves straight from a tag - and the
 * build is deterministic, so CI rebuilds and fails on any diff.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const { minify } = require('terser');
const { renderSvg } = require('./render-svg.js');

const ROOT = path.join(__dirname, '..');

async function build() {
    const src = fs.readFileSync(path.join(ROOT, 'rjl-rain.js'), 'utf8');
    const result = await minify(src, {
        compress: { passes: 2 },
        mangle: true,
        format: { comments: /^!/ }
    });
    const min = result.code + '\n';
    if (!min.startsWith('/*! rjl-rain v') || !min.includes('RJLRain')) {
        throw new Error('minified output lost its license banner or its RJLRain export');
    }
    fs.writeFileSync(path.join(ROOT, 'rjl-rain.min.js'), min);
    const gz = zlib.gzipSync(min, { level: 9 }).length;
    console.log(`rjl-rain.min.js  ${(min.length / 1024).toFixed(1)} KB (${(gz / 1024).toFixed(1)} KB gzipped)`);

    const svg = renderSvg({});
    fs.mkdirSync(path.join(ROOT, 'assets'), { recursive: true });
    fs.writeFileSync(path.join(ROOT, 'assets', 'rain.svg'), svg);
    console.log(`assets/rain.svg  ${(svg.length / 1024).toFixed(1)} KB`);
}

build().catch((err) => {
    console.error(`build failed: ${err.message}`);
    process.exit(1);
});
