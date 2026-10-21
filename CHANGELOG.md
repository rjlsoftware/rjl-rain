# Changelog

All notable changes to rjl-rain. Version format: Major.Medium.Minor.

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
