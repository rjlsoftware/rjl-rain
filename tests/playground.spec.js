// The playground: its controls drive the rain, and the code it writes is ready to paste.
const { test, expect } = require('@playwright/test');
const { readFileSync } = require('fs');
const { createHash } = require('crypto');
const { version } = require('../package.json');

const sri = 'sha384-' + createHash('sha384').update(readFileSync(require.resolve('../rjl-rain.min.js'))).digest('base64');

test('the playground drives the rain and writes the code for it', async ({ page }) => {
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto('/playground/');
    await page.waitForFunction(() => window.rain && window.rain.running);
    const code = page.locator('#code');
    await expect(code).toContainText(`rjl-rain@v${version}/rjl-rain.min.js" integrity="${sri}" crossorigin="anonymous"`);
    await expect(code).toContainText('RJLRain();');

    // The custom-glyphs field shows only for "Your own...".
    await expect(page.locator('#custom-row')).toBeHidden();
    await page.selectOption('#preset', 'custom');
    await expect(page.locator('#custom-row')).toBeVisible();
    await expect(code).toContainText("chars: 'RAIN'");

    await page.selectOption('#preset', 'binary');
    await expect(page.locator('#custom-row')).toBeHidden();
    await page.fill('#word', 'HELLO, WORLD');
    await page.check('#transparent');
    await expect(code).toContainText('chars: RJLRain.glyphs.binary');
    await expect(code).toContainText("background: 'transparent'");
    await expect(code).toContainText("word: ['HELLO', 'WORLD']");
    expect(await page.evaluate(() => [document.documentElement.classList.contains('see-through'), rain.form()])).toEqual([true, true]);

    await page.click('#tab-element');
    await expect(code).toContainText('<rjl-rain fullscreen chars="binary" background="transparent" word="HELLO, WORLD"></rjl-rain>');

    await page.click('#reset');
    await page.click('#tab-script');
    await expect(code).toContainText('RJLRain();');
    expect(errors).toEqual([]);
});

test('the playground fits a phone screen with no sideways scroll', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 740 });
    await page.goto('/playground/');
    await page.waitForFunction(() => window.rain);
    expect(await page.evaluate(() => document.scrollingElement.scrollWidth)).toBeLessThanOrEqual(375);
    await page.click('#hide');
    await expect(page.locator('#panel')).toBeHidden();
    await page.click('#show');
    await expect(page.locator('#panel')).toBeVisible();
});
