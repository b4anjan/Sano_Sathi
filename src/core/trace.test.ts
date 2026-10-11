import { describe, it, expect } from 'vitest';
import { GRID, glyphModel, passed, progress, scoreStrokes, thin, type Pt } from './trace';
import fx from './trace.fixtures.json';

const S = GRID;
function rect(m: Uint8Array, x0: number, y0: number, x1: number, y1: number): Uint8Array {
  for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) m[y * S + x] = 1;
  return m;
}
const real = (g: string) => glyphModel(Uint8Array.from(fx.masks[g as keyof typeof fx.masks], (c) => (c === '1' ? 1 : 0)), fx.grid);
/** A straight finger line from a to b. */
const line = (a: Pt, b: Pt): Pt[] => [a, b];
/** The same line with a hand-like wobble across it. */
function wobbly(a: Pt, b: Pt, amp: number): Pt[] {
  const n = 24, len = Math.hypot(b[0] - a[0], b[1] - a[1]);
  const nx = -(b[1] - a[1]) / len, ny = (b[0] - a[0]) / len;
  return Array.from({ length: n + 1 }, (_, i) => {
    const t = i / n, w = amp * Math.sin(t * Math.PI * 3);
    return [a[0] + (b[0] - a[0]) * t + nx * w, a[1] + (b[1] - a[1]) * t + ny * w] as Pt;
  });
}

describe('tracing: an H (two posts and a bar)', () => {
  const H = glyphModel(rect(rect(rect(new Uint8Array(S * S), 16, 10, 24, 54), 40, 10, 48, 54), 24, 28, 40, 36));

  it('thins the letter to one-cell centre lines', () => {
    const sk = thin(rect(new Uint8Array(S * S), 16, 10, 24, 54), S);
    for (let y = 14; y < 50; y++) expect(sk.slice(y * S, y * S + S).reduce((a, b) => a + b, 0)).toBe(1);
  });

  it('passes when every stroke is traced', () => {
    const s = scoreStrokes(H, [line([20, 11], [20, 53]), line([44, 11], [44, 53]), line([20, 32], [44, 32])]);
    expect(passed(s)).toBe(true);
    expect(progress(s)).toBe(1);
    expect(s.todo.length).toBeLessThan(H.skel.length * 0.25);
  });

  it('allows a wobbly hand', () => {
    const s = scoreStrokes(H, [wobbly([20, 12], [20, 52], 3), wobbly([44, 12], [44, 52], 3), wobbly([20, 32], [44, 32], 2)]);
    expect(passed(s)).toBe(true);
  });

  it('does not finish while the bar is left out, even though the posts are right next to it', () => {
    const s = scoreStrokes(H, [line([20, 11], [20, 53]), line([44, 11], [44, 53])]);
    expect(passed(s)).toBe(false);
    expect(progress(s)).toBeLessThan(1);
    // the hint dots sit on the bar
    expect(s.todo.some(([x, y]) => x > 27 && x < 37 && Math.abs(y - 32) < 2)).toBe(true);
  });

  it('does not finish when a post is only half traced', () => {
    expect(passed(scoreStrokes(H, [line([20, 11], [20, 32]), line([44, 11], [44, 53]), line([20, 32], [44, 32])]))).toBe(false);
  });

  it('a long line drawn the wrong way does not count for a stroke', () => {
    // zig-zag across the posts instead of along them
    const zig: Pt[] = [];
    for (let y = 11; y <= 53; y += 4) zig.push([14, y], [50, y + 2]);
    expect(passed(scoreStrokes(H, [zig]))).toBe(false);
  });

  it('fails when the whole board is scribbled', () => {
    const scribble: Pt[] = [];
    for (let y = 0; y <= S; y += 3) scribble.push([0, y], [S, y + 1.5]);
    const s = scoreStrokes(H, [scribble]);
    expect(s.spill).toBeGreaterThan(0.35);
    expect(passed(s)).toBe(false);
  });

  it('tolerates a little drawing outside the lines', () => {
    const s = scoreStrokes(H, [line([20, 11], [20, 53]), line([44, 11], [44, 53]), line([20, 32], [44, 32]), line([4, 4], [10, 6])]);
    expect(passed(s)).toBe(true);
  });

  it('needs every separate part (the dot of an i)', () => {
    const i = glyphModel(rect(rect(new Uint8Array(S * S), 28, 24, 36, 54), 28, 10, 36, 18));
    expect(i.parts).toBe(2);
    expect(passed(scoreStrokes(i, [line([32, 25], [32, 53])]))).toBe(false);
    expect(passed(scoreStrokes(i, [line([32, 25], [32, 53]), [[32, 14]]]))).toBe(true);
  });
});

describe('tracing real letters (Baloo 2)', () => {
  it('ख does not finish with its loop left out (the trace a parent reported)', () => {
    const kha = real('ख');
    const child = fx.khaWithoutLoop.map((s) => s.map(([x, y]) => [x * fx.grid, y * fx.grid] as Pt));
    const s = scoreStrokes(kha, child);
    expect(passed(s)).toBe(false);
    expect(s.gap).toBeGreaterThan(8);
  });

  it('ख passes once the loop is traced too', () => {
    const kha = real('ख');
    const child = fx.khaWithoutLoop.map((s) => s.map(([x, y]) => [x * fx.grid, y * fx.grid] as Pt));
    // follow the untraced skeleton the way a finger would: the hint dots, in order of a walk
    const todo = scoreStrokes(kha, child).todo;
    const walk: Pt[] = [todo[0]];
    const left = todo.slice(1);
    while (left.length) {
      const [lx, ly] = walk[walk.length - 1];
      let best = 0;
      left.forEach(([x, y], k) => { if ((x - lx) ** 2 + (y - ly) ** 2 < (left[best][0] - lx) ** 2 + (left[best][1] - ly) ** 2) best = k; });
      walk.push(left.splice(best, 1)[0]);
    }
    const strokes = [...child, ...splitJumps(walk)];
    expect(passed(scoreStrokes(kha, strokes))).toBe(true);
  });

  it('A does not finish without its bar', () => {
    const A = real('A');
    // the two legs, apex to feet, as straight finger lines
    const legs = [line([32, 22], [20, 50]), line([32, 22], [44, 50])];
    const s = scoreStrokes(A, legs);
    expect(passed(s)).toBe(false);
  });

  it('builds a model for every kind of letter', () => {
    for (const g of ['ख', 'A', 'क', 'ई']) {
      const m = real(g);
      expect(m.skel.length).toBeGreaterThan(30);
      expect(m.strokes.length).toBeGreaterThan(0);
      expect(m.halfWidth).toBeGreaterThan(1);
    }
  });
});

/** Split a walk where it jumps (the finger was lifted). */
function splitJumps(w: Pt[]): Pt[][] {
  const out: Pt[][] = [[w[0]]];
  for (let k = 1; k < w.length; k++) {
    if ((w[k][0] - w[k - 1][0]) ** 2 + (w[k][1] - w[k - 1][1]) ** 2 > 4) out.push([]);
    out[out.length - 1].push(w[k]);
  }
  return out;
}
