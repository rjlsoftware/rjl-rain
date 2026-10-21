// rjl-rain 1.1 in Chromium: elements as targets, a transparent background, drop heads and speeds,
// word lists, off-screen sleep, the pause button, the ES module builds, <rjl-rain>,
// data-rjl-rain and web fonts.
const { test, expect } = require('@playwright/test');
const { version } = require('../package.json');

// A blank page on the test server with the readable build loaded after `body`.
async function setup(page, body) {
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto('/demo/');
    await page.setContent('<!DOCTYPE html><html><head><meta charset="utf-8"></head><body style="margin:0">' +
        body + '<script src="../rjl-rain.js"></script></body></html>');
    await page.waitForFunction(() => window.RJLRain);
    return errors;
}

// Pixel counts on window.r's canvas: lit = clearly the rain color, white = the head color,
// red = the bright color in the word tests, clear = fully transparent.
function census(page) {
    return page.evaluate(() => {
        const c = window.r.canvas;
        const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
        const n = { lit: 0, white: 0, red: 0, clear: 0, faint: 0, total: d.length / 4 };
        for (let i = 0; i < d.length; i += 4) {
            const [R, G, B, A] = [d[i], d[i + 1], d[i + 2], d[i + 3]];
            if (A === 0) n.clear++;
            else if (A < 8) n.faint++;
            if (R > 230 && G > 230 && B > 230) n.white++;
            else if (R > 200 && G < 60) n.red++;
            else if (G > 120 && G > R + 60) n.lit++;
        }
        return n;
    });
}

test('fills an element it is given, behind its content, and leaves the element as it was', async ({ page }) => {
    const errors = await setup(page, '<section id="hero" style="height:240px;background:#123"><h1>Hello</h1></section>');
    const info = await page.evaluate(() => {
        const hero = document.getElementById('hero');
        window.r = RJLRain('#hero', { word: '' });
        const c = window.r.canvas;
        const s = getComputedStyle(c);
        const hs = getComputedStyle(hero);
        return [c.parentElement === hero, hero.firstElementChild === c, s.position, s.zIndex, s.pointerEvents,
            c.getAttribute('aria-hidden'), c.clientWidth, c.clientHeight, hs.position, hs.isolation];
    });
    expect(info).toEqual([true, true, 'absolute', '-1', 'none', 'true', 1280, 240, 'relative', 'isolate']);
    await expect.poll(async () => (await census(page)).lit).toBeGreaterThan(200);
    expect(await page.evaluate(() => {
        r.destroy();
        const hero = document.getElementById('hero');
        return [hero.querySelectorAll('canvas').length, hero.style.position, hero.style.isolation];
    })).toEqual([0, '', '']);
    expect(errors).toEqual([]);
});

test('a transparent background rains over the page and leaves nothing behind', async ({ page }) => {
    const errors = await setup(page, '<div id="box" style="height:300px"></div>');
    await page.evaluate(() => { window.r = RJLRain('#box', { background: 'transparent', fade: 0.3, word: '', interactive: false, fps: 60 }); });
    await expect.poll(async () => (await census(page)).lit).toBeGreaterThan(200);
    const mid = await census(page);
    expect(mid.clear).toBeGreaterThan(mid.total / 4); // see-through between the drops
    // Blank glyphs stop the ink; the fade and the sweep must then clear every pixel, faint tails too.
    await page.evaluate(() => r.set({ chars: ' ' }));
    await expect.poll(async () => { const n = await census(page); return n.total - n.clear; }, { timeout: 10000 }).toBe(0);
    expect(errors).toEqual([]);
});

test('a head color lights only the leading glyph of each drop', async ({ page }) => {
    await setup(page, '<div id="box" style="height:320px"></div>');
    await page.evaluate(() => { window.r = RJLRain('#box', { head: '#FFFFFF', word: '', interactive: false, fade: 0.04 }); });
    await expect.poll(async () => (await census(page)).lit).toBeGreaterThan(3000);
    const n = await census(page);
    expect(n.white).toBeGreaterThan(100);
    expect(n.white * 4).toBeLessThan(n.lit);
    // Without a head color nothing is white.
    await page.evaluate(() => { r.destroy(); window.r = RJLRain('#box', { word: '', interactive: false }); });
    await expect.poll(async () => (await census(page)).lit).toBeGreaterThan(1000);
    expect((await census(page)).white).toBe(0);
});

