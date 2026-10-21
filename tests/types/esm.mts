// The ES module types (rjl-rain.d.mts), resolved through package.json "exports".
import RJLRain from 'rjl-rain';

const rain: RJLRain.Controller = RJLRain('#hero', {
  word: ['HELLO', 'WORLD'],
  wordPosition: 'center',
  background: 'transparent',
  head: '#FFFFFF',
  speedVariance: 0.5,
  controls: true,
  onWord: (word) => console.log(word.toUpperCase())
});
rain.set({ color: '#9BD4FF' }).pause();
const spelled: boolean = rain.form('HI');
const paused: boolean = rain.paused;

const full = RJLRain({ fps: 30, controls: '#rain-toggle' });
full.destroy();
RJLRain(null, { reducedMotion: true });

const shape: RJLRain.WordShape = RJLRain.wordShape('RJL', 2);
const firstRow: number = shape.cells[0][0];
const version: string = RJLRain.version;
const binary: string = RJLRain.glyphs.binary;
const fade: number = RJLRain.defaults.fade;
const started: RJLRain.Controller[] = RJLRain.auto(document);

const element = document.createElement('rjl-rain');
element.rain?.form('YES');
element.addEventListener('word', (e) => console.log(e.detail.word));
const fromData: RJLRain.Controller | undefined = document.body.rjlRain;

// @ts-expect-error - wordPosition is 'random' or 'center'
RJLRain({ wordPosition: 'left' });
// @ts-expect-error - speed is a number
RJLRain({ speed: 'fast' });

export { spelled, paused, firstRow, version, binary, fade, started, fromData };
