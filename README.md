<a href="https://rjl.sh/"><img src="assets/rain.svg" alt="Green Matrix rain falling across a black banner while the drops spell out RJL" width="100%"></a>

<p align="center">
  <a href="https://www.npmjs.com/package/rjl-rain"><img src="https://img.shields.io/npm/v/rjl-rain?color=00a000" alt="npm version"></a>
  <a href="https://github.com/rjlsoftware/rjl-rain/blob/main/LICENSE"><img src="https://img.shields.io/badge/license-MIT-00a000" alt="License: MIT"></a>
  <img src="https://img.shields.io/badge/dependencies-0-00a000" alt="Zero dependencies">
  <img src="https://img.shields.io/badge/gzipped-3.2_KB-00a000" alt="3.2 KB gzipped">
  <a href="https://github.com/rjlsoftware/rjl-rain/actions/workflows/ci.yml"><img src="https://github.com/rjlsoftware/rjl-rain/actions/workflows/ci.yml/badge.svg" alt="CI"></a>
  <a href="https://rjl.sh/"><img src="https://img.shields.io/badge/see_it_live-rjl.sh-00a000" alt="See it live at rjl.sh"></a>
</p>

# rjl-rain

**Matrix digital rain in one file.** Drop it on a page and the page rains: a canvas, zero
dependencies, 3.2 KB gzipped.

<p align="center">
  <a href="https://rjl.sh/"><img src="assets/hero.png" alt="A browser window full of green Matrix rain that pours over its edge onto a mirror-black floor, while a pointer sends a ripple through the drops and bright ones spell RJL" width="100%"></a>
</p>