test('speedVariance lets columns fall at different speeds', async ({ page }) => {
    await setup(page, '<div id="box" style="height:700px"></div>');
    // How far apart the deepest drops of the columns are, a moment after the rain starts.
    const spread = (variance) => page.evaluate(async (v) => {
        if (window.r) window.r.destroy();
        window.r = RJLRain('#box', { speedVariance: v, word: '', interactive: false, fps: 60, fade: 0 });
        await new Promise((ok) => setTimeout(ok, 300));
        r.pause();
        const c = r.canvas;
        const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
        const deepest = [];
        for (let col = 0; col < Math.floor(c.width / 16); col++) {
            let y = -1;
            for (let row = 0; row < c.height; row++) {
                for (let x = col * 16; x < col * 16 + 16; x++) if (d[(row * c.width + x) * 4 + 1] > 60) { y = row; break; }
            }
            if (y >= 0) deepest.push(y);
        }
        return Math.max(...deepest) - Math.min(...deepest);
    }, variance);
    expect(await spread(0)).toBeLessThanOrEqual(24);
    expect(await spread(1)).toBeGreaterThan(80);
});

test('spells several words in turn, reports each one, and can center them', async ({ page }) => {
    await setup(page, '<div id="box" style="height:400px"></div>');
    const seen = await page.evaluate(() => new Promise((done) => {
        const words = [];
        window.r = RJLRain('#box', {
            word: ['AB', 'CD'], wordChance: 1, wordFrames: 1, fps: 60,
            onWord: (w) => { words.push(w); if (words.length === 3) { r.pause(); done(words); } }
        });
    }));
    expect(seen).toEqual(['AB', 'CD', 'AB']);

    // A centered 'II' at scale 3 is 33 x 15 cells (528 x 240 px). With no fade every lit cell stays,
    // so once the drops have crossed it the red bounding box is the whole word.
    await page.evaluate(() => {
        r.destroy();
        window.r = RJLRain('#box', { word: '', bright: '#FF0000', interactive: false, wordPosition: 'center', wordScale: 3, wordFrames: 400, fps: 60, fade: 0 });
        r.form('II');
    });
    const redBox = () => page.evaluate(() => {
        const c = r.canvas;
        const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
        let x0 = 1e9, x1 = -1, y0 = 1e9, y1 = -1;
        for (let i = 0; i < d.length; i += 4) {
            if (d[i] > 200 && d[i + 1] < 60) {
                const p = i / 4, x = p % c.width, y = Math.floor(p / c.width);
                x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y);
            }
        }
        return { w: x1 - x0, h: y1 - y0, cx: (x0 + x1) / 2 - c.width / 2, cy: (y0 + y1) / 2 - c.height / 2 };
    });
    await expect.poll(async () => { const b = await redBox(); return b.w > 480 && b.h > 200; }, { timeout: 10000 }).toBe(true);
    const box = await redBox();
    expect(Math.abs(box.cx)).toBeLessThan(32);
    expect(Math.abs(box.cy)).toBeLessThan(32);
});

test('sleeps while it is scrolled out of view, unless told not to', async ({ page }) => {
    await setup(page, '<div style="height:3000px"></div><div id="low" style="height:200px"></div>');
    await page.evaluate(() => { window.r = RJLRain('#low'); });
    await expect.poll(() => page.evaluate(() => r.running)).toBe(false);
    await page.evaluate(() => document.getElementById('low').scrollIntoView());
    await expect.poll(() => page.evaluate(() => r.running)).toBe(true);
    await page.evaluate(() => window.scrollTo(0, 0));
    await expect.poll(() => page.evaluate(() => r.running)).toBe(false);
    await page.evaluate(() => r.set({ pauseOffscreen: false }));
    expect(await page.evaluate(() => [r.running, r.paused])).toEqual([true, false]);
});

test('controls: a pause button that remembers the choice, or a button of your own', async ({ page }) => {
    const errors = await setup(page, '<button id="mine" type="button">Rain</button>');
    await page.evaluate(() => { window.r = RJLRain({ controls: true }); });
    const toggle = page.locator('.rjl-rain-toggle');
    await expect(toggle).toHaveAttribute('aria-label', 'Pause animation');
    await expect(toggle).toHaveAttribute('aria-pressed', 'false');
    await toggle.click();
    expect(await page.evaluate(() => [r.running, r.paused])).toEqual([false, true]);
    await expect(toggle).toHaveAttribute('aria-pressed', 'true');

    // The next page view starts paused, until the visitor resumes it.
    await page.evaluate(() => { r.destroy(); window.r = RJLRain({ controls: true }); });
    expect(await page.evaluate(() => [r.running, document.querySelectorAll('.rjl-rain-toggle').length])).toEqual([false, 1]);
    await page.locator('.rjl-rain-toggle').click();
    expect(await page.evaluate(() => r.running)).toBe(true);

    // Reduced motion never animates, so the button hides.
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await expect(page.locator('.rjl-rain-toggle')).toBeHidden();
    await page.emulateMedia({ reducedMotion: 'no-preference' });

    // A button of your own: wired up, not replaced.
    await page.evaluate(() => { r.destroy(); window.r = RJLRain({ controls: '#mine' }); });
    expect(await page.evaluate(() => document.querySelectorAll('.rjl-rain-toggle').length)).toBe(0);
    await page.click('#mine');
    expect(await page.evaluate(() => [r.paused, document.getElementById('mine').getAttribute('aria-pressed')])).toEqual([true, 'true']);
    expect(errors).toEqual([]);
});

