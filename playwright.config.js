const { defineConfig, devices } = require('@playwright/test');

const { DEV_URL } = require('./scripts/dev-port.js');
const baseURL = process.env.PLAYWRIGHT_BASE_URL || process.env.BASE_URL || DEV_URL;

module.exports = defineConfig({
    testDir: './tests',
    // tests/unit/ belongs to Vitest (npm run test:unit).
    testIgnore: '**/unit/**',
    fullyParallel: true,
    forbidOnly: !!process.env.CI,
    retries: process.env.CI ? 2 : 0,
    reporter: 'list',
    globalSetup: require.resolve('./scripts/check-test-target.js'),
    use: { baseURL, trace: 'on-first-retry' },
    projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
    webServer: {
        command: 'node scripts/serve.js',
        url: baseURL + '/demo/',
        reuseExistingServer: !process.env.CI,
        timeout: 30 * 1000
    }
});
