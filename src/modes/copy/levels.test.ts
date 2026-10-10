import { describe, it, expect } from 'vitest';
import { levelConfig, extend, LEVELS, NOTES } from './levels';

describe('Copy Me levels', () => {
  it('goes from easy to hard over 15 levels', () => {
    const all = Array.from({ length: LEVELS }, (_, i) => levelConfig(i + 1));
    expect(all.map((c) => c.blocks)).toEqual([4, 4, 4, 4, 4, 6, 6, 6, 6, 6, 8, 8, 8, 8, 8]);
    expect(all[0].target).toBe(3);
    expect(all[14].target).toBe(10);
    for (let i = 1; i < all.length; i++) {
      expect(all[i].flashMs).toBeLessThan(all[i - 1].flashMs);
      expect(all[i].target).toBeGreaterThanOrEqual(all[i - 1].target);
    }
    expect(all[0].strict).toBe(false);
    expect(all[14].strict).toBe(true);
    expect(all[14].flashMs).toBeGreaterThan(250);
  });

  it('clamps levels outside 1–15', () => {
    expect(levelConfig(0).level).toBe(1);
    expect(levelConfig(99).level).toBe(15);
  });

  it('never repeats a block three times in a row', () => {
    let seq: number[] = [];
    let s = 3;
    const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
    for (let i = 0; i < 500; i++) seq = extend(seq, 4, rnd);
    for (let i = 2; i < seq.length; i++) expect(seq[i] === seq[i - 1] && seq[i] === seq[i - 2]).toBe(false);
    expect(Math.max(...seq)).toBe(3);
  });

  it('has a note for every block', () => {
    for (const n of [4, 6, 8] as const) expect(NOTES[n].length).toBe(n);
  });
});