It started life as the background of [RJL OS](https://rjl.sh), a fake operating system on a
single web page, and it keeps everything that made it fun there:

- **Touch the rain.** Glyphs brighten around the pointer and fall faster under it. Click and a
  ripple rolls out through the drops.
- **A hidden word.** Every so often the falling drops spell a word (`RJL` by default) in bright
  ones, then wash it away. Call `rain.form('HELLO')` to spell one on demand.
- **Respectful.** With `prefers-reduced-motion` it paints one still frame and never animates, and
  it switches live if the setting changes. The canvas it creates is `aria-hidden` and ignores the
  pointer, so the page under it works as normal.
- **Cheap.** One `requestAnimationFrame` loop at a deliberate 20 fps retro cadence, no allocations
  per frame, nothing at all in a hidden tab. Crisp on high-DPI screens.

<p align="center">
  <img src="assets/touch.png" alt="A fingertip touching a curtain of falling green glyphs, the rain flaring bright and rippling outward around it" width="80%">
</p>

See it live at **[rjl.sh](https://rjl.sh)** - move the mouse, click, and wait for the word.

## Quick start

Full-screen rain behind your page, from a CDN:

```html
<script src="https://cdn.jsdelivr.net/gh/rjlsoftware/rjl-rain@v1.0.2/rjl-rain.min.js"></script>
<script>RJLRain();</script>
```

That is the whole install. `RJLRain()` with no target creates a fixed, full-viewport canvas behind
everything else on the page (it waits for `<body>` if you call it from `<head>`). jsDelivr serves the
file straight from the release tag. The npm package is on unpkg too:
`https://unpkg.com/rjl-rain@1.0.2/rjl-rain.min.js`.

**Self-hosted:** copy `rjl-rain.min.js` (or the readable `rjl-rain.js`) from this repository or from
the files attached to each [release](https://github.com/rjlsoftware/rjl-rain/releases), and point
the `<script>` at your copy.

**npm:**

```bash
npm install rjl-rain
# or straight from GitHub:
npm install github:rjlsoftware/rjl-rain#v1.0.2
```

```js
import RJLRain from 'rjl-rain';   // or: const RJLRain = require('rjl-rain');
RJLRain();
```

The file is UMD: a classic `<script>` gets `window.RJLRain`, and CommonJS or any bundler gets the
same function as the module export.

## Your own canvas

Give it a `<canvas>` (or a selector for one) sized with CSS, and it fills that instead:

```html
<canvas id="hero" style="width: 100%; height: 320px"></canvas>
<script>
  RJLRain('#hero', { chars: 'RJL', color: '#FFB000', bright: '#FFE2A8', word: 'HELLO' });
</script>
```

It follows the canvas's size as the layout changes, so a responsive canvas just works.

## Options

<p align="center">
  <img src="assets/themes.png" alt="A phone, a laptop and a monitor on a desk at night, raining green, amber and blue behind their web pages" width="100%">
</p>

Any palette, any glyphs, any word, and every option can change live with `rain.set()`. Every
option is optional.

| Option | Default | What it does |
|---|---|---|
| `chars` | half-width katakana + digits | The glyphs that rain. Any string, or a preset from `RJLRain.glyphs`: `classic`, `rjl`, `binary`, `hex`. |
| `color` | `'#00FF00'` | The rain. |
| `bright` | `'#B6FFB6'` | The pointer glow, the ripples and the word. |
| `background` | `'#000000'` | The canvas color the trails fade into. |
| `fade` | `0.05` | How much each frame darkens the last, from 0 to 1. Lower means longer trails. |
| `fontSize` | `16` | Glyph size in px, which is also the column width. |
| `fontFamily` | `'monospace'` | Any CSS font family list. |
| `fps` | `20` | Frames per second, 1 to 60. |
| `word` | `'RJL'` | The word the drops spell now and then. `''` turns it off. Letters, digits and `! ? . - : _ '`. |
| `wordChance` | `0.005` | Chance per frame that a new word starts. |
| `wordFrames` | `50` | How many frames a word lasts. |
| `wordChar` | `'1'` | The glyph the word is drawn with. |
| `wordScale` | `1` | Cells per letter pixel. `2` doubles the word's size. |
| `interactive` | `true` | Pointer glow and click ripples. |
| `glowRadius` | `70` | Radius of the pointer glow in px. |
| `ignore` | links, buttons, form fields | A CSS selector. Clicks on matching elements make no ripple. |
| `reducedMotion` | `'auto'` | `'auto'` follows the visitor's setting, `true` always paints one still frame, `false` always animates. |

## API

`RJLRain(target?, options?)` returns a controller:

| Member | What it does |
|---|---|
| `form(word?)` | Spells `word` (default: the `word` option) now. Returns `false` if it does not fit. |
| `pause()` / `resume()` | Stops and restarts the animation loop. |
| `set(options)` | Changes any options live, for example `rain.set({ color: '#9BD4FF' })`. |
| `resize()` | Re-measures the canvas. Rarely needed: size changes are picked up automatically. |
| `destroy()` | Stops everything, removes every listener, and removes the canvas if RJLRain created it. |
| `running` / `forming` | Whether the loop is running, and whether a word is showing. |
| `canvas` | The canvas being drawn on. |

Also on the function: `RJLRain.version`, `RJLRain.defaults`, `RJLRain.glyphs` and
`RJLRain.wordShape(word, scale)`, which returns the cells a word lights up.

## Notes

- **Backgrounds.** The full-screen canvas sits at `z-index: -1`. If both `<html>` and `<body>` set a
  background color, the `<body>` one paints over the rain, so set the color on `<html>` (or make the
  body transparent).
- **Katakana.** The classic glyphs need a font with half-width katakana. Every desktop and mobile OS
  ships one, but `chars: RJLRain.glyphs.binary` (or any ASCII string) needs no special font at all.
- **Browsers.** Any current browser. It uses `ResizeObserver` when present and falls back to the
  window `resize` event.

## A banner for your README

GitHub will not run a canvas in a README, but it will animate an SVG. The banner at the top of this
page is rendered by `scripts/render-svg.js`: CSS animation only, no script, and it shows a still
frame to anyone who asked for reduced motion. Make your own:

```bash
npm run svg -- --word HELLO --chars 01 --width 1600 --height 240 --out hello.svg
```

Options: `--width`, `--height`, `--font`, `--chars`, `--word`, `--scale`, `--seed`, `--color`,
`--bright`, `--background`, `--title`, `--out`. The same seed always produces the same file.

## Development

```bash
npm install
npm test          # Vitest unit tests, then Playwright in Chromium against the demo
npm run build     # regenerates rjl-rain.min.js and assets/rain.svg
npm run serve     # the demo, at the URL it prints
```

`rjl-rain.js` is the source. The minified file and the banner are generated and committed (the CDN
serves the minified file straight from a tag), and CI fails if they are out of date.

### Releasing

Bump the version (`npm version X.Y.Z --no-git-tag-version`, then the banner and `VERSION` in
`rjl-rain.js`), add a `CHANGELOG.md` entry, run `npm run build` and `npm test`, commit, then push a
`vX.Y.Z` tag. The tag runs `.github/workflows/release.yml`, which checks the tag against the version
and the changelog, rebuilds and tests, creates the GitHub release from the changelog entry with both
script files attached, and publishes to npm with provenance through trusted publishing - no npm
token is stored anywhere.

## License

[MIT](LICENSE) (c) 2026 RJ Lindelof. Born in [RJL OS](https://rjl.sh). More at [rjl.dev](https://rjl.dev).

The MIT license only asks that copies of the code keep its copyright and license notice: the
[LICENSE](LICENSE) file, and the comment at the top of the script, which the minified build keeps.
Credit on your page is not required, but when someone asks "how did you do that?", a link to
[rjl-rain on GitHub](https://github.com/rjlsoftware/rjl-rain) is always appreciated.
