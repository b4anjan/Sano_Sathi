import { describe, expect, it } from 'vitest';
import { LESSONS, lessonMoves, par, sq, sqToName, stageStars } from './lessons';

const names = (xs: number[]) => xs.map(sqToName).sort();

describe('chess lessons', () => {
  it('every stage can be finished, in a sensible number of moves', () => {
    for (const l of LESSONS) {
      expect(l.stages.length).toBe(3);
      for (const s of l.stages) {
        const p = par(l, s);
        expect(p, `${l.piece} from ${s.start}`).toBeGreaterThan(0);
        expect(p).toBeLessThanOrEqual(6);
        // Stars never sit on rocks, foes or the starting square.
        const used = [s.start, ...(s.rocks ?? []), ...(s.foes ?? [])];
        for (const st of s.stars) expect(used).not.toContain(st);
      }
    }
  });

  it('moves pieces like real chess', () => {
    const none = new Set<number>();
    expect(lessonMoves('n', sq('b1'), none, none).map(sqToName).sort()).toEqual(['a3', 'c3', 'd2']);
    expect(lessonMoves('k', sq('a1'), none, none).length).toBe(3);
    expect(lessonMoves('r', sq('d4'), none, none).length).toBe(14);
    expect(lessonMoves('b', sq('d4'), none, none).length).toBe(13);
    expect(lessonMoves('q', sq('d4'), none, none).length).toBe(27);
    // Rocks block sliding pieces.
    expect(names(lessonMoves('r', sq('a1'), new Set([sq('a3'), sq('c1')]), none))).toEqual(['a2', 'b1']);
    // Pawns: two steps from the start row, one after; capture only on the slant.
    expect(names(lessonMoves('p', sq('e2'), none, none))).toEqual(['e3', 'e4']);
    expect(names(lessonMoves('p', sq('e3'), none, none))).toEqual(['e4']);
    expect(names(lessonMoves('p', sq('e3'), none, new Set([sq('d4'), sq('e4')])))).toEqual(['d4']);
  });

  it('gives 3, 2 or 1 stars', () => {
    expect(stageStars(2, 2)).toBe(3);
    expect(stageStars(4, 2)).toBe(2);
    expect(stageStars(9, 2)).toBe(1);
  });
});
