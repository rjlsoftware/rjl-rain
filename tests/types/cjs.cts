// The CommonJS types (rjl-rain.d.ts), resolved through package.json "exports".
import RJLRain = require('rjl-rain');

const rain = RJLRain(document.body, { chars: RJLRain.glyphs.hex, interactive: false });
const running: boolean = rain.running;
const canvas: HTMLCanvasElement = rain.canvas;

// @ts-expect-error - the controller's state is read-only
rain.running = true;

export = { running, canvas };
