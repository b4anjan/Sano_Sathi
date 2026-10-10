import { describe, it, expect } from 'vitest';
import { dilate, scoreTrace, passed, GRID } from './trace';

const S = GRID;
function rect(x0: number, y0: number, x1: number, y1: number): Uint8Array {
  const m = new Uint8Array(S * S);
  for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) m[y * S + x] = 1;
  return m;
}
const or = (a: Uint8Array, b: Uint8Array) => a.map((v, i) => v | b[i]);

describe('trace scoring', () => {
  const glyph = rect(28, 8, 36, 56); // an "I"

  it('passes when the finger goes over the letter', () => {
    const s = scoreTrace(glyph, rect(26, 8, 38, 56));
    expect(s.coverage).toBe(1);
    expect(s.spill).toBe(0);
    expect(passed(s)).toBe(true);
  });

  it('allows wobbles: most of the letter is enough', () => {
    const s = scoreTrace(glyph, rect(27, 12, 37, 50));
    expect(s.coverage).toBeGreaterThan(0.7);
    expect(passed(s)).toBe(true);
  });

  it('fails when only part of the letter is traced', () => {
    expect(passed(scoreTrace(glyph, rect(26, 8, 38, 24)))).toBe(false);
  });

  it('fails when the whole board is scribbled', () => {
    const s = scoreTrace(glyph, rect(0, 0, S, S));
    expect(s.coverage).toBe(1);
    expect(s.spill).toBeGreaterThan(0.4);
    expect(passed(s)).toBe(false);
  });

  it('tolerates a little drawing outside the lines', () => {
    expect(passed(scoreTrace(glyph, or(rect(26, 8, 38, 56), rect(10, 10, 16, 20))))).toBe(true);
  });

  it('dilate grows a single cell into a square', () => {
    const m = new Uint8Array(S * S);
    m[10 * S + 10] = 1;
    expect(dilate(m, S, 2).reduce((a, b) => a + b, 0)).toBe(25);
  });
});
