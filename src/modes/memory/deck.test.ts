import { describe, it, expect } from 'vitest';
import { buildDeck, columnsFor } from './deck';

const seeded = (seed: number) => () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;

describe('buildDeck', () => {
  for (const pairs of [2, 3, 4, 6]) {
    for (const kind of ['same', 'word', 'bridge'] as const) {
      it(`${pairs} pairs, ${kind}: every item appears exactly twice, one topic`, () => {
        const d = buildDeck(pairs, kind, seeded(pairs * 13 + kind.length));
        expect(d).toHaveLength(pairs * 2);
        const counts = new Map<string, number>();
        d.forEach((c) => counts.set(c.item.id, (counts.get(c.item.id) ?? 0) + 1));
        expect([...counts.values()].every((n) => n === 2)).toBe(true);
        expect(new Set(d.map((c) => c.item.cat)).size).toBe(1);
        if (kind === 'bridge') expect(d.filter((c) => c.face === 'ne')).toHaveLength(pairs);
      });
    }
  }
  it('columns', () => {
    expect([4, 6, 8, 12].map(columnsFor)).toEqual([2, 3, 4, 4]);
  });
});
