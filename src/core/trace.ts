/**
 * Scoring for tracing letters and numbers, with no stroke-order data.
 *
 * The letter is drawn into a small grid (the "glyph mask") and so is the child's finger
 * path, with a fat brush (the "ink mask"). Two numbers decide success:
 *   coverage: how much of the letter the finger went over (most of it, not all: little
 *             fingers wobble),
 *   spill:    how much of the finger path is far from the letter (scribbling everywhere
 *             should not count as tracing).
 * This works the same for A, क and ७, in any font.
 */
export const GRID = 64;
export const PASS = { coverage: 0.7, spill: 0.4 };

/** Grow a mask by r cells in every direction (square neighbourhood). */
export function dilate(mask: Uint8Array, size: number, r: number): Uint8Array {
  const out = new Uint8Array(mask.length);
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++) {
      if (!mask[y * size + x]) continue;
      for (let dy = -r; dy <= r; dy++) {
        const yy = y + dy;
        if (yy < 0 || yy >= size) continue;
        for (let dx = -r; dx <= r; dx++) {
          const xx = x + dx;
          if (xx >= 0 && xx < size) out[yy * size + xx] = 1;
        }
      }
    }
  return out;
}

export interface TraceScore {
  coverage: number;
  spill: number;
}

export function scoreTrace(glyph: Uint8Array, ink: Uint8Array, size = GRID): TraceScore {
  let g = 0;
  let covered = 0;
  let inked = 0;
  let outside = 0;
  const near = dilate(glyph, size, 3);
  for (let i = 0; i < glyph.length; i++) {
    if (glyph[i]) {
      g++;
      if (ink[i]) covered++;
    }
    if (ink[i]) {
      inked++;
      if (!near[i]) outside++;
    }
  }
  return { coverage: g ? covered / g : 0, spill: inked ? outside / inked : 0 };
}

export const passed = (s: TraceScore): boolean => s.coverage >= PASS.coverage && s.spill <= PASS.spill;

/** Turn canvas RGBA pixels into a 0/1 mask (alpha above half). */
export function alphaMask(rgba: Uint8ClampedArray): Uint8Array {
  const out = new Uint8Array(rgba.length / 4);
  for (let i = 0; i < out.length; i++) out[i] = rgba[i * 4 + 3] > 127 ? 1 : 0;
  return out;
}
