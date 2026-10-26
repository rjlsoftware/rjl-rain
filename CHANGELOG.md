# Changelog

All notable changes to rjl-rain. Version format: Major.Medium.Minor.

## [1.1.3] - 10-26-2026 at 4:24pm

### Changed
- On npm: `npm install rjl-rain` now works, and the package is on jsDelivr and unpkg under `/npm/`. 1.1.2 was published by hand; 1.1.3 is the first version the release workflow publishes, through trusted publishing with provenance. No library changes beyond the version.

## [1.1.2] - 10-20-2026 at 9:01pm

### Changed
- README Frameworks section: an example for each popular front end of 2026, each in a collapsible section - React (and Next.js, React Router, TanStack Start), Vue (and Nuxt, now with `useTemplateRef`), Angular (`viewChild` + `afterNextRender`, SSR-safe), Svelte (an `{@attach}` attachment), Astro (with view transitions), SolidJS, Preact, Qwik (`useVisibleTask$`), Lit, Alpine.js, the server-driven stacks (htmx, Hotwire Turbo, Livewire, Phoenix LiveView) through `<rjl-rain>`, and site builders (WordPress, Webflow, Shopify, Squarespace) with a paste-in snippet.
- README artwork: the hero, touch and themes images have rounded corners and a green glow (baked into the PNGs, since GitHub strips CSS from READMEs) that reads on both GitHub themes. No library changes beyond the version.

## [1.1.1] - 10-20-2026 at 8:47pm

### Fixed
- Playground: the "your glyphs" field showed for every preset (a `display: grid` rule beat the `hidden` attribute), the code box cut off the long `<script>` line instead of wrapping it, and on a phone the pause button covered the corner of the panel. The playground test now checks the field's visibility. No library changes beyond the version.

## [1.1.0] - 10-20-2026 at 8:42pm

### Added
- Rain inside any element: `RJLRain('#hero')` on a `<div>` or `<section>` adds a canvas that fills it, behind its content (the element becomes `position: relative` and `isolation: isolate` if it was not, and both are restored on `destroy()`). A `<canvas>` is still drawn on directly.
- `background: 'transparent'` rains over whatever is behind the canvas. The fade erases instead of painting, and a sweep clears the faint tail an erasing fade always leaves (alpha 9/255 at fade 0.05), one band of the canvas per frame.
- `head` colors the leading glyph of every drop (the film look), and `speed` and `speedVariance` set how fast the columns fall and how much they differ.
- `word` takes an array, spelled in turn; `wordPosition: 'center'`; `onWord(word)` is called each time a word forms.
- `pauseOffscreen` (on by default): the loop stops while the canvas is scrolled out of view and starts again when it comes back.
- `controls`: `true` adds a round pause button (an `aria-pressed` toggle, hidden under reduced motion) for WCAG 2.2.2, or a selector/element turns a button of your own into one. The visitor's choice is remembered in `localStorage`. The controller gains a `paused` property.
- `<rjl-rain>`: a custom element that needs no JavaScript. Attributes are the options in kebab-case, changes apply live, `fullscreen` rains behind the page, and it fires a `word` event. `data-rjl-rain='{"word":"HI"}'` starts any element from JSON options, and `RJLRain.auto()` starts ones added later.
- ES module builds (`rjl-rain.mjs`, `rjl-rain.min.mjs`) and TypeScript types (`rjl-rain.d.ts`, `rjl-rain.d.mts`), wired through `package.json` `exports`, with type tests in `npm test`.
- Web fonts: a custom `fontFamily` is requested through `document.fonts`, and a reduced-motion still frame repaints when it arrives.
- A playground (`playground/`, published to GitHub Pages by the release workflow) with a control for every option, a transparent backdrop, and the code to paste for a script tag or `<rjl-rain>`.
- The README's CDN snippet carries a Subresource Integrity hash, which the build keeps in step with `rjl-rain.min.js` (along with the version and the gzipped size); the release notes carry it too. New README sections: inside an element, rain over anything, make it yours, no JavaScript, frameworks (React, Vue, Svelte, Astro) and accessibility.

### Changed
- Every new option defaults to the 1.0 behavior, so existing pages look the same. A drop that falls more than one row in a frame now fills the rows it passes instead of leaving a gap.
- The release workflow attaches the module builds and the types, publishes the playground, and never publishes a version older than the one npm already has.
- 5.6 KB gzipped, up from 3.2 KB.

## [1.0.2] - 10-20-2026 at 7:49pm

### Added
- README artwork: a hero image that is also the repository's social preview (`.github/social-preview.png`, 1280x640), a touch-the-rain illustration and a three-screen color-themes scene, all in `assets/`. The full-size originals are kept in `resources/`. None of them ship in the npm package.
- A License note: the MIT license only asks that copies keep the copyright and license notice, credit on the page is not required, and a link back to the repository is appreciated.
- A release workflow (`.github/workflows/release.yml`). Pushing a `vX.Y.Z` tag checks the tag against the version and the changelog, rebuilds and tests, creates the GitHub release from this changelog with `rjl-rain.js` and `rjl-rain.min.js` attached, and publishes to npm with provenance through trusted publishing, so no npm token is stored anywhere. A version already on npm is skipped, so a re-run is safe. The README's new Releasing section has the steps.

### Changed
- The README quick start loads the script from jsDelivr's GitHub path again, which serves it straight from the release tag, and the npm section also shows the install straight from GitHub. The self-hosted note points at the files attached to each release. No behavior changes.

## [1.0.1] - 10-20-2026 at 7:18pm

### Changed
- Packaged for the npm registry (`npm install rjl-rain`), but never published there: npm refused the publish under a temporary account hold. The README's quick start used the npm package and its CDN links (jsDelivr and unpkg), and gained an npm version badge. No code changes.

## [1.0.0] - 10-20-2026 at 6:38pm

### Added
- First release: Matrix digital rain on a canvas in one file with zero dependencies, extracted from the background of RJL OS at rjl.sh. Pointer glow, click ripples, a hidden word spelled by the falling drops (any text, from a built-in 5x5 font), glyph presets, live option changes, high-DPI drawing, and a still frame for reduced motion that switches live with the setting.
- `RJLRain()` with no target makes a full-screen background canvas; pass a canvas or a selector to fill your own. Works as a classic script, through CommonJS and through bundlers.
- An animated SVG renderer for README banners (CSS animation only, no script, deterministic per seed), which draws the banner at the top of the README.
- Vitest unit tests and Playwright browser tests in Chromium, and CI that rebuilds the generated files and fails on any difference.
