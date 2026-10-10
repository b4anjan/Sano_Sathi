import { screen, panelOpen, type Screen } from './nav';
import { tapMusic, calmActive } from './settings';
import { activityById } from '../content/activities';
import { PENTA } from './audio';
import { playInstrument, type Instrument } from './instruments';

/**
 * Tap-anywhere music. A tap on empty felt plays one soft note; every screen has its own
 * instrument, and the higher the tap, the higher the note (so children can play little
 * tunes up and down the board). Taps on game pieces never play it: those keep their own
 * sounds. Learning games play it more softly, so it never competes with the lesson.
 */
export const SCREEN_INSTRUMENT: Record<Screen, Instrument | null> = {
  home: 'bells',
  match: 'marimba',
  memory: 'kalimba',
  letters: 'harp',
  numbers: 'musicbox',
  count: 'steeldrum',
  shapes: 'ukulele',
  smash: 'piano',
  bubbles: 'vibraphone',
  xylo: 'flute',
  paint: 'panflute',
  village: 'guitar',
  copy: 'celesta',
  math: 'sitar',
  shop: 'harmonium',
  stickers: 'xylophone',
  studio: null, // the grown-ups' recording screen stays silent
};

/**
 * Anything a child can play with, plus overlays. A tap that starts on one of these belongs
 * to the game. Shared with the living background, so the sparks and the note agree.
 */
export const GAME_PIECES = [
  'button', 'a', 'input', 'select', 'textarea', 'label', 'canvas', 'output',
  '[role="button"]', '[role="dialog"]', '[contenteditable]',
  '.card', '.bar', '.bars', '.thali', '.kb', '.item', '.playfield', '.panel', '.panel-card',
  '.vg-obj', '.vg-kite', '.vg-fish', '.vg-cloud', '.vg-star', '.vg-sky-body', '.sticker-toast',
].join(', ');

export function isBare(el: EventTarget | null): boolean {
  const e = el as Element | null;
  if (!e || typeof e.closest !== 'function') return true;
  return !e.closest(GAME_PIECES);
}

/** Inside something that scrolls right now (the home page, the sticker book)? */
function inScroller(el: Element | null): boolean {
  for (let n = el; n && n !== document.body; n = n.parentElement) {
    const oy = getComputedStyle(n).overflowY;
    if ((oy === 'auto' || oy === 'scroll') && n.scrollHeight > n.clientHeight + 2) return true;
  }
  return false;
}

/** Top of the board = highest note. */
export function noteFor(y: number, height: number): number {
  const k = Math.max(0, Math.min(PENTA.length - 1, Math.floor((1 - y / Math.max(1, height)) * PENTA.length)));
  return PENTA[k];
}

function play(y: number) {
  if (!tapMusic.value || panelOpen.value) return;
  const s = screen.value;
  const inst = SCREEN_INSTRUMENT[s];
  if (!inst) return;
  const soft = s !== 'home' && (activityById(s)?.focus || s === 'stickers');
  const gain = (soft ? 0.11 : 0.19) * (calmActive.value ? 0.8 : 1);
  playInstrument(inst, noteFor(y, window.innerHeight), gain);
}

let started = false;
export function startTapMusic(): void {
  if (started) return;
  started = true;
  // On a page that scrolls, wait for the finger to lift and only play if it stayed put,
  // so scrolling the home page with a finger doesn't sound a note every time.
  const pending = new Map<number, { x: number; y: number }>();
  window.addEventListener(
    'pointerdown',
    (e) => {
      if (e.button > 0 || !isBare(e.target)) return;
      if (inScroller(e.target as Element)) pending.set(e.pointerId, { x: e.clientX, y: e.clientY });
      else play(e.clientY);
    },
    { passive: true },
  );
  window.addEventListener(
    'pointerup',
    (e) => {
      const p = pending.get(e.pointerId);
      if (!p) return;
      pending.delete(e.pointerId);
      if (Math.hypot(e.clientX - p.x, e.clientY - p.y) < 12) play(e.clientY);
    },
    { passive: true },
  );
  window.addEventListener('pointercancel', (e) => pending.delete(e.pointerId), { passive: true });
}
