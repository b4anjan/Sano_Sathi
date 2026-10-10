/**
 * Copy Me levels: 15 steps from easy to hard.
 *
 *   levels 1–5    4 big blocks, slow, a wrong tap just replays the pattern
 *   levels 6–10   6 blocks, shapes sometimes change between rounds
 *   levels 11–15  8 blocks, faster, shapes change every round, a wrong tap restarts the level
 *
 * Each round adds one more step to the pattern; a level is done when the pattern reaches
 * `target` steps (3 at level 1, up to 10 at level 15).
 */
export const LEVELS = 15;

export type ShapeMode = 'fixed' | 'sometimes' | 'every';

export interface LevelCfg {
  level: number;
  blocks: 4 | 6 | 8;
  /** How long each block lights up while the pattern plays (ms). */
  flashMs: number;
  /** Pause between blocks (ms). */
  gapMs: number;
  /** Pattern length that completes the level. */
  target: number;
  shapes: ShapeMode;
  /** Strict levels restart from one step after a mistake. */
  strict: boolean;
  /** 1, 2 or 3 stars of difficulty, for the level picker. */
  band: 1 | 2 | 3;
}

export function levelConfig(level: number): LevelCfg {
  const L = Math.max(1, Math.min(LEVELS, Math.round(level)));
  const band: 1 | 2 | 3 = L <= 5 ? 1 : L <= 10 ? 2 : 3;
  const flashMs = Math.round(720 - (L - 1) * 28);
  return {
    level: L,
    blocks: band === 1 ? 4 : band === 2 ? 6 : 8,
    flashMs,
    gapMs: Math.round(flashMs * 0.45),
    target: 3 + Math.floor((L - 1) / 2),
    shapes: band === 1 ? 'fixed' : band === 2 ? 'sometimes' : 'every',
    strict: band === 3,
    band,
  };
}

/** Add one random step, never the same block three times in a row. */
export function extend(seq: readonly number[], blocks: number, rnd: () => number = Math.random): number[] {
  let next = Math.floor(rnd() * blocks);
  const n = seq.length;
  if (n >= 2 && seq[n - 1] === next && seq[n - 2] === next) next = (next + 1 + Math.floor(rnd() * (blocks - 1))) % blocks;
  return [...seq, next];
}

/** Musical notes for the blocks: C major pentatonic or major, so any pattern sounds nice. */
export const NOTES: Record<4 | 6 | 8, number[]> = {
  4: [523.25, 659.25, 783.99, 1046.5],
  6: [523.25, 587.33, 659.25, 783.99, 880, 1046.5],
  8: [523.25, 587.33, 659.25, 698.46, 783.99, 880, 987.77, 1046.5],
};
