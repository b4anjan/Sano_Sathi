/**
 * Scoring for tracing letters and numbers, with no stroke-order data.
 *
 * The letter is drawn into a small grid (the "glyph mask") and thinned to its centre lines
 * (the "skeleton": one cell wide, following every stroke). The child's finger paths are then
 * checked against that skeleton:
 *   coverage: how much of the skeleton the finger passed close to,
 *   gap:      the longest piece of skeleton nobody went near (a whole stroke left out shows
 *             up here even when the rest is covered well; ख's loop was the case that
 *             slipped through when scoring by painted area),
 *   parts:    every separate piece of the letter (the dot of i, the two parts of ई) must be
 *             traced too,
 *   spill:    how much of the finger path is far from the letter (scribbling everywhere
 *             should not count as tracing).
 * Distances allow for wobbly fingers: anywhere on the stroke, plus a little beyond its edge.
 * This works the same for A, क and ७, in any font.
 */
export const GRID = 64;

/** A point in grid cells (0..GRID). */
export type Pt = [number, number];

export const PASS = {
  /** Share of the skeleton that must be traced. */
  coverage: 0.85,
  /** Longest untraced run of skeleton, as a share of the grid side (5 cells at 64). */
  gap: 0.08,
  /** Every separate part of the letter must be at least this well covered. */
  part: 0.5,
  /** And so must every stroke (each piece of skeleton between joins). */
  stroke: 0.5,
  /** At most this share of the finger path may be far from the letter. */
  spill: 0.35,
};
/** How far past the stroke's edge a finger may wander and still count, in cells. */
export const WOBBLE = 2.5;
/** A finger moving along a stroke may be off its direction by up to about 50 degrees. */
export const ALONG = Math.cos((50 * Math.PI) / 180);
/**
 * A finger point counts for the part of the stroke beside it, not for the stroke ahead of it,
 * so stopping halfway along a line leaves the rest of the line to do (cells along the stroke).
 */
const AHEAD = 1.5;
/** Cells around a skeleton cell used to find the stroke's direction. */
const DIR_RADIUS = 2.5;
/** Finger points further than this from the letter count as spill (share of the side). */
export const SPILL_AWAY = 0.08;

export interface GlyphModel {
  size: number;
  /** Cell indices of the skeleton. */
  skel: number[];
  /** Which separate part of the letter each skeleton cell belongs to. */
  skelPart: number[];
  /** Direction of the stroke at each skeleton cell (unit vector), or null at joins and dots. */
  skelDir: Array<[number, number] | null>;
  /** The strokes: skeleton cells (by position in skel) between joins that have a direction. */
  strokes: number[][];
  parts: number;
  /** Typical half stroke width, in cells. */
  halfWidth: number;
  /** Distance from every cell to the nearest letter cell, in cells. */
  away: Float32Array;
}

export interface TraceScore {
  coverage: number;
  /** Longest untraced skeleton run, in cells. */
  gap: number;
  /** Coverage of the least-covered part. */
  partMin: number;
  /** Coverage of the least-covered stroke. */
  strokeMin: number;
  /** Centres of skeleton cells not traced yet (grid units), to hint where to go next. */
  todo: Pt[];
  spill: number;
}

/** Zhang–Suen thinning: peel the letter down to one-cell-wide centre lines. */
export function thin(mask: Uint8Array, size: number): Uint8Array {
  const m = mask.slice();
  for (let i = 0; i < size; i++) m[i] = m[(size - 1) * size + i] = m[i * size] = m[i * size + size - 1] = 0;
  const del: number[] = [];
  let changed = true;
  while (changed) {
    changed = false;
    for (let step = 0; step < 2; step++) {
      del.length = 0;
      for (let y = 1; y < size - 1; y++)
        for (let x = 1; x < size - 1; x++) {
          const i = y * size + x;
          if (!m[i]) continue;
          const p2 = m[i - size], p3 = m[i - size + 1], p4 = m[i + 1], p5 = m[i + size + 1];
          const p6 = m[i + size], p7 = m[i + size - 1], p8 = m[i - 1], p9 = m[i - size - 1];
          const b = p2 + p3 + p4 + p5 + p6 + p7 + p8 + p9;
          if (b < 2 || b > 6) continue;
          const ring = [p2, p3, p4, p5, p6, p7, p8, p9, p2];
          let a = 0;
          for (let k = 0; k < 8; k++) if (!ring[k] && ring[k + 1]) a++;
          if (a !== 1) continue;
          if (step === 0 ? p2 * p4 * p6 || p4 * p6 * p8 : p2 * p4 * p8 || p2 * p6 * p8) continue;
          del.push(i);
        }
      for (const i of del) m[i] = 0;
      if (del.length) changed = true;
    }
  }
  return m;
}

