import { describe, it, expect } from 'vitest';
import { makeProblem, holds, isRight, type Op } from './gen';
import type { Level } from '../../core/settings';

const OPS: Op[] = ['add', 'sub', 'mul', 'missing', 'compare'];
const LEVELS: Level[] = [1, 2, 3];

function seeded(seed: number) {
  let s = seed;
  return () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646;
}

describe('Math Quest problems', () => {
  for (const op of OPS)
    for (const level of LEVELS)
      it(`${op} level ${level}: 400 problems are all correct and in range`, () => {
        const rnd = seeded(op.length * 31 + level);
        for (let i = 0; i < 400; i++) {
          const p = makeProblem(op, level, rnd);
          expect(holds(p), JSON.stringify(p)).toBe(true);
          expect(p.show.filter((t) => t === '?').length).toBe(1);
          const nums = p.show.flatMap((t) => t.split('+')).filter((t) => /^\d+$/.test(t)).map(Number);
          if (typeof p.answer === 'number') nums.push(p.answer);
          for (const n of nums) {
            expect(n).toBeGreaterThanOrEqual(0);
            expect(n).toBeLessThanOrEqual(100);
          }
          if (level === 1 && (op === 'add' || op === 'sub')) for (const n of nums) expect(n).toBeLessThanOrEqual(10);
          if (level === 2 && op === 'add') expect(p.answer as number).toBeGreaterThanOrEqual(11);
          expect(p.say.en.length).toBeGreaterThan(5);
          expect(p.say.ne).toMatch(/[ऀ-ॿ]/);
        }
      });

  it('checks answers', () => {
    const p = makeProblem('add', 1, seeded(3));
    expect(isRight(p, String(p.answer))).toBe(true);
    expect(isRight(p, '')).toBe(false);
    expect(isRight(p, String((p.answer as number) + 1))).toBe(false);
  });
});
