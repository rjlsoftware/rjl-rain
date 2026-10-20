/*
 * dev-port.js - the local port for this project.
 *
 * Derived from the folder name (FNV-1a folded into 3000-9993) instead of hard-coded, so sibling
 * projects never collide and the value is stable across runs and machines. Well-known service
 * ports are skipped by re-hashing with a salt. Set PORT to override; a malformed PORT fails
 * loudly instead of silently falling back.
 *
 * Used by playwright.config.js, scripts/serve.js and scripts/check-test-target.js.
 * `node scripts/dev-port.js` prints it.
 */
'use strict';

const path = require('path');

const MIN_PORT = 3000;
const MAX_PORT = 9993;
const SPAN = MAX_PORT - MIN_PORT + 1;
const DENIED_PORTS = new Set([3306, 5432, 6379, 8080, 9000, 27017]);
const MAX_REHASH = 8;

function fnv1a(name) {
    let h = 0x811c9dc5;
    for (let i = 0; i < name.length; i++) {
        h ^= name.charCodeAt(i);
        h = Math.imul(h, 0x01000193) >>> 0;
    }
    return h;
}

function portFor(name) {
    let salt = '';
    for (let i = 0; i < MAX_REHASH; i++) {
        const port = MIN_PORT + (fnv1a(String(name) + salt) % SPAN);
        if (!DENIED_PORTS.has(port)) return port;
        salt += '#';
    }
    return MIN_PORT;
}

const PROJECT_NAME = path.basename(path.resolve(__dirname, '..'));

function resolvePort(raw, name = PROJECT_NAME) {
    const value = raw === undefined || raw === null ? '' : String(raw).trim();
    if (value === '') return portFor(name);
    if (!/^\d+$/.test(value) || Number(value) < 1 || Number(value) > 65535) {
        throw new Error(`PORT="${raw}" must be a whole number from 1 to 65535 (unset it to use ${portFor(name)}).`);
    }
    return Number(value);
}

let DEV_PORT;
try {
    DEV_PORT = resolvePort(process.env.PORT);
} catch (err) {
    console.error(`[dev-port] ${err.message}`);
    process.exit(1);
}
const DEV_URL = `http://localhost:${DEV_PORT}`;

module.exports = { PROJECT_NAME, DEV_PORT, DEV_URL, portFor, resolvePort };

if (require.main === module) console.log(DEV_PORT);
