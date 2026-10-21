// Type definitions for rjl-rain - https://github.com/rjlsoftware/rjl-rain
// rjl-rain.d.mts - the ES module types, generated from rjl-rain.d.ts by scripts/build.js. Edit that file instead.

declare namespace RJLRain {
  /** The glyph sets in `RJLRain.glyphs`. */
  type GlyphPreset = 'classic' | 'rjl' | 'binary' | 'hex';

  interface Options {
    /** The glyphs that rain: any string, or a preset from `RJLRain.glyphs`. Default: half-width katakana + digits. */
    chars?: string;
    /** The rain. Default `'#00FF00'`. */
    color?: string;
    /** The pointer glow, the ripples and the word. Default `'#B6FFB6'`. */
    bright?: string;
    /** The leading glyph of every drop. `''` (the default) keeps it the rain color. */
    head?: string;
    /** The color the trails fade into, or `'transparent'` to rain over whatever is behind the canvas. Default `'#000000'`. */
    background?: string;
    /** How much each frame darkens the last, 0 to 1. Lower means longer trails. Default `0.05`. */
    fade?: number;
    /** Glyph size in px, which is also the column width. Default `16`. */
    fontSize?: number;
    /** Any CSS font family list. A web font is requested automatically. Default `'monospace'`. */
    fontFamily?: string;
    /** Frames per second, 1 to 60. Default `20`. */
    fps?: number;
    /** Rows a drop falls per frame, 0.1 to 3. Default `1`. */
    speed?: number;
    /** 0 to 1: how much slower than `speed` each column may fall. Default `0`. */
    speedVariance?: number;
    /** The word the drops spell now and then, or several spelled in turn. `''` turns it off. Default `'RJL'`. */
    word?: string | string[];
    /** Chance per frame that a new word starts. Default `0.005`. */
    wordChance?: number;
    /** How many frames a word lasts. Default `50`. */
    wordFrames?: number;
    /** The glyph the word is drawn with. Default `'1'`. */
    wordChar?: string;
    /** Cells per letter pixel. Default `1`. */
    wordScale?: number;
    /** Where words appear. Default `'random'`. */
    wordPosition?: 'random' | 'center';
    /** Called with the word each time one forms. */
    onWord?: ((word: string) => void) | null;
    /** Pointer glow and click ripples. Default `true`. */
    interactive?: boolean;
    /** Radius of the pointer glow in px. Default `70`. */
    glowRadius?: number;
    /** A CSS selector: clicks on matching elements make no ripple. Default: links, buttons and form fields. */
    ignore?: string;
    /** `'auto'` follows the visitor's setting, `true` always paints one still frame, `false` always animates. Default `'auto'`. */
    reducedMotion?: 'auto' | boolean;
    /** Stop drawing while the canvas is scrolled out of view. Default `true`. */
    pauseOffscreen?: boolean;
    /** `true` adds a pause button; a selector or element turns a button of your own into one. Default `false`. */
    controls?: boolean | string | Element;
  }

  interface Controller {
    readonly version: string;
    /** The canvas being drawn on. */
    readonly canvas: HTMLCanvasElement;
    /** Whether the animation loop is running (false while paused, off-screen or in reduced motion). */
    readonly running: boolean;
    /** Whether it was paused, by `pause()` or by the pause button. */
    readonly paused: boolean;
    /** Whether a word is showing. */
    readonly forming: boolean;
    /** Spells `word` (default: the next `word` option) now. Returns `false` if it does not fit. */
    form(word?: string): boolean;
    pause(): void;
    resume(): void;
    /** Changes any options live. */
    set(options: Options): Controller;
    /** Re-measures the canvas. Rarely needed: size changes are picked up automatically. */
    resize(): void;
    /** Stops everything, removes every listener, and removes the canvas if RJLRain created it. */
    destroy(): void;
  }

  /** The cells a word lights up, as `[row, column]` offsets from its top-left corner. */
  interface WordShape {
    width: number;
    height: number;
    cells: Array<[number, number]>;
  }

  type Defaults = Readonly<Required<Omit<Options, 'word' | 'controls' | 'onWord'>> & {
    word: string;
    controls: false;
    onWord: null;
  }>;

  const version: string;
  const defaults: Defaults;
  const glyphs: Readonly<Record<GlyphPreset, string>>;
  function wordShape(word: string, scale?: number): WordShape;
  /** Starts every `[data-rjl-rain]` element under `root` (default: the document) that is not running yet. */
  function auto(root?: ParentNode): Controller[];
}

/** Full-screen rain behind the page. */
declare function RJLRain(options?: RJLRain.Options): RJLRain.Controller;
/** Rain inside an element, on a canvas of your own (a `<canvas>` or a selector for one), or full-screen with `null`. */
declare function RJLRain(target: string | Element | null, options?: RJLRain.Options): RJLRain.Controller;

declare global {
  /** `<rjl-rain>`: its attributes are the options in kebab-case; it fires `word` when a word forms. */
  interface RJLRainElement extends HTMLElement {
    /** The running controller, or null while the element is not in the document. */
    rain: RJLRain.Controller | null;
    addEventListener(type: 'word', listener: (this: RJLRainElement, ev: CustomEvent<{ word: string }>) => unknown, options?: boolean | AddEventListenerOptions): void;
    addEventListener<K extends keyof HTMLElementEventMap>(type: K, listener: (this: RJLRainElement, ev: HTMLElementEventMap[K]) => unknown, options?: boolean | AddEventListenerOptions): void;
    addEventListener(type: string, listener: EventListenerOrEventListenerObject, options?: boolean | AddEventListenerOptions): void;
  }
  interface HTMLElementTagNameMap {
    'rjl-rain': RJLRainElement;
  }
  interface Element {
    /** Set on a `[data-rjl-rain]` element once it is running. */
    rjlRain?: RJLRain.Controller;
  }
}

export default RJLRain;