/** Chamfer distance (3-4 weights) from every cell to the nearest seed cell, in cells. */
export function distanceTo(seed: Uint8Array, size: number): Float32Array {
  const INF = 1e9;
  const d = new Float32Array(seed.length);
  for (let i = 0; i < d.length; i++) d[i] = seed[i] ? 0 : INF;
  const at = (x: number, y: number) => (x < 0 || y < 0 || x >= size || y >= size ? INF : d[y * size + x]);
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++) {
      const i = y * size + x;
      d[i] = Math.min(d[i], at(x - 1, y) + 3, at(x, y - 1) + 3, at(x - 1, y - 1) + 4, at(x + 1, y - 1) + 4);
    }
  for (let y = size - 1; y >= 0; y--)
    for (let x = size - 1; x >= 0; x--) {
      const i = y * size + x;
      d[i] = Math.min(d[i], at(x + 1, y) + 3, at(x, y + 1) + 3, at(x + 1, y + 1) + 4, at(x - 1, y + 1) + 4);
    }
  for (let i = 0; i < d.length; i++) d[i] /= 3;
  return d;
}

/** Label 8-connected groups of set cells; returns a label per cell (-1 = not set) and the count. */
function label(mask: Uint8Array, size: number): { lab: Int32Array; count: number } {
  const lab = new Int32Array(mask.length).fill(-1);
  let count = 0;
  const stack: number[] = [];
  for (let s = 0; s < mask.length; s++) {
    if (!mask[s] || lab[s] >= 0) continue;
    lab[s] = count;
    stack.push(s);
    while (stack.length) {
      const i = stack.pop()!;
      const x = i % size, y = (i - x) / size;
      for (let dy = -1; dy <= 1; dy++)
        for (let dx = -1; dx <= 1; dx++) {
          const xx = x + dx, yy = y + dy;
          if (xx < 0 || yy < 0 || xx >= size || yy >= size) continue;
          const j = yy * size + xx;
          if (mask[j] && lab[j] < 0) {
            lab[j] = count;
            stack.push(j);
          }
        }
    }
    count++;
  }
  return { lab, count };
}

/** Everything about a letter that scoring needs; build once per letter. */
export function glyphModel(mask: Uint8Array, size = GRID): GlyphModel {
  const sk = thin(mask, size);
  const inside = distanceTo(mask.map((v) => (v ? 0 : 1)), size);
  const { lab, count } = label(mask, size);
  const skel: number[] = [];
  const skelPart: number[] = [];
  const area = new Array<number>(count).fill(0);
  for (let i = 0; i < mask.length; i++) if (mask[i]) area[lab[i]]++;
  const hasSkel = new Array<boolean>(count).fill(false);
  for (let i = 0; i < sk.length; i++)
    if (sk[i] && area[lab[i]] >= 6) {
      skel.push(i);
      skelPart.push(lab[i]);
      hasSkel[lab[i]] = true;
    }
  // A small blob (a dot) can thin away completely: keep its deepest cell as its skeleton.
  for (let p = 0; p < count; p++) {
    if (hasSkel[p] || area[p] < 6) continue;
    let best = -1;
    for (let i = 0; i < mask.length; i++) if (lab[i] === p && (best < 0 || inside[i] > inside[best])) best = i;
    skel.push(best);
    skelPart.push(p);
  }
  const widths = skel.map((i) => inside[i]).sort((a, b) => a - b);
  const halfWidth = widths.length ? widths[widths.length >> 1] : 1;
  const parts = [...new Set(skelPart)];
  const remap = new Map(parts.map((p, k) => [p, k]));
  const skelDir = skelDirections(skel, size);
  return {
    size,
    skel,
    skelPart: skelPart.map((p) => remap.get(p)!),
    skelDir,
    strokes: skelStrokes(skel, skelDir, size, halfWidth),
    parts: parts.length,
    halfWidth,
    away: distanceTo(mask, size),
  };
}

/**
 * Which way the stroke runs at each skeleton cell: the main axis of the skeleton cells
 * around it. Where strokes meet, or for a dot, there is no clear direction (null).
 */
