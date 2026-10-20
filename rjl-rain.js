/*! rjl-rain v1.0.0 | MIT License | (c) 2026 RJ Lindelof | https://github.com/rjlsoftware/rjl-rain */
// rjl-rain - Matrix digital rain on a <canvas>. One file, zero dependencies.
//
// Born as the background of RJL OS (https://rjl.sh): one requestAnimationFrame
// loop at a deliberate retro cadence, glyphs that brighten around the pointer,
// clicks that send ripples through the rain, and a hidden word that the falling
// drops spell out every so often. Honors prefers-reduced-motion with one still
// frame, and draws crisp on high-DPI screens.
//
// Usage:  RJLRain()                         full-screen background canvas
//         RJLRain('#hero', { chars: 'RJL' }) your own canvas
// Works as a classic <script> (window.RJLRain) or a CommonJS/bundler import.

(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.RJLRain = factory();
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const VERSION = '1.0.0';

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
    background: '#000000',
    fade: 0.05,              // how much each frame darkens the last (0-1): lower = longer trails
    fontSize: 16,            // px; also the column width
    fontFamily: 'monospace',
    fps: 20,                 // the retro cadence; the browser still paints at its own rate
    word: 'RJL',             // spelled by the drops now and then; '' turns it off
    wordChance: 0.005,       // chance per frame of a new formation
    wordFrames: 50,          // how many frames a formation lasts
    wordChar: '1',
    wordScale: 1,            // cells per font pixel
    interactive: true,       // pointer glow and click ripples
    glowRadius: 70,          // px
    ignore: 'a,button,input,select,textarea,label,summary,[role="button"],[contenteditable]',
    reducedMotion: 'auto'    // 'auto' follows the OS setting; true = one still frame; false = always animate
  });

  const RIPPLE_MS = 650;
  const RIPPLE_SPEED = 0.5;  // px per ms
  const RIPPLE_BAND = 22;    // px either side of the ring

  function normalize(base, extra) {
    const o = Object.assign({}, base, extra || {});
    o.fade = Math.min(1, Math.max(0, Number(o.fade) || 0));
    o.fontSize = Math.max(6, Number(o.fontSize) || DEFAULTS.fontSize);
    o.fps = Math.min(60, Math.max(1, Number(o.fps) || DEFAULTS.fps));
    o.glowRadius = Math.max(0, Number(o.glowRadius) || 0);
    o.wordChance = Math.min(1, Math.max(0, Number(o.wordChance) || 0));
    o.wordFrames = Math.max(1, Math.floor(Number(o.wordFrames) || DEFAULTS.wordFrames));
    o.chars = String(o.chars || '') || DEFAULTS.chars;
    return o;
  }

  function RJLRain(target, options) {
    if (typeof document === 'undefined') throw new Error('RJLRain needs a browser (document is undefined)');
    if (target && typeof target === 'object' && !target.getContext && options === undefined) {
      options = target;
      target = null;
    }

    let canvas = typeof target === 'string' ? document.querySelector(target) : target;
    if (typeof target === 'string' && !canvas) throw new Error('RJLRain: no element matches ' + target);
    if (canvas && !canvas.getContext) throw new TypeError('RJLRain: the target must be a <canvas>');

    // No target: a fixed, full-viewport canvas behind the page.
    const owned = !canvas;
    if (owned) {
      canvas = document.createElement('canvas');
      canvas.setAttribute('aria-hidden', 'true');
      canvas.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;z-index:-1;pointer-events:none;display:block';
    } else if (!canvas.style.width && canvas.clientWidth === canvas.width && canvas.clientHeight === canvas.height) {
      // No CSS size: pin the attribute size so high-DPI scaling cannot grow it.
      canvas.style.width = canvas.width + 'px';
      canvas.style.height = canvas.height + 'px';
    }
    const ctx = canvas.getContext('2d');

    let opts = normalize(DEFAULTS, options);
    let glyphs = Array.from(opts.chars);
    let font = opts.fontSize + 'px ' + opts.fontFamily;
    let w = 0, h = 0, columns = 0;
    let drops = [];
    let raf = 0, last = 0, paused = false, destroyed = false;

    // Pointer state, plus a fixed ripple pool so the draw loop never allocates.
    let px = -1e4, py = -1e4;
    const ripples = [0, 1, 2, 3].map(() => ({ x: 0, y: 0, t: 0, lo: 0, hi: 0, on: false }));
    let rippleIdx = 0;
    let box = null;
    const rect = () => box || (box = canvas.getBoundingClientRect());

    // The current word formation: row * 65536 + column for every lit cell.
    const formation = new Set();
    let forming = false, formFrames = 0;

    const motionQuery = typeof matchMedia === 'function' ? matchMedia('(prefers-reduced-motion: reduce)') : null;
    const still = () => (opts.reducedMotion === 'auto' ? !!(motionQuery && motionQuery.matches) : !!opts.reducedMotion);

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
      drops = new Array(columns).fill(1);
      formation.clear();
      forming = false;
      ctx.fillStyle = opts.background;
      ctx.fillRect(0, 0, w, h);
      if (still()) paintStill();
    }

    function draw(now) {
      const fs = opts.fontSize;
      ctx.globalAlpha = opts.fade;
      ctx.fillStyle = opts.background;
      ctx.fillRect(0, 0, w, h);
      ctx.globalAlpha = 1;
      ctx.font = font;
      let style = opts.color;
      ctx.fillStyle = style;

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
      for (let i = 0; i < columns; i++) {
        let ch = glyphs[(Math.random() * glyphs.length) | 0];
        const x = i * fs;
        const y = drops[i] * fs;
        let bright = false;
        let lit = false;
        if (forming && formation.has(drops[i] * 65536 + i)) {
          ch = opts.wordChar;
          bright = lit = true;
        }
        if (!bright) {
          const dx = x - px, dy = y - py;
          if (dx * dx + dy * dy < glow2) bright = true;
        }
        if (!bright && anyRipple) {
          for (let r = 0; r < ripples.length; r++) {
            const rp = ripples[r];
            if (!rp.on) continue;
            const dx = x - rp.x, dy = y - rp.y;
            const dd = dx * dx + dy * dy;
            if (dd > rp.lo && dd < rp.hi) { bright = true; break; }
          }
        }

        const want = bright ? opts.bright : opts.color;
        if (want !== style) { ctx.fillStyle = want; style = want; }
        ctx.fillText(ch, x, y);

        if (y > h && Math.random() > 0.975) drops[i] = 0;
        drops[i]++;
        if (bright && !lit && Math.random() < 0.25) drops[i]++; // quicken under the pointer
      }

      if (forming) {
        if (++formFrames > opts.wordFrames) { forming = false; formFrames = 0; }
      } else if (opts.word && Math.random() < opts.wordChance) {
        form(opts.word, true);
      }
    }

    // Reduced motion: run the renderer until the canvas is full of rain, then stop.
    function paintStill() {
      ctx.fillStyle = opts.background;
      ctx.fillRect(0, 0, w, h);
      const passes = Math.ceil(h / opts.fontSize) + 30;
      const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
      for (let i = 0; i < passes; i++) draw(now);
    }

    function frame(ts) {
      raf = requestAnimationFrame(frame);
      if (ts - last < 1000 / opts.fps) return;
      last = ts;
      draw(ts);
    }

    function startLoop() {
      if (!raf && !paused && !destroyed && !still()) raf = requestAnimationFrame(frame);
    }

    function stopLoop() {
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
    }

    function form(word, fromLoop) {
      const text = word === undefined ? opts.word : word;
      if (!text || destroyed) return false;
      const shape = wordShape(text, opts.wordScale);
      const rows = Math.floor(h / opts.fontSize);
      if (!shape.cells.length || shape.width > columns || shape.height > rows) return false; // needs room
      const startCol = Math.floor(Math.random() * (columns - shape.width + 1));
      const startRow = Math.min(Math.max(1, Math.floor(rows / 3)), rows - shape.height);
      formation.clear();
      for (const [r, c] of shape.cells) formation.add((startRow + r) * 65536 + startCol + c);
      forming = true;
      formFrames = 0;
      if (!fromLoop && still()) paintStill();
      return true;
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
    const onMotion = () => {
      if (still()) { stopLoop(); paintStill(); } else startLoop();
    };

    window.addEventListener('pointermove', onMove, { passive: true });
    window.addEventListener('pointerdown', onDown, { passive: true });
    window.addEventListener('pointerout', onOut, { passive: true });
    window.addEventListener('scroll', onScroll, { passive: true, capture: true });
    const observer = typeof ResizeObserver === 'function' ? new ResizeObserver(onResize) : null;
    if (observer) observer.observe(canvas);
    else window.addEventListener('resize', onResize);
    if (motionQuery && motionQuery.addEventListener) motionQuery.addEventListener('change', onMotion);

    function mount() {
      if (destroyed) return;
      resize();
      startLoop();
    }
    if (owned && !document.body) {
      document.addEventListener('DOMContentLoaded', () => {
        document.body.insertBefore(canvas, document.body.firstChild);
        mount();
      }, { once: true });
    } else {
      if (owned) document.body.insertBefore(canvas, document.body.firstChild);
      mount();
    }

    return {
      version: VERSION,
      canvas,
      get running() { return raf !== 0; },
      get forming() { return forming; },
      // Spell a word now (defaults to the `word` option). False when it does not fit.
      form: (word) => form(word, false),
      pause() { paused = true; stopLoop(); },
      resume() { paused = false; startLoop(); },
      set(next) {
        const before = opts;
        opts = normalize(opts, next);
        glyphs = Array.from(opts.chars);
        font = opts.fontSize + 'px ' + opts.fontFamily;
        if (opts.fontSize !== before.fontSize) resize();
        onMotion();
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
        if (motionQuery && motionQuery.removeEventListener) motionQuery.removeEventListener('change', onMotion);
        if (owned) canvas.remove();
        else ctx.clearRect(0, 0, w, h);
      }
    };
  }

  RJLRain.version = VERSION;
  RJLRain.defaults = DEFAULTS;
  RJLRain.glyphs = GLYPHS;
  RJLRain.wordShape = wordShape;
  return RJLRain;
}));
