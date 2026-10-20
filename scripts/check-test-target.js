/*
 * check-test-target.js - refuses to run the browser suite against anything but localhost.
 *
 * Wired as `pretest` (so `npm test` stops before Playwright loads) and as Playwright
 * `globalSetup` (so a direct `npx playwright test` is guarded too). For a deliberate one-off
 * check against a remote host: ALLOW_LIVE_TESTS=1 BASE_URL=https://... npm test
 */
'use strict';

const { DEV_URL, PROJECT_NAME } = require('./dev-port.js');

const LOOPBACK = new Set(['localhost', '127.0.0.1', '::1', '0.0.0.0', '[::1]']);

function checkTestTarget() {
    const url = process.env.BASE_URL || process.env.PLAYWRIGHT_BASE_URL || DEV_URL;
    let host;
    try {
        host = new URL(url).hostname;
    } catch {
        fail(url, `"${url}" is not a valid URL.`);
    }
    if (!LOOPBACK.has(host)) {
        if (process.env.ALLOW_LIVE_TESTS === '1') {
            console.warn(`[check-test-target] ALLOW_LIVE_TESTS=1 - running against ${url}`);
            return url;
        }
        fail(url, `Refusing to run tests against the non-loopback host "${host}".`);
    }
    return url;
}

function fail(url, reason) {
    console.error(`
[check-test-target] BLOCKED
  Project:  ${PROJECT_NAME}
  Detected: ${url}
  Reason:   ${reason}

  Run the suite locally:         npm test   (Playwright starts scripts/serve.js itself)
  For a deliberate remote check: ALLOW_LIVE_TESTS=1 BASE_URL=https://... npm test
`);
    process.exit(1);
}

module.exports = function globalSetup() { checkTestTarget(); };
module.exports.checkTestTarget = checkTestTarget;

if (require.main === module) {
    console.log(`[check-test-target] OK - ${checkTestTarget()} (${PROJECT_NAME})`);
}