function skelDirections(skel: number[], size: number): Array<[number, number] | null> {
  const pts = skel.map((i) => [i % size, Math.floor(i / size)]);
  return pts.map(([x, y]) => {
    let n = 0, mx = 0, my = 0;
    const near: number[][] = [];
    for (const q of pts) if ((q[0] - x) ** 2 + (q[1] - y) ** 2 <= DIR_RADIUS ** 2) near.push(q);
    for (const [qx, qy] of near) (mx += qx), (my += qy), n++;
    if (n < 3) return null;
    mx /= n;
    my /= n;
    let sxx = 0, syy = 0, sxy = 0;
    for (const [qx, qy] of near) {
      sxx += (qx - mx) ** 2;
      syy += (qy - my) ** 2;
      sxy += (qx - mx) * (qy - my);
    }
    const tr = sxx + syy;
    const det = Math.sqrt((sxx - syy) ** 2 + 4 * sxy * sxy);
    if (!tr || det / tr < 0.6) return null; // a join or a tight bend: no single direction
    const a = 0.5 * Math.atan2(2 * sxy, sxx - syy);
    return [Math.cos(a), Math.sin(a)];
  });
}

/**
 * Split the skeleton into strokes at its joins (cells with 3+ skeleton neighbours). Very short
 * pieces are thinning leftovers at corners, not strokes, and are left out; so are pieces
 * with hardly any clear direction.
 */
function skelStrokes(skel: number[], dir: Array<[number, number] | null>, size: number, halfWidth: number): number[][] {
  const at = new Map<number, number>();
  skel.forEach((i, k) => at.set(i, k));
  const nbrs = (i: number): number[] => {
    const x = i % size, y = (i - x) / size;
    const out: number[] = [];
    for (let dy = -1; dy <= 1; dy++)
      for (let dx = -1; dx <= 1; dx++) {
        const k = (dx || dy) && x + dx >= 0 && x + dx < size ? at.get((y + dy) * size + x + dx) : undefined;
        if (k !== undefined) out.push(k);
      }
    return out;
  };
  const join = skel.map((i) => nbrs(i).length >= 3);
  const seen = new Uint8Array(skel.length);
  const minLen = Math.max(5, Math.round(1.5 * halfWidth + 1));
  const out: number[][] = [];
  for (let s = 0; s < skel.length; s++) {
    if (join[s] || seen[s]) continue;
    const piece: number[] = [];
    const stack = [s];
    seen[s] = 1;
    while (stack.length) {
      const k = stack.pop()!;
      piece.push(k);
      for (const m of nbrs(skel[k])) if (!join[m] && !seen[m]) (seen[m] = 1), stack.push(m);
    }
    if (piece.length >= minLen && piece.filter((k) => dir[k]).length >= 2) out.push(piece);
  }
  return out;
}

/** A finger point, with the way the finger was moving there (0,0 for a tap). */
export type Sample = [x: number, y: number, dx: number, dy: number];

/** Points every half cell along each finger path, each with its direction of travel. */
export function samplePaths(strokes: Pt[][]): Sample[] {
  const out: Sample[] = [];
  for (const s of strokes) {
    if (!s.length) continue;
    const line: Pt[] = [s[0]];
    for (let k = 1; k < s.length; k++) {
      const [x0, y0] = s[k - 1];
      const [x1, y1] = s[k];
      const n = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0) / 0.5));
      for (let j = 1; j <= n; j++) line.push([x0 + ((x1 - x0) * j) / n, y0 + ((y1 - y0) * j) / n]);
    }
    // Direction from a chord about 3 cells long, so finger jitter does not matter.
    const h = 3;
    line.forEach(([x, y], j) => {
      const a = line[Math.max(0, j - h)];
      const b = line[Math.min(line.length - 1, j + h)];
      const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
      out.push(len > 0.75 ? [x, y, (b[0] - a[0]) / len, (b[1] - a[1]) / len] : [x, y, 0, 0]);
    });
  }
  return out;
}

