import { describe, it, expect, beforeEach } from 'vitest';
import { award, totalStars, stickers, newSticker, resetRewards, pickSticker, starsToNext, STARS_PER_STICKER } from './rewards';
import { ITEMS } from '../content/items';

describe('stars and stickers', () => {
  beforeEach(() => resetRewards());

  it('unlocks a sticker every five stars', () => {
    award(4);
    expect(stickers.value.length).toBe(0);
    expect(starsToNext()).toBe(1);
    award(1);
    expect(stickers.value.length).toBe(1);
    expect(newSticker.value).toBe(stickers.value[0]);
    award(STARS_PER_STICKER * 2);
    expect(stickers.value.length).toBe(3);
    expect(totalStars.value).toBe(15);
  });

  it('never repeats a sticker and stops when the book is full', () => {
    award(STARS_PER_STICKER * (ITEMS.length + 3));
    expect(stickers.value.length).toBe(ITEMS.length);
    expect(new Set(stickers.value).size).toBe(ITEMS.length);
    expect(pickSticker(stickers.value)).toBeNull();
  });

  it('ignores zero and negative awards', () => {
    award(0);
    award(-3);
    expect(totalStars.value).toBe(0);
  });
});
