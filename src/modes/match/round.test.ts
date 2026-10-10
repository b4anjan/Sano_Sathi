import { describe, it, expect } from 'vitest';
import { buildRound } from './round';
import { ITEMS } from '../../content/items';
import { neDigits, NE_NUM, NE_COUNTED } from '../../content/numbers';
import { ART } from '../../content/art';

// Deterministic random for repeatable tests.
const seeded = (seed: number) => () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;

describe('buildRound', () => {
  it('always includes the target exactly once, with distinct cards', () => {
    const rand = seeded(42);
    for (let k = 0; k < 200; k++) {
      const n = 2 + (k % 3);
      const r = buildRound(ITEMS, n, ['ne'], undefined, rand);
      expect(r.cards).toHaveLength(n);
      expect(r.cards.filter((c) => c.id === r.target.id)).toHaveLength(1);
      expect(new Set(r.cards.map((c) => c.id)).size).toBe(n);
    }
  });
  it('never repeats the previous target', () => {
    const rand = seeded(7);
    let last: string | undefined;
    for (let k = 0; k < 100; k++) {
      const r = buildRound(ITEMS.slice(0, 6), 3, ['en'], last, rand);
      expect(r.target.id).not.toBe(last);
      last = r.target.id;
    }
  });
});

describe('content', () => {
  it('every item has a picture, English, Nepali and roman text', () => {
    for (const i of ITEMS) {
      expect(ART[i.id], i.id).toBeTypeOf('function');
      expect(i.en && i.ne && i.roman).toBeTruthy();
      expect(/[ऀ-ॿ]/.test(i.ne), `${i.id} Nepali in Devanagari`).toBe(true);
    }
  });
  it('Nepali numbers', () => {
    expect(neDigits(10)).toBe('१०');
    expect(NE_NUM[5]).toBe('पाँच');
    expect(NE_COUNTED[1]).toBe('एउटा');
  });
});
