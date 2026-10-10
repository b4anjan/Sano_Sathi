import { signal, effect } from '@preact/signals';
import { ITEMS } from '../content/items';

/**
 * Stars and stickers, shared by every game.
 *
 * Games call award() when a child succeeds (a right answer, a finished round). Every
 * STARS_PER_STICKER stars unlock a felt sticker of a word from the app, which then lives in
 * the Sticker book. There is no way to lose stars: rewards only ever add up.
 * Kept in this browser (localStorage), like settings.
 */
export const STARS_PER_STICKER = 5;
const KEY = 'sanosathi.rewards.v1';

interface Saved {
  stars: number;
  stickers: string[];
}

function load(): Saved {
  try {
    const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(KEY) : null;
    const p = raw ? JSON.parse(raw) : null;
    if (p && typeof p.stars === 'number' && Array.isArray(p.stickers)) return { stars: p.stars, stickers: p.stickers.filter((s: unknown) => typeof s === 'string') };
  } catch {
    /* blocked storage: start fresh */
  }
  return { stars: 0, stickers: [] };
}

const saved = load();
export const totalStars = signal(saved.stars);
export const stickers = signal<string[]>(saved.stickers);
/** The sticker just unlocked, for the celebration card. Cleared when the card closes. */
export const newSticker = signal<string | null>(null);

/** Stars still needed for the next sticker (1..STARS_PER_STICKER). */
export const starsToNext = (stars = totalStars.value): number => STARS_PER_STICKER - (stars % STARS_PER_STICKER);

/** Pick a sticker the child does not have yet; null when the book is full. */
export function pickSticker(owned: readonly string[], rnd = Math.random): string | null {
  const have = new Set(owned);
  const left = ITEMS.filter((i) => !have.has(i.id));
  return left.length ? left[Math.floor(rnd() * left.length)].id : null;
}

export function award(n = 1): void {
  if (n <= 0) return;
  const before = Math.floor(totalStars.value / STARS_PER_STICKER);
  totalStars.value += n;
  const after = Math.floor(totalStars.value / STARS_PER_STICKER);
  for (let i = before; i < after; i++) {
    const id = pickSticker(stickers.value);
    if (!id) break;
    stickers.value = [...stickers.value, id];
    newSticker.value = id;
  }
}

export function resetRewards(): void {
  totalStars.value = 0;
  stickers.value = [];
  newSticker.value = null;
}

effect(() => {
  const data: Saved = { stars: totalStars.value, stickers: stickers.value };
  try {
    if (typeof localStorage !== 'undefined') localStorage.setItem(KEY, JSON.stringify(data));
  } catch {
    /* storage unavailable */
  }
});
