# Changelog

All notable changes to rjl-rain. Version format: Major.Medium.Minor.

## [1.0.0] - 10-20-2026 at 6:38pm

### Added
- First release: Matrix digital rain on a canvas in one file with zero dependencies, extracted from the background of RJL OS at rjl.sh. Pointer glow, click ripples, a hidden word spelled by the falling drops (any text, from a built-in 5x5 font), glyph presets, live option changes, high-DPI drawing, and a still frame for reduced motion that switches live with the setting.
- `RJLRain()` with no target makes a full-screen background canvas; pass a canvas or a selector to fill your own. Works as a classic script, through CommonJS and through bundlers.
- An animated SVG renderer for README banners (CSS animation only, no script, deterministic per seed), which draws the banner at the top of the README.
- Vitest unit tests and Playwright browser tests in Chromium, and CI that rebuilds the generated files and fails on any difference.
