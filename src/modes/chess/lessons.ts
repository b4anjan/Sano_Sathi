import type { PieceType } from './pieces';
import type { ChLine } from '../../content/chess';

/**
 * "Meet the pieces": one lesson per piece, three short stages each. The child moves one
 * white piece around an empty board to land on every star. Rocks block the way (for the
 * long-range pieces); black pawns can only be taken (pawn lesson). Landing counts, passing
 * over doesn't, so children learn where a piece can stop.
 *
 * Squares are 0..63 with a1 = 0, h1 = 7, a8 = 56 (file = sq % 8, rank = sq / 8).
 */
export interface Stage {
  start: string;
  stars: string[];
  rocks?: string[];
  /** Black pawns that must be captured (pawn lesson only). */
  foes?: string[];
  /** Extra spoken tip for this stage. */
  tip?: ChLine;
}

export interface Lesson {
  piece: PieceType;
  stages: Stage[];
}

export const LESSONS: Lesson[] = [
  {
    piece: 'r',
    stages: [
      { start: 'a1', stars: ['a6', 'f6'] },
      { start: 'h1', stars: ['c1', 'c7', 'h7'] },
      { start: 'd4', stars: ['d8', 'h8', 'h4'], rocks: ['d6', 'f8'], tip: 'rocks' },
    ],
  },
  {
    piece: 'b',
    stages: [
      { start: 'c1', stars: ['f4', 'd6'] },
      { start: 'f1', stars: ['b5', 'e8', 'h5'] },
      { start: 'c1', stars: ['a3', 'e7', 'h4'], rocks: ['e3'], tip: 'rocks' },
    ],
  },
  {
    piece: 'q',
    stages: [
      { start: 'd1', stars: ['d7', 'h3'] },
      { start: 'a1', stars: ['a8', 'h8', 'h1', 'e4'] },
      { start: 'e4', stars: ['b7', 'g6', 'c2', 'h1'], rocks: ['e6', 'd3', 'f4'], tip: 'rocks' },
    ],
  },
  {
    piece: 'k',
    stages: [
      { start: 'd4', stars: ['d5', 'e6'] },
      { start: 'e1', stars: ['e2', 'f3', 'g2'] },
      { start: 'b2', stars: ['c3', 'd4', 'e4', 'f5'] },
    ],
  },
  {
    piece: 'n',
    stages: [
      { start: 'b1', stars: ['c3', 'd5'] },
      { start: 'g1', stars: ['f3', 'e5', 'f7'] },
      { start: 'd4', stars: ['b5', 'c3', 'e6'] },
    ],
  },
  {
    piece: 'p',
    stages: [
      { start: 'e2', stars: ['e4', 'e6'] },
      { start: 'c2', stars: [], foes: ['d3', 'e4', 'f5'], tip: 'captureSlant' },
      { start: 'b5', stars: ['b8', 'h2'], tip: 'becomeQueen' },
    ],
  },
];

export const sq = (name: string): number => (Number(name[1]) - 1) * 8 + (name.charCodeAt(0) - 97);
export const sqToName = (s: number): string => 'abcdefgh'[s % 8] + String(Math.floor(s / 8) + 1);

const KNIGHT = [[1, 2], [2, 1], [2, -1], [1, -2], [-1, -2], [-2, -1], [-2, 1], [-1, 2]];
const KING = [[1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1], [0, -1], [1, -1]];
const ROOK = [[1, 0], [0, 1], [-1, 0], [0, -1]];
const BISHOP = [[1, 1], [-1, 1], [-1, -1], [1, -1]];

/**
 * Where a lone piece can go. `blocked` are rocks (can't pass or land); `foes` are black
 * pieces (a pawn may take them on the slant; others may land on them to take them).
 */
export function lessonMoves(piece: PieceType, from: number, blocked: Set<number>, foes: Set<number>): number[] {
  const f0 = from % 8;
  const r0 = Math.floor(from / 8);
  const on = (f: number, r: number) => f >= 0 && f < 8 && r >= 0 && r < 8;
  const out: number[] = [];
  const step = (dirs: number[][], slide: boolean) => {
    for (const [df, dr] of dirs) {
      let f = f0 + df;
      let r = r0 + dr;
      while (on(f, r)) {
        const s = r * 8 + f;
        if (blocked.has(s)) break;
        out.push(s);
        if (foes.has(s) || !slide) break;
        f += df;
        r += dr;
      }
    }
  };
  if (piece === 'r') step(ROOK, true);
  else if (piece === 'b') step(BISHOP, true);
  else if (piece === 'q') step([...ROOK, ...BISHOP], true);
  else if (piece === 'k') step(KING, false);
  else if (piece === 'n') step(KNIGHT, false);
  else {
    // Pawn: forward onto empty squares (two from its first row), take on the slant.
    const ahead = from + 8;
    if (r0 < 7 && !blocked.has(ahead) && !foes.has(ahead)) {
      out.push(ahead);
      if (r0 === 1 && !blocked.has(ahead + 8) && !foes.has(ahead + 8)) out.push(ahead + 8);
    }
    for (const df of [-1, 1]) {
      const f = f0 + df;
      if (on(f, r0 + 1) && foes.has((r0 + 1) * 8 + f)) out.push((r0 + 1) * 8 + f);
    }
  }
  return out;
}

/** A pawn reaching the last row becomes a queen. */
export const promoted = (piece: PieceType, at: number): PieceType => (piece === 'p' && at >= 56 ? 'q' : piece);

/**
 * Fewest moves to collect every star and take every foe (breadth-first search over
 * position × what is left), used for the "best" count. -1 if impossible (a broken stage).
 */
export function par(lesson: Lesson, stage: Stage): number {
  const stars = stage.stars.map(sq);
  const foes = (stage.foes ?? []).map(sq);
  const targets = [...stars, ...foes];
  const blocked = new Set((stage.rocks ?? []).map(sq));
  const full = (1 << targets.length) - 1;
  type St = { at: number; piece: PieceType; mask: number };
  const startAt = sq(stage.start);
  const key = (s: St) => `${s.at}|${s.piece}|${s.mask}`;
  const seen = new Set<string>();
  let frontier: St[] = [{ at: startAt, piece: lesson.piece, mask: 0 }];
  seen.add(key(frontier[0]));
  for (let depth = 0; depth < 40 && frontier.length; depth++) {
    const next: St[] = [];
    for (const s of frontier) {
      if (s.mask === full) return depth;
      const foeSet = new Set(foes.filter((_, i) => !(s.mask & (1 << (stars.length + i)))));
      for (const to of lessonMoves(s.piece, s.at, blocked, foeSet)) {
        let mask = s.mask;
        const ti = targets.indexOf(to);
        if (ti >= 0) mask |= 1 << ti;
        const n: St = { at: to, piece: promoted(s.piece, to), mask };
        const k = key(n);
        if (!seen.has(k)) {
          seen.add(k);
          next.push(n);
        }
      }
    }
    frontier = next;
  }
  return -1;
}

/** 3 stars for the best count, 2 for a little more, 1 for finishing. */
export const stageStars = (moves: number, best: number): number => (moves <= best ? 3 : moves <= best + 2 ? 2 : 1);