test('the ES module builds export the same library', async ({ page }) => {
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto('/demo/');
    await page.setContent('<!DOCTYPE html><html><body><script type="module">' +
        'import A from "../rjl-rain.mjs"; import B from "../rjl-rain.min.mjs";' +
        'window.mods = [A.version, B.version, typeof A.auto, typeof A("body").destroy];</script></body></html>');
    await page.waitForFunction(() => window.mods);
    expect(await page.evaluate(() => window.mods)).toEqual([version, version, 'function', 'function']);
    expect(errors).toEqual([]);
});

test('<rjl-rain> needs no JavaScript, follows its attributes, and cleans up after itself', async ({ page }) => {
    const errors = await setup(page, '<rjl-rain id="el" word="HI" color="#FFB000" chars="binary" style="height:200px"></rjl-rain>');
    await page.waitForFunction(() => document.getElementById('el').rain && document.getElementById('el').rain.running);
    expect(await page.evaluate(() => {
        const el = document.getElementById('el');
        return [getComputedStyle(el).display, el.firstElementChild.localName, el.rain.canvas.clientHeight];
    })).toEqual(['block', 'canvas', 200]);

    const spell = () => page.evaluate(() => new Promise((done) => {
        const el = document.getElementById('el');
        el.addEventListener('word', (e) => done(e.detail.word), { once: true });
        el.rain.form();
    }));
    expect(await spell()).toBe('HI');
    await page.evaluate(() => document.getElementById('el').setAttribute('word', 'ONE, TWO'));
    expect(await spell()).toBe('ONE');
    expect(await spell()).toBe('TWO');

    await page.evaluate(() => { window.kept = document.getElementById('el').rain; document.getElementById('el').remove(); });
    expect(await page.evaluate(() => [kept.running, document.querySelectorAll('canvas').length])).toEqual([false, 0]);

    // fullscreen: the classic background canvas.
    await page.evaluate(() => { document.body.insertAdjacentHTML('beforeend', '<rjl-rain id="full" fullscreen></rjl-rain>'); });
    expect(await page.evaluate(() => {
        const c = document.getElementById('full').rain.canvas;
        return [c.parentElement === document.body, getComputedStyle(c).position];
    })).toEqual([true, 'fixed']);
    expect(errors).toEqual([]);
});

test('data-rjl-rain starts elements from JSON options, and RJLRain.auto() picks up new ones', async ({ page }) => {
    const messages = [];
    page.on('console', (m) => messages.push(m.text()));
    const errors = await setup(page, '<div id="d" data-rjl-rain=\'{"word":"OK","fontSize":20}\' style="height:150px"></div>' +
        '<canvas id="c" data-rjl-rain style="width:200px;height:100px"></canvas>' +
        '<div id="bad" data-rjl-rain="{oops" style="height:50px"></div>');
    await page.waitForFunction(() => document.getElementById('d').rjlRain && document.getElementById('c').rjlRain);
    expect(await page.evaluate(() => {
        const d = document.getElementById('d'), c = document.getElementById('c');
        return [d.rjlRain.canvas.parentElement === d, c.rjlRain.canvas === c, !!document.getElementById('bad').rjlRain];
    })).toEqual([true, true, false]);
    expect(messages.some((m) => /not valid JSON/.test(m))).toBe(true);
    expect(await page.evaluate(() => {
        const n = document.createElement('div');
        n.setAttribute('data-rjl-rain', '');
        n.style.height = '50px';
        document.body.appendChild(n);
        return [RJLRain.auto().length, RJLRain.auto().length];
    })).toEqual([1, 0]);
    expect(errors).toEqual([]);
});

test('asks the browser for a web font it is given', async ({ page }) => {
    await setup(page, '');
    const asked = await page.evaluate(() => {
        const asked = [];
        const load = document.fonts.load.bind(document.fonts);
        document.fonts.load = (font, text) => { asked.push(font); return load(font, text); };
        const r = RJLRain({ fontFamily: '"Fira Code", monospace', fontSize: 18 });
        r.set({ fontSize: 22 });
        r.set({ color: '#FFB000' }); // no font change, no new request
        return asked;
    });
    expect(asked).toEqual(['18px "Fira Code", monospace', '22px "Fira Code", monospace']);
});
