// rjl-rain in a real browser (Chromium), driven through the demo page.
const { test, expect } = require('@playwright/test');

// How many pixels of the first canvas carry the rain color (green channel well above red).
function litPixels(page) {
    return page.evaluate(() => {
        const c = document.querySelector('canvas');
        const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
        let n = 0;
        for (let i = 0; i < d.length; i += 4) if (d[i + 1] > 80 && d[i + 1] > d[i] + 40) n++;
        return n;
    });
}

async function open(page, query = '') {
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto('/demo/' + query);
    await page.waitForFunction(() => window.rain && window.rain.canvas.width > 0);
    return errors;
}

test('the demo rains, behind the page, on a full-viewport canvas', async ({ page }) => {
    const errors = await open(page);
    await expect.poll(() => litPixels(page)).toBeGreaterThan(200);
    const info = await page.evaluate(() => {
        const c = window.rain.canvas;
        const s = getComputedStyle(c);
        return { running: window.rain.running, position: s.position, z: s.zIndex, events: s.pointerEvents, hidden: c.getAttribute('aria-hidden'), w: c.clientWidth };
    });
    expect(info).toEqual({ running: true, position: 'fixed', z: '-1', events: 'none', hidden: 'true', w: 1280 });
    expect(errors).toEqual([]);
});

test('the minified build is the same library', async ({ page }) => {
    const errors = await open(page, '?min=1');
    expect(await page.evaluate(() => [RJLRain.version, document.querySelector('script[src$="rjl-rain.min.js"]') !== null])).toEqual(['1.0.0', true]);
    await expect.poll(() => litPixels(page)).toBeGreaterThan(200);
    expect(errors).toEqual([]);
});

test('spells a word that fits and refuses one that does not', async ({ page }) => {
    await open(page);
    expect(await page.evaluate(() => [rain.form('HI'), rain.forming])).toEqual([true, true]);
    expect(await page.evaluate(() => rain.form('X'.repeat(500)))).toBe(false);
    await page.fill('#word', 'RAIN');
    await page.click('#spell button[type=submit]');
    expect(await page.evaluate(() => rain.forming)).toBe(true);
});

test('pause, resume, set and destroy', async ({ page }) => {
    await open(page);
    await page.click('#pause');
    expect(await page.evaluate(() => rain.running)).toBe(false);
    await page.click('#pause');
    expect(await page.evaluate(() => rain.running)).toBe(true);
    await page.click('[data-color="#FFB000"]');
    await page.evaluate(() => rain.set({ fontSize: 24 }));
    expect(await page.evaluate(() => rain.running)).toBe(true);
    await page.evaluate(() => rain.destroy());
    expect(await page.evaluate(() => [document.querySelectorAll('canvas').length, rain.running])).toEqual([0, false]);
});

test('reduced motion paints one still frame and never starts the loop', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    const errors = await open(page);
    expect(await page.evaluate(() => rain.running)).toBe(false);
    expect(await litPixels(page)).toBeGreaterThan(200);
    expect(await page.evaluate(() => rain.form('OK'))).toBe(true);
    await page.mouse.click(640, 200); // no ripple, no loop
    expect(await page.evaluate(() => rain.running)).toBe(false);
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await expect.poll(() => page.evaluate(() => rain.running)).toBe(true);
    expect(errors).toEqual([]);
});

test('drives a canvas of your own at its CSS size, crisp at 2x', async ({ browser }) => {
    const context = await browser.newContext({ deviceScaleFactor: 2 });
    const page = await context.newPage();
    await page.goto('/demo/');
    await page.waitForFunction(() => window.RJLRain);
    const size = await page.evaluate(() => {
        const c = document.createElement('canvas');
        c.id = 'mine';
        c.style.cssText = 'width:300px;height:150px';
        document.body.appendChild(c);
        const r = RJLRain('#mine', { chars: 'RJL', word: '' });
        return [c.width, c.height, r.running, c.clientWidth];
    });
    expect(size).toEqual([600, 300, true, 300]);
    // It follows the layout: a CSS size change re-sizes the backing store.
    await page.evaluate(() => { document.getElementById('mine').style.width = '400px'; });
    await expect.poll(() => page.evaluate(() => document.getElementById('mine').width)).toBe(800);
    expect(await page.evaluate(() => { try { RJLRain('#nope'); return 'no error'; } catch (e) { return e.message; } })).toMatch(/no element matches #nope/);
    await context.close();
});

test('called from <head>, it waits for <body> before adding its canvas', async ({ page }) => {
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto('/demo/');
    await page.setContent('<!DOCTYPE html><html><head><script src="../rjl-rain.js"></script>' +
        '<script>window.early = RJLRain(); window.hadBody = !!document.body;</script></head><body><p>page</p></body></html>');
    await page.waitForFunction(() => window.early && window.early.running);
    expect(await page.evaluate(() => [window.hadBody, document.body.firstElementChild.localName])).toEqual([false, 'canvas']);
    expect(errors).toEqual([]);
});

test('pointer moves and clicks, on the panel and on the rain, keep it running cleanly', async ({ page }) => {
    const errors = await open(page);
    await page.click('[data-chars="binary"]');
    await page.mouse.click(900, 200);
    await expect.poll(() => litPixels(page)).toBeGreaterThan(200);
    expect(errors).toEqual([]);
});

test('the README banner is a valid, script-free SVG', async ({ page }) => {
    const res = await page.goto('/assets/rain.svg');
    expect(res.headers()['content-type']).toContain('image/svg+xml');
    expect(await page.evaluate(() => [document.documentElement.localName, document.querySelectorAll('parsererror, script').length])).toEqual(['svg', 0]);
});
