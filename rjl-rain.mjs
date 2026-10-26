/*! rjl-rain v1.1.3 | MIT License | (c) 2026 RJ Lindelof | https://github.com/rjlsoftware/rjl-rain */
// rjl-rain.mjs - the ES module build, generated from rjl-rain.js by scripts/build.js. Edit that file instead.
// rjl-rain - Matrix digital rain on a <canvas>. One file, zero dependencies.
//
// Born as the background of RJL OS (https://rjl.sh): one requestAnimationFrame
// loop at a deliberate retro cadence, glyphs that brighten around the pointer,
// clicks that send ripples through the rain, and a hidden word that the falling
// drops spell out every so often. Honors prefers-reduced-motion with one still
// frame, sleeps while it is scrolled out of view, and draws crisp on high-DPI screens.
//
// Usage:  RJLRain()                          full-screen background canvas
//         RJLRain('#hero', { chars: 'RJL' })  fill an element, or drive your own <canvas>
//         <rjl-rain word="HELLO"></rjl-rain>  no JavaScript at all
// Works as a classic <script> (window.RJLRain), a CommonJS/bundler import, or an
// ES module (rjl-rain.mjs, which the build generates from this file).

const RJLRain = (function () {
  'use strict';

  const VERSION = '1.1.3';

  function range(from, to) {
    let s = '';
    for (let c = from; c <= to; c++) s += String.fromCharCode(c);
    return s;
  }

  // Glyph presets. CLASSIC is the film's half-width katakana plus digits.
  const GLYPHS = Object.freeze({
    classic: range(0xFF66, 0xFF9D) + '0123456789',
    rjl: 'RJL',
    binary: '01',
    hex: '0123456789ABCDEF'
  });

  // 5x5 block font for the word formation: one base-32 digit per row, most
  // significant bit = leftmost pixel. Unknown characters fall back to '?'.
  const FONT = {
    A: 'ehvhh', B: 'uhuhu', C: 'fgggf', D: 'uhhhu', E: 'vgugv', F: 'vgugg', G: 'fgjhe', H: 'hhvhh',
    I: 'v444v', J: '722ic', K: 'hisih', L: 'ggggv', M: 'hrlhh', N: 'hpljh', O: 'ehhhe', P: 'uhugg',
    Q: 'ehlid', R: 'uhuih', S: 'fge1u', T: 'v4444', U: 'hhhhe', V: 'hhha4', W: 'hhlrh', X: 'ha4ah',
    Y: 'ha444', Z: 'v248v', 0: 'ejlpe', 1: '4c44e', 2: 'eh68v', 3: 'u1e1u', 4: 'iiv22', 5: 'vgu1u',
    6: 'eguhe', 7: 'v1244', 8: 'ehehe', 9: 'ehf1e', ' ': '00000', '!': '44404', '?': 'eh604',
    '.': '00004', '-': '00e00', ':': '04040', _: '0000v', "'": '44000'
  };

  // The cells a word lights up, as [row, col] offsets from its top-left corner,
  // at `scale` cells per font pixel. Letters are 5 wide with a 1-cell gap.
  function wordShape(word, scale) {
    const s = Math.max(1, Math.floor(scale || 1));
    const chars = Array.from(String(word == null ? '' : word).toUpperCase());
    const cells = [];
    chars.forEach((ch, i) => {
      const glyph = FONT[ch] || FONT['?'];
      for (let r = 0; r < 5; r++) {
        const bits = parseInt(glyph[r], 32);
        for (let b = 0; b < 5; b++) {
          if (!((bits >> (4 - b)) & 1)) continue;
          for (let dy = 0; dy < s; dy++) {
            for (let dx = 0; dx < s; dx++) cells.push([r * s + dy, (i * 6 + b) * s + dx]);
          }
        }
      }
    });
    return {
      width: chars.length ? (chars.length * 6 - 1) * s : 0,
      height: chars.length ? 5 * s : 0,
      cells
    };
  }

  const DEFAULTS = Object.freeze({
    chars: GLYPHS.classic,   // glyphs that rain (any string; see RJLRain.glyphs)
    color: '#00FF00',        // rain
    bright: '#B6FFB6',       // pointer glow, ripples and the word
    head: '',                // leading glyph of every drop; '' keeps it the rain color
    background: '#000000',   // any CSS color, or 'transparent' to rain over the page
    fade: 0.05,              // how much each frame darkens the last (0-1): lower = longer trails
    fontSize: 16,            // px; also the column width
    fontFamily: 'monospace',
    fps: 20,                 // the retro cadence; the browser still paints at its own rate
    speed: 1,                // rows a drop falls per frame (0.1-3)
    speedVariance: 0,        // 0-1: how much slower than `speed` a column may fall
    word: 'RJL',             // spelled by the drops now and then (or an array, in turn); '' turns it off
    wordChance: 0.005,       // chance per frame of a new formation
    wordFrames: 50,          // how many frames a formation lasts
    wordChar: '1',
    wordScale: 1,            // cells per font pixel
    wordPosition: 'random',  // 'random' or 'center'
    onWord: null,            // called with the word each time one forms
    interactive: true,       // pointer glow and click ripples
    glowRadius: 70,          // px
    ignore: 'a,button,input,select,textarea,label,summary,[role="button"],[contenteditable]',
    reducedMotion: 'auto',   // 'auto' follows the OS setting; true = one still frame; false = always animate
    pauseOffscreen: true,    // stop drawing while the canvas is scrolled out of view
    controls: false          // true adds a pause button; or a selector/element for a button of your own
  });

  const RIPPLE_MS = 650;
  const RIPPLE_SPEED = 0.5;  // px per ms
  const RIPPLE_BAND = 22;    // px either side of the ring
  const SWEEP_BANDS = 20;    // transparent mode clears faint pixels from 1/20 of the canvas per frame
  const PAUSED_KEY = 'rjl-rain:paused';
  const PLAIN = 0, HEAD = 1, BRIGHT = 2, LIT = 3;
  const ICON_PAUSE = 'M4 3h3v10H4zM9 3h3v10H9z';
  const ICON_PLAY = 'M5 3l8 5-8 5z';

  function normalize(base, extra) {
    const o = Object.assign({}, base, extra || {});
    o.fade = Math.min(1, Math.max(0, Number(o.fade) || 0));
    o.fontSize = Math.max(6, Number(o.fontSize) || DEFAULTS.fontSize);
    o.fps = Math.min(60, Math.max(1, Number(o.fps) || DEFAULTS.fps));
    o.speed = Math.min(3, Math.max(0.1, Number(o.speed) || DEFAULTS.speed));
    o.speedVariance = Math.min(1, Math.max(0, Number(o.speedVariance) || 0));
    o.glowRadius = Math.max(0, Number(o.glowRadius) || 0);
    o.wordChance = Math.min(1, Math.max(0, Number(o.wordChance) || 0));
    o.wordFrames = Math.max(1, Math.floor(Number(o.wordFrames) || DEFAULTS.wordFrames));
    o.wordPosition = o.wordPosition === 'center' ? 'center' : 'random';
    o.chars = String(o.chars || '') || DEFAULTS.chars;
    o.head = o.head ? String(o.head) : '';
    o.words = (Array.isArray(o.word) ? o.word : [o.word]).filter((w) => w != null && w !== '').map(String);
    o.transparent = String(o.background).toLowerCase() === 'transparent';
    return o;
  }

  function RJLRain(target, options) {
    if (typeof document === 'undefined') throw new Error('RJLRain needs a browser (document is undefined)');
    if (target && typeof target === 'object' && typeof target.nodeType !== 'number' && options === undefined) {
      options = target;
      target = null;
    }

    const el = typeof target === 'string' ? document.querySelector(target) : target;
    if (typeof target === 'string' && !el) throw new Error('RJLRain: no element matches ' + target);
    if (el && typeof el.nodeType !== 'number') throw new TypeError('RJLRain: the target must be an element, a selector or a <canvas>');

    // A <canvas> is drawn on as it is; any other element gets a canvas of its own that fills
    // it; no target (or <body>/<html>) gets a fixed, full-viewport canvas behind the page.
    let canvas = el && el.getContext ? el : null;
    const host = el && !canvas && el !== document.body && el !== document.documentElement ? el : null;
    const owned = !canvas;
    let hostStyle = null;
    if (owned) {
      canvas = document.createElement('canvas');
      canvas.setAttribute('aria-hidden', 'true');
      if (host) {
        // Behind the element's content but above its background: isolate the element so the
        // canvas's z-index of -1 stays inside it.
        canvas.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;z-index:-1;pointer-events:none;display:block;border-radius:inherit';
        const cs = getComputedStyle(host);
        hostStyle = { position: host.style.position, isolation: host.style.isolation };
        if (cs.position === 'static') host.style.position = 'relative';
        if (cs.isolation !== 'isolate') host.style.isolation = 'isolate';
      } else {
        canvas.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;z-index:-1;pointer-events:none;display:block';
      }
    } else if (!canvas.style.width && canvas.clientWidth === canvas.width && canvas.clientHeight === canvas.height) {
      // No CSS size: pin the attribute size so high-DPI scaling cannot grow it.
      canvas.style.width = canvas.width + 'px';
      canvas.style.height = canvas.height + 'px';
    }

    let opts = normalize(DEFAULTS, options);
    const ctx = canvas.getContext('2d', { willReadFrequently: opts.transparent });
    let glyphs = Array.from(opts.chars);
    let font = opts.fontSize + 'px ' + opts.fontFamily;
    let w = 0, h = 0, columns = 0;
    // Per column: where the drop is (fractional row), the row it last drew, its speed, and the
    // glyph and kind of its leading cell (so a head-colored leader can be retired next row).
    let pos = new Float32Array(0), row = new Int32Array(0), spd = new Float32Array(0);
    let lead = [], kind = new Uint8Array(0);
    let raf = 0, last = 0, paused = false, destroyed = false, onScreen = true;
    let ink = '', sweepRow = 0, wordIdx = 0, stillShown = false;

    // Pointer state, plus a fixed ripple pool so the draw loop never allocates.
    let px = -1e4, py = -1e4;
    const ripples = [0, 1, 2, 3].map(() => ({ x: 0, y: 0, t: 0, lo: 0, hi: 0, on: false }));
    let rippleIdx = 0;
    let box = null;
    const rect = () => box || (box = canvas.getBoundingClientRect());

    // The current word formation: row * 65536 + column for every lit cell.
    const formation = new Set();
    let forming = false, formFrames = 0;

    // The pause button: one we made (owned) or one the page supplied.
    let toggle = null, ownToggle = false, toggleIcon = null;

    const motionQuery = typeof matchMedia === 'function' ? matchMedia('(prefers-reduced-motion: reduce)') : null;
    const still = () => (opts.reducedMotion === 'auto' ? !!(motionQuery && motionQuery.matches) : !!opts.reducedMotion);
    const roll = () => opts.speed * (1 - opts.speedVariance * Math.random());

    function clearAll() {
      if (opts.transparent) ctx.clearRect(0, 0, w, h);
      else { ctx.fillStyle = opts.background; ctx.fillRect(0, 0, w, h); }
      ink = '';
    }

    function resize() {
      if (destroyed) return;
      box = null;
      const dpr = Math.min((typeof devicePixelRatio === 'number' && devicePixelRatio) || 1, 2);
      w = Math.max(0, Math.round(canvas.clientWidth));
      h = Math.max(0, Math.round(canvas.clientHeight));
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      columns = Math.floor(w / opts.fontSize);
      pos = new Float32Array(columns).fill(1);
      row = new Int32Array(columns).fill(-1);
      spd = new Float32Array(columns);
      for (let i = 0; i < columns; i++) spd[i] = roll();
      lead = new Array(columns).fill('');
      kind = new Uint8Array(columns);
      sweepRow = 0;
      formation.clear();
      forming = false;
      clearAll();
      stillShown = false;
      if (still()) paintStill();
    }

    function paint(ch, x, y, color) {
      if (color !== ink) { ctx.fillStyle = color; ink = color; }
      ctx.fillText(ch, x, y);
    }

    // Empty one cell (y is the text baseline) so a glyph can be redrawn in another color.
    function wipe(x, y) {
      const fs = opts.fontSize;
      if (opts.transparent) {
        ctx.clearRect(x, y - fs, fs, Math.ceil(fs * 1.2));
        return;
      }
      if (ink !== opts.background) { ctx.fillStyle = opts.background; ink = opts.background; }
      ctx.fillRect(x, y - fs, fs, Math.ceil(fs * 1.2));
    }

    // A destination-out fade can only scale alpha, and 8-bit rounding parks the tail of every
    // trail at a faint alpha for good (9/255 at fade 0.05). Clear those pixels one band per frame,
    // so the whole canvas is swept about once a second at 20 fps.
    function sweep() {
      const cw = canvas.width, ch = canvas.height;
      if (!cw || !ch) return;
      const y0 = sweepRow >= ch ? 0 : sweepRow;
      const bh = Math.min(Math.ceil(ch / SWEEP_BANDS), ch - y0);
      const img = ctx.getImageData(0, y0, cw, bh);
      const d = img.data;
      const limit = Math.min(96, Math.ceil(0.5 / Math.max(opts.fade, 0.004)) + 2);
      let dirty = false;
      for (let i = 3; i < d.length; i += 4) {
        if (d[i] && d[i] < limit) { d[i] = d[i - 1] = d[i - 2] = d[i - 3] = 0; dirty = true; }
      }
      if (dirty) ctx.putImageData(img, 0, y0);
      sweepRow = y0 + bh;
    }

    function draw(now, stillPass) {
      const fs = opts.fontSize;
      if (!stillPass) stillShown = false;
      ctx.globalAlpha = opts.fade;
      if (opts.transparent) {
        ctx.globalCompositeOperation = 'destination-out';
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, w, h);
        ctx.globalCompositeOperation = 'source-over';
      } else {
        ctx.fillStyle = opts.background;
        ctx.fillRect(0, 0, w, h);
      }
      ctx.globalAlpha = 1;
      ctx.font = font;
      ink = '';

      // Ripple bands as squared radii, so the column loop needs no sqrt.
      let anyRipple = false;
      for (let r = 0; r < ripples.length; r++) {
        const rp = ripples[r];
        if (!rp.on) continue;
        const age = now - rp.t;
        if (age > RIPPLE_MS) { rp.on = false; continue; }
        const radius = age * RIPPLE_SPEED;
        const lo = Math.max(0, radius - RIPPLE_BAND);
        const hi = radius + RIPPLE_BAND;
        rp.lo = lo * lo;
        rp.hi = hi * hi;
        anyRipple = true;
      }

      const glow2 = opts.interactive ? opts.glowRadius * opts.glowRadius : -1;
      const head = opts.head;
      for (let i = 0; i < columns; i++) {
        const x = i * fs;
        const r = pos[i] | 0;
        if (r !== row[i]) {
          // Retire the old leader to the rain color, so only the newest glyph shines.
          if (kind[i] === HEAD) { const y0 = row[i] * fs; wipe(x, y0); paint(lead[i], x, y0, opts.color); }
          for (let rr = Math.max(row[i] + 1, r - 3, 1); rr <= r; rr++) {
            const y = rr * fs;
            let ch = glyphs[(Math.random() * glyphs.length) | 0];
            let k = PLAIN;
            if (forming && formation.has(rr * 65536 + i)) {
              ch = opts.wordChar;
              k = LIT;
            } else {
              const dx = x - px, dy = y - py;
              if (dx * dx + dy * dy < glow2) k = BRIGHT;
              else if (anyRipple) {
                for (let n = 0; n < ripples.length; n++) {
                  const rp = ripples[n];
                  if (!rp.on) continue;
                  const ex = x - rp.x, ey = y - rp.y;
                  const dd = ex * ex + ey * ey;
                  if (dd > rp.lo && dd < rp.hi) { k = BRIGHT; break; }
                }
              }
              if (k === PLAIN && head && rr === r) k = HEAD;
            }
            paint(ch, x, y, k === PLAIN ? opts.color : k === HEAD ? head : opts.bright);
            if (k === BRIGHT && Math.random() < 0.25) pos[i] += 1; // quicken under the pointer
            if (rr === r) { lead[i] = ch; kind[i] = k; }
          }
          row[i] = r;
        } else if (kind[i] === HEAD && head) {
          // A slow drop waiting in its cell keeps its leader at full strength.
          const y = r * fs;
          wipe(x, y);
          paint(lead[i], x, y, head);
        }
        if (r * fs > h && Math.random() > 0.975) {
          pos[i] = 0;
          row[i] = -1;
          kind[i] = PLAIN;
          spd[i] = roll();
        }
        pos[i] += spd[i];
      }

      if (forming) {
        if (++formFrames > opts.wordFrames) { forming = false; formFrames = 0; }
      } else if (opts.words.length && Math.random() < opts.wordChance) {
        form(undefined, true);
      }
      if (opts.transparent && !stillPass) sweep();
    }

    // Reduced motion: run the renderer until the canvas is full of rain, then stop.
    function paintStill() {
      clearAll();
      const passes = Math.ceil(h / opts.fontSize) + 30;
      const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
      for (let i = 0; i < passes; i++) draw(now, true);
      stillShown = true;
    }

    function frame(ts) {
      raf = requestAnimationFrame(frame);
      if (ts - last < 1000 / opts.fps) return;
      last = ts;
      draw(ts, false);
    }

    function startLoop() {
      if (!raf && !paused && !destroyed && !still() && (onScreen || !opts.pauseOffscreen)) raf = requestAnimationFrame(frame);
    }

    function stopLoop() {
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
    }

    // Bring the loop in line with the current state: reduced motion, paused, off-screen.
    function refresh() {
      if (destroyed) return;
      if (still()) { stopLoop(); if (!stillShown) paintStill(); }
      else if (paused || (!onScreen && opts.pauseOffscreen)) stopLoop();
      else startLoop();
      syncToggle();
    }

    function nextWord() {
      const words = opts.words;
      if (!words.length) return '';
      const word = words[wordIdx % words.length];
      wordIdx = (wordIdx + 1) % words.length;
      return word;
    }

    function form(word, fromLoop) {
      const text = word === undefined ? nextWord() : word;
      if (!text || destroyed) return false;
      const shape = wordShape(text, opts.wordScale);
      const rows = Math.floor(h / opts.fontSize);
      if (!shape.cells.length || shape.width > columns || shape.height > rows) return false; // needs room
      const center = opts.wordPosition === 'center';
      const startCol = center ? Math.floor((columns - shape.width) / 2) : Math.floor(Math.random() * (columns - shape.width + 1));
      const startRow = Math.min(Math.max(1, Math.floor(center ? (rows - shape.height) / 2 : rows / 3)), rows - shape.height);
      formation.clear();
      for (const [r, c] of shape.cells) formation.add((startRow + r) * 65536 + startCol + c);
      forming = true;
      formFrames = 0;
      if (!fromLoop && still()) paintStill();
      if (typeof opts.onWord === 'function') opts.onWord(String(text));
      return true;
    }

    function pause() { paused = true; refresh(); }
    function resume() { paused = false; refresh(); }

    // Custom fonts: a canvas never asks for a web font by itself, so request it, and repaint
    // the still frame once it arrives (an animated canvas picks it up on the next frame).
    function loadFont() {
      const fonts = document.fonts;
      if (!fonts || typeof fonts.load !== 'function') return;
      const wanted = font;
      fonts.load(wanted, glyphs.slice(0, 8).join('')).then(() => {
        if (!destroyed && wanted === font && still()) paintStill();
      }, () => {});
    }

    // ---- the pause button ----
    const onToggle = () => {
      if (paused) resume(); else pause();
      try { localStorage.setItem(PAUSED_KEY, paused ? '1' : '0'); } catch (e) { /* storage blocked */ }
    };

    function syncToggle() {
      if (!toggle) return;
      toggle.setAttribute('aria-pressed', paused ? 'true' : 'false');
      if (!ownToggle) return;
      toggleIcon.setAttribute('d', paused ? ICON_PLAY : ICON_PAUSE);
      toggle.style.color = opts.color;
      toggle.style.borderColor = opts.color;
      toggle.style.display = still() ? 'none' : 'grid';
    }

    function setupControls() {
      const c = opts.controls;
      if (!c) return;
      if (c === true) {
        const NS = 'http://www.w3.org/2000/svg';
        toggle = document.createElement('button');
        ownToggle = true;
        toggle.type = 'button';
        toggle.className = 'rjl-rain-toggle';
        toggle.setAttribute('aria-label', 'Pause animation');
        toggle.style.cssText = (host ? 'position:absolute;z-index:1;' : owned ? 'position:fixed;z-index:999;' : '') +
          'right:12px;bottom:12px;width:36px;height:36px;padding:0;place-items:center;cursor:pointer;' +
          'border:1px solid;border-radius:50%;background:rgba(0,0,0,0.6)';
        const svg = document.createElementNS(NS, 'svg');
        svg.setAttribute('viewBox', '0 0 16 16');
        svg.setAttribute('width', '14');
        svg.setAttribute('height', '14');
        svg.setAttribute('fill', 'currentColor');
        svg.setAttribute('aria-hidden', 'true');
        toggleIcon = document.createElementNS(NS, 'path');
        svg.appendChild(toggleIcon);
        toggle.appendChild(svg);
        if (host) host.appendChild(toggle);
        else if (owned) document.body.appendChild(toggle);
        else canvas.insertAdjacentElement('afterend', toggle);
      } else {
        toggle = typeof c === 'string' ? document.querySelector(c) : c;
        if (!toggle) throw new Error('RJLRain: no element matches ' + c);
      }
      toggle.addEventListener('click', onToggle);
      try { if (localStorage.getItem(PAUSED_KEY) === '1') paused = true; } catch (e) { /* storage blocked */ }
    }

    function teardownControls() {
      if (!toggle) return;
      toggle.removeEventListener('click', onToggle);
      if (ownToggle) toggle.remove();
      else toggle.removeAttribute('aria-pressed');
      toggle = toggleIcon = null;
      ownToggle = false;
    }

    // ---- events ----
    const onMove = (e) => {
      const r = rect();
      px = e.clientX - r.left;
      py = e.clientY - r.top;
    };
    const onOut = (e) => { if (!e.relatedTarget) { px = -1e4; py = -1e4; } };
    const onDown = (e) => {
      if (!opts.interactive || paused || still()) return;
      const t = e.target;
      if (opts.ignore && t && t.closest && t.closest(opts.ignore)) return;
      const r = rect();
      const x = e.clientX - r.left, y = e.clientY - r.top;
      if (x < 0 || y < 0 || x > r.width || y > r.height) return;
      const rp = ripples[rippleIdx];
      rippleIdx = (rippleIdx + 1) % ripples.length;
      rp.x = x; rp.y = y; rp.t = performance.now(); rp.on = true;
    };
    const onScroll = () => { box = null; };
    let resizeTimer = 0;
    const onResize = () => {
      if (Math.round(canvas.clientWidth) === w && Math.round(canvas.clientHeight) === h) return;
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(resize, 100);
    };

    window.addEventListener('pointermove', onMove, { passive: true });
    window.addEventListener('pointerdown', onDown, { passive: true });
    window.addEventListener('pointerout', onOut, { passive: true });
    window.addEventListener('scroll', onScroll, { passive: true, capture: true });
    const observer = typeof ResizeObserver === 'function' ? new ResizeObserver(onResize) : null;
    if (observer) observer.observe(canvas);
    else window.addEventListener('resize', onResize);
    const viewport = typeof IntersectionObserver === 'function' ? new IntersectionObserver((entries) => {
      onScreen = entries[entries.length - 1].isIntersecting;
      refresh();
    }) : null;
    if (viewport) viewport.observe(canvas);
    if (motionQuery && motionQuery.addEventListener) motionQuery.addEventListener('change', refresh);

    function mount() {
      if (destroyed) return;
      if (host) host.insertBefore(canvas, host.firstChild);
      else if (owned) document.body.insertBefore(canvas, document.body.firstChild);
      setupControls();
      resize();
      loadFont();
      refresh();
    }
    if (owned && !host && !document.body) document.addEventListener('DOMContentLoaded', mount, { once: true });
    else mount();

    return {
      version: VERSION,
      canvas,
      get running() { return raf !== 0; },
      get paused() { return paused; },
      get forming() { return forming; },
      // Spell a word now (defaults to the next `word`). False when it does not fit.
      form: (word) => form(word, false),
      pause,
      resume,
      set(next) {
        const before = opts;
        opts = normalize(opts, next);
        glyphs = Array.from(opts.chars);
        font = opts.fontSize + 'px ' + opts.fontFamily;
        if (opts.words.join('\n') !== before.words.join('\n')) wordIdx = 0;
        if (opts.speed !== before.speed || opts.speedVariance !== before.speedVariance) {
          for (let i = 0; i < columns; i++) spd[i] = roll();
        }
        if (opts.fontSize !== before.fontSize) resize();
        else if (opts.transparent !== before.transparent) clearAll();
        if (font !== before.fontSize + 'px ' + before.fontFamily) loadFont();
        if (opts.controls !== before.controls) { teardownControls(); setupControls(); }
        stillShown = false; // a still frame repaints with the new options
        refresh();
        return this;
      },
      resize,
      destroy() {
        if (destroyed) return;
        destroyed = true;
        stopLoop();
        clearTimeout(resizeTimer);
        window.removeEventListener('pointermove', onMove);
        window.removeEventListener('pointerdown', onDown);
        window.removeEventListener('pointerout', onOut);
        window.removeEventListener('scroll', onScroll, { capture: true });
        if (observer) observer.disconnect();
        else window.removeEventListener('resize', onResize);
        if (viewport) viewport.disconnect();
        if (motionQuery && motionQuery.removeEventListener) motionQuery.removeEventListener('change', refresh);
        teardownControls();
        if (owned) canvas.remove();
        else ctx.clearRect(0, 0, w, h);
        if (hostStyle) {
          host.style.position = hostStyle.position;
          host.style.isolation = hostStyle.isolation;
        }
      }
    };
  }

  // ---- no-JavaScript setups: data-rjl-rain and <rjl-rain> ----

  // <rjl-rain> attributes and how to read them: s = string, n = number, b = boolean,
  // w = comma-separated words, m = reduced-motion ('auto', 'true', 'false').
  const ATTRS = {
    chars: 's', color: 's', bright: 's', head: 's', background: 's', fade: 'n', 'font-size': 'n',
    'font-family': 's', fps: 'n', speed: 'n', 'speed-variance': 'n', word: 'w', 'word-chance': 'n',
    'word-frames': 'n', 'word-char': 's', 'word-scale': 'n', 'word-position': 's', interactive: 'b',
    'glow-radius': 'n', ignore: 's', 'reduced-motion': 'm', 'pause-offscreen': 'b', controls: 'b'
  };

  function attrOptions(el, withDefaults) {
    const o = {};
    Object.keys(ATTRS).forEach((name) => {
      const key = name.replace(/-([a-z])/g, (m, c) => c.toUpperCase());
      if (!el.hasAttribute(name)) {
        if (withDefaults) o[key] = DEFAULTS[key];
        return;
      }
      const v = el.getAttribute(name);
      const t = ATTRS[name];
      if (t === 'n') o[key] = Number(v);
      else if (t === 'b') o[key] = v !== 'false';
      else if (t === 'w') o[key] = v.split(',').map((s) => s.trim());
      else if (t === 'm') o[key] = v === 'auto' ? 'auto' : v !== 'false';
      else o[key] = key === 'chars' && GLYPHS[v] ? GLYPHS[v] : v;
    });
    return o;
  }

  // Start every [data-rjl-rain] element under `root` that is not running yet. The attribute
  // holds the options as JSON (or nothing). Returns the new controllers.
  function auto(root) {
    const scope = root || document;
    const made = [];
    if (!scope || typeof scope.querySelectorAll !== 'function') return made;
    scope.querySelectorAll('[data-rjl-rain]').forEach((el) => {
      if (el.rjlRain) return;
      let o = {};
      const raw = el.getAttribute('data-rjl-rain');
      if (raw) {
        try { o = JSON.parse(raw); } catch (e) {
          console.error('RJLRain: data-rjl-rain is not valid JSON: ' + raw);
          return;
        }
      }
      el.rjlRain = RJLRain(el, o);
      made.push(el.rjlRain);
    });
    return made;
  }

  function defineElement() {
    const g = typeof window !== 'undefined' ? window : null;
    if (!g || !g.customElements || !g.HTMLElement || g.customElements.get('rjl-rain')) return;
    class RJLRainElement extends g.HTMLElement {
      static get observedAttributes() { return Object.keys(ATTRS); }
      connectedCallback() {
        if (this.rain) return;
        const full = this.hasAttribute('fullscreen');
        if (full) this.style.display = 'none';
        else if (getComputedStyle(this).display === 'inline') this.style.display = 'block';
        const o = attrOptions(this, false);
        o.onWord = (word) => this.dispatchEvent(new CustomEvent('word', { detail: { word }, bubbles: true }));
        this.rain = RJLRain(full ? null : this, o);
      }
      disconnectedCallback() {
        if (this.rain) { this.rain.destroy(); this.rain = null; }
      }
      attributeChangedCallback() {
        if (this.rain) this.rain.set(attrOptions(this, true));
      }
    }
    g.customElements.define('rjl-rain', RJLRainElement);
  }

  RJLRain.version = VERSION;
  RJLRain.defaults = DEFAULTS;
  RJLRain.glyphs = GLYPHS;
  RJLRain.wordShape = wordShape;
  RJLRain.auto = auto;

  if (typeof document !== 'undefined') {
    defineElement();
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => auto(), { once: true });
    else auto();
  }
  return RJLRain;
})();

export default RJLRain;