export function scoreStrokes(model: GlyphModel, strokes: Pt[][], wobble = WOBBLE): TraceScore {
  const { size, skel, skelPart, skelDir, parts, halfWidth, away } = model;
  const pts = samplePaths(strokes);
  const centre = (i: number): Pt => [(i % size) + 0.5, Math.floor(i / size) + 0.5];
  if (!skel.length || !pts.length) return { coverage: 0, gap: skel.length, partMin: 0, strokeMin: 0, spill: 0, todo: skel.map(centre) };
  const reach = halfWidth + wobble;
  const r2 = reach * reach;

  // Bucket the finger points so each skeleton cell only looks nearby.
  const cell = Math.max(1, Math.ceil(reach));
  const cols = Math.ceil(size / cell) + 1;
  const buckets = new Map<number, Sample[]>();
  for (const p of pts) {
    const k = Math.floor(p[1] / cell) * cols + Math.floor(p[0] / cell);
    const b = buckets.get(k);
    if (b) b.push(p);
    else buckets.set(k, [p]);
  }
  // A skeleton cell is traced when the finger passed close to it, moving along the stroke
  // (so tracing the two legs of A does not also count for the bar between them).
  const near = (cx: number, cy: number, dir: [number, number] | null): boolean => {
    const bx = Math.floor(cx / cell), by = Math.floor(cy / cell);
    for (let dy = -1; dy <= 1; dy++)
      for (let dx = -1; dx <= 1; dx++) {
        const b = buckets.get((by + dy) * cols + bx + dx);
        if (!b) continue;
        for (const [x, y, ux, uy] of b) {
          const vx = x - cx, vy = y - cy;
          if (vx * vx + vy * vy > r2) continue;
          if (!dir) return true;
          // Beside the cell (not ahead of it along the stroke), and moving along the stroke.
          if (Math.abs(vx * dir[0] + vy * dir[1]) <= AHEAD && Math.abs(ux * dir[0] + uy * dir[1]) >= ALONG) return true;
        }
      }
    return false;
  };

  const covered = new Uint8Array(skel.length);
  const partHit = new Array<number>(parts).fill(0);
  const partAll = new Array<number>(parts).fill(0);
  let hit = 0;
  skel.forEach((i, k) => {
    const x = i % size, y = (i - x) / size;
    partAll[skelPart[k]]++;
    if (near(x + 0.5, y + 0.5, skelDir[k])) {
      covered[k] = 1;
      hit++;
      partHit[skelPart[k]]++;
    }
  });

  // Longest run of untraced skeleton (8-connected).
  const idx = new Map<number, number>();
  skel.forEach((i, k) => idx.set(i, k));
  const seen = new Uint8Array(skel.length);
  let gap = 0;
  for (let k = 0; k < skel.length; k++) {
    if (covered[k] || seen[k]) continue;
    let n = 0;
    const stack = [k];
    seen[k] = 1;
    while (stack.length) {
      const j = stack.pop()!;
      n++;
      const x = skel[j] % size, y = (skel[j] - x) / size;
      for (let dy = -1; dy <= 1; dy++)
        for (let dx = -1; dx <= 1; dx++) {
          const m = idx.get((y + dy) * size + x + dx);
          if (m !== undefined && !covered[m] && !seen[m]) {
            seen[m] = 1;
            stack.push(m);
          }
        }
    }
    gap = Math.max(gap, n);
  }

  let outside = 0;
  const far = SPILL_AWAY * size;
  for (const [x, y] of pts) {
    const cx = Math.floor(x), cy = Math.floor(y);
    const d = cx < 0 || cy < 0 || cx >= size || cy >= size ? Infinity : away[cy * size + cx];
    if (d > far) outside++;
  }

  // Each stroke, judged by its cells that have a clear direction (the join ends of a stroke
  // get covered by whichever stroke meets them, so they say little).
  let strokeMin = 1;
  for (const st of model.strokes) {
    const own = st.filter((k) => skelDir[k]);
    strokeMin = Math.min(strokeMin, own.filter((k) => covered[k]).length / own.length);
  }

  return {
    coverage: hit / skel.length,
    gap,
    partMin: Math.min(...partHit.map((h, p) => h / partAll[p])),
    strokeMin,
    spill: outside / pts.length,
    todo: skel.filter((_, k) => !covered[k]).map(centre),
  };
}

export const passed = (s: TraceScore, size = GRID): boolean =>
  s.coverage >= PASS.coverage &&
  s.gap <= PASS.gap * size &&
  s.partMin >= PASS.part &&
  s.strokeMin >= PASS.stroke &&
  s.spill <= PASS.spill;

/** 0..1 for the progress meter: reaches 1 only when the trace passes. */
export const progress = (s: TraceScore, size = GRID): number =>
  passed(s, size) ? 1 : Math.min(0.9, s.coverage / PASS.coverage);

/** Turn canvas RGBA pixels into a 0/1 mask (alpha above half). */
export function alphaMask(rgba: Uint8ClampedArray): Uint8Array {
  const out = new Uint8Array(rgba.length / 4);
  for (let i = 0; i < out.length; i++) out[i] = rgba[i * 4 + 3] > 127 ? 1 : 0;
  return out;
}
