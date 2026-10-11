import type { PieceSymbol, Square } from 'chess.js';
import { Board, QUEEN, WHITE, mFrom, mPromo, mTo, sqName } from './engine';

/**
 * The buddy's chess brain: it only chooses moves (chess.js checks and plays them).
 *
 * The search runs on the fast board in engine.ts. Five levels, from "makes almost any
 * move" to "thinks a few moves ahead". Weaker levels
 * are weak on purpose but believably: they choose among moves that are nearly as good as
 * the best one (the "slack"), instead of throwing pieces away at random, so a child can win
 * without the buddy looking silly.
 */
export const VALUE: Record<PieceSymbol, number> = { p: 100, n: 310, b: 330, r: 500, q: 900, k: 0 };
const MATE = 100000;

export interface BuddyLevel {
  level: number;
  /** Full-width search depth in plies (0 = pick any legal move). */
  depth: number;
  /** Look at captures after the last ply, so it doesn't stop mid-trade. */
  quiesce: boolean;
  /** Choose among root moves within this many centipawns of the best. */
  slack: number;
  /** Random noise added to each root score, so games differ. */
  jitter: number;
  /** Time budget for iterative deepening (ms). */
  timeMs: number;
}

export const LEVELS: BuddyLevel[] = [
  { level: 1, depth: 0, quiesce: false, slack: Infinity, jitter: 0, timeMs: 0 },
  { level: 2, depth: 1, quiesce: false, slack: 260, jitter: 60, timeMs: 300 },
  { level: 3, depth: 2, quiesce: true, slack: 45, jitter: 25, timeMs: 700 },
  { level: 4, depth: 4, quiesce: true, slack: 12, jitter: 10, timeMs: 900 },
  { level: 5, depth: 6, quiesce: true, slack: 0, jitter: 4, timeMs: 1500 },
];
export const levelCfg = (n: number): BuddyLevel => LEVELS[Math.max(1, Math.min(LEVELS.length, Math.round(n))) - 1];

/* --------------------------- evaluation --------------------------- */
// Piece-square tables (white's view, rank 8 first, like Chess.board()). Small nudges only:
// knights and bishops like the centre, pawns like to advance, the king likes to stay home.
const PST: Record<PieceSymbol, number[]> = {
  p: [
    0, 0, 0, 0, 0, 0, 0, 0, 50, 50, 50, 50, 50, 50, 50, 50, 10, 10, 20, 30, 30, 20, 10, 10, 5, 5, 10, 25, 25, 10, 5, 5, 0, 0, 0, 20,
    20, 0, 0, 0, 5, -5, -10, 0, 0, -10, -5, 5, 5, 10, 10, -20, -20, 10, 10, 5, 0, 0, 0, 0, 0, 0, 0, 0,
  ],
  n: [
    -50, -40, -30, -30, -30, -30, -40, -50, -40, -20, 0, 0, 0, 0, -20, -40, -30, 0, 10, 15, 15, 10, 0, -30, -30, 5, 15, 20, 20, 15, 5,
    -30, -30, 0, 15, 20, 20, 15, 0, -30, -30, 5, 10, 15, 15, 10, 5, -30, -40, -20, 0, 5, 5, 0, -20, -40, -50, -40, -30, -30, -30, -30,
    -40, -50,
  ],
  b: [
    -20, -10, -10, -10, -10, -10, -10, -20, -10, 0, 0, 0, 0, 0, 0, -10, -10, 0, 5, 10, 10, 5, 0, -10, -10, 5, 5, 10, 10, 5, 5, -10, -10,
    0, 10, 10, 10, 10, 0, -10, -10, 10, 10, 10, 10, 10, 10, -10, -10, 5, 0, 0, 0, 0, 5, -10, -20, -10, -10, -10, -10, -10, -10, -20,
  ],
  r: [
    0, 0, 0, 0, 0, 0, 0, 0, 5, 10, 10, 10, 10, 10, 10, 5, -5, 0, 0, 0, 0, 0, 0, -5, -5, 0, 0, 0, 0, 0, 0, -5, -5, 0, 0, 0, 0, 0, 0, -5,
    -5, 0, 0, 0, 0, 0, 0, -5, -5, 0, 0, 0, 0, 0, 0, -5, 0, 0, 0, 5, 5, 0, 0, 0,
  ],
  q: [
    -20, -10, -10, -5, -5, -10, -10, -20, -10, 0, 0, 0, 0, 0, 0, -10, -10, 0, 5, 5, 5, 5, 0, -10, -5, 0, 5, 5, 5, 5, 0, -5, 0, 0, 5, 5,
    5, 5, 0, -5, -10, 5, 5, 5, 5, 5, 0, -10, -10, 0, 5, 0, 0, 0, 0, -10, -20, -10, -10, -5, -5, -10, -10, -20,
  ],
  k: [
    -30, -40, -40, -50, -50, -40, -40, -30, -30, -40, -40, -50, -50, -40, -40, -30, -30, -40, -40, -50, -50, -40, -40, -30, -30, -40,
    -40, -50, -50, -40, -40, -30, -20, -30, -30, -40, -40, -30, -30, -20, -10, -20, -20, -20, -20, -20, -20, -10, 20, 20, 0, 0, 0, 0,
    20, 20, 20, 30, 10, 0, 0, 10, 30, 20,
  ],
};

const TYPE_VALUE = [0, 100, 310, 330, 500, 900, 0];
const TYPE_PST = [[], PST.p, PST.n, PST.b, PST.r, PST.q, PST.k];

/** Score from the side to move's point of view (centipawns). */
export function evaluate(bd: Board): number {
  const b = bd.b;
  let s = 0;
  for (let sq = 0; sq < 120; sq++) {
    if (sq & 0x88) {
      sq += 7;
      continue;
    }
    const p = b[sq];
    if (!p) continue;
    const t = p & 7;
    const rank = sq >> 4;
    const file = sq & 7;
    // Tables are written from white's side, rank 8 first; black reads them mirrored.
    if (p & 8) s -= TYPE_VALUE[t] + TYPE_PST[t][rank * 8 + file];
    else s += TYPE_VALUE[t] + TYPE_PST[t][(7 - rank) * 8 + file];
  }
  return bd.side === WHITE ? s : -s;
}

/* --------------------------- search --------------------------- */
interface Ctx {
  nodes: number;
  deadline: number;
}
class Timeout extends Error {}

/** Captures and promotions first, most valuable victim by least valuable attacker. */
function order(bd: Board, moves: number[]): number[] {
  const key = (m: number) => {
    const v = bd.victim(m);
    return (v ? 10 * TYPE_VALUE[v] - TYPE_VALUE[bd.b[mFrom(m)] & 7] + 10000 : 0) + (mPromo(m) === QUEEN ? 9000 : 0);
  };
  return moves.map((m) => [key(m), m]).sort((a, b) => b[0] - a[0]).map((x) => x[1]);
}

function tick(ctx: Ctx) {
  if (++ctx.nodes % 1024 === 0 && ctx.deadline && Date.now() > ctx.deadline) throw new Timeout();
}

function quiesce(bd: Board, alpha: number, beta: number, depth: number, ctx: Ctx): number {
  tick(ctx);
  const stand = evaluate(bd);
  if (stand >= beta) return stand;
  if (stand > alpha) alpha = stand;
  if (depth <= 0) return stand;
  for (const m of order(bd, bd.gen(true))) {
    bd.make(m);
    if (bd.inCheck(bd.side ^ 8)) {
      bd.unmake();
      continue;
    }
    const v = -quiesce(bd, -beta, -alpha, depth - 1, ctx);
    bd.unmake();
    if (v >= beta) return v;
    if (v > alpha) alpha = v;
  }
  return alpha;
}

function negamax(bd: Board, depth: number, alpha: number, beta: number, ply: number, q: boolean, ctx: Ctx): number {
  tick(ctx);
  if (ply > 0 && bd.half >= 100) return 0;
  if (depth <= 0) {
    // Don't stand still in check: look one move further so mates are seen.
    if (!bd.inCheck()) return q ? quiesce(bd, alpha, beta, 6, ctx) : evaluate(bd);
    depth = 1;
  }
  let best = -Infinity;
  let any = false;
  for (const m of order(bd, bd.gen())) {
    bd.make(m);
    if (bd.inCheck(bd.side ^ 8)) {
      bd.unmake();
      continue;
    }
    any = true;
    const v = -negamax(bd, depth - 1, -beta, -alpha, ply + 1, q, ctx);
    bd.unmake();
    if (v > best) best = v;
    if (v > alpha) alpha = v;
    if (alpha >= beta) break;
  }
  if (!any) return bd.inCheck() ? -MATE + ply : 0;
  return best;
}

export interface Choice {
  from: Square;
  to: Square;
  promotion?: PieceSymbol;
}

const PROMO = ['', '', 'n', 'b', 'r', 'q'] as const;
const toChoice = (m: number): Choice => {
  const pr = mPromo(m);
  return { from: sqName(mFrom(m)) as Square, to: sqName(mTo(m)) as Square, ...(pr ? { promotion: PROMO[pr] as PieceSymbol } : {}) };
};

interface Scored {
  m: number;
  v: number;
  /** False when the search only proved "no better than v" (it can't be among the best). */
  exact: boolean;
}

/** Score every root move to `depth` (moves far below the best can stop early). */
function scoreRoot(bd: Board, moves: number[], depth: number, slack: number, q: boolean, ctx: Ctx): Scored[] {
  const out: Scored[] = [];
  let best = -Infinity;
  for (const m of moves) {
    bd.make(m);
    // Anything worse than best − slack is never chosen, so its exact score doesn't matter.
    const floor = best === -Infinity || !isFinite(slack) ? -Infinity : best - slack - 1;
    const v = -negamax(bd, depth - 1, -Infinity, -floor, 1, q, ctx);
    bd.unmake();
    out.push({ m, v, exact: v > floor });
    if (v > best) best = v;
  }
  return out;
}

/**
 * A few well-known openings (moves as from-to squares), so the buddy starts games the way
 * people do instead of with odd moves a short search can't tell apart.
 */
const BOOK = [
  'e2e4 e7e5 g1f3 b8c6 f1c4 f8c5 c2c3 g8f6',
  'e2e4 e7e5 g1f3 b8c6 f1b5 a7a6 b5a4 g8f6',
  'e2e4 e7e5 g1f3 b8c6 d2d4 e5d4 f3d4 g8f6',
  'e2e4 e7e5 b1c3 g8f6 g1f3 b8c6 f1b5 f8b4',
  'e2e4 c7c5 g1f3 d7d6 d2d4 c5d4 f3d4 g8f6',
  'e2e4 c7c5 g1f3 b8c6 d2d4 c5d4 f3d4 g8f6',
  'e2e4 e7e6 d2d4 d7d5 b1c3 g8f6 c1g5 f8e7',
  'e2e4 c7c6 d2d4 d7d5 b1c3 d5e4 c3e4 c8f5',
  'd2d4 d7d5 c2c4 e7e6 b1c3 g8f6 c1g5 f8e7',
  'd2d4 g8f6 c2c4 e7e6 g1f3 d7d5 b1c3 f8e7',
  'd2d4 d7d5 g1f3 g8f6 c1f4 e7e6 e2e3 f8d6',
  'g1f3 d7d5 d2d4 g8f6 c2c4 e7e6 b1c3 f8e7',
  'c2c4 e7e5 b1c3 g8f6 g1f3 b8c6 g2g3 d7d5',
].map((l) => l.split(' '));

/** A book move for these moves so far (from-to squares), or null when out of the book. */
export function bookMove(history: string[], rnd: () => number = Math.random): string | null {
  if (history.length >= 8) return null;
  const next = BOOK.filter((line) => history.every((m, i) => line[i] === m) && line.length > history.length).map((line) => line[history.length]);
  if (!next.length) return null;
  const uniq = [...new Set(next)];
  return uniq[Math.floor(rnd() * uniq.length)];
}

/**
 * Choose the buddy's move for this position. `rnd` is injectable so tests are repeatable.
 * Returns null when there are no legal moves.
 */
export function pickMove(fen: string, level: number, rnd: () => number = Math.random, history?: string[]): Choice | null {
  const cfg = levelCfg(level);
  const bd = new Board(fen);
  const moves = order(bd, bd.legal());
  if (!moves.length) return null;
  if (history && cfg.level >= 2) {
    const book = bookMove(history, rnd);
    const hit = book && moves.find((m) => sqName(mFrom(m)) + sqName(mTo(m)) === book);
    if (hit) return toChoice(hit);
  }
  if (cfg.depth === 0) {
    // Level 1: any legal move, with a slight liking for captures (it feels like playing).
    const caps = moves.filter((m) => bd.victim(m));
    const pool = caps.length && rnd() < 0.35 ? caps : moves;
    return toChoice(pool[Math.floor(rnd() * pool.length)]);
  }
  const ctx: Ctx = { nodes: 0, deadline: 0 };
  // Iterative deepening: always finish depth 1, then go deeper while time allows.
  let scored = scoreRoot(bd, moves, 1, cfg.slack, cfg.quiesce, ctx);
  ctx.deadline = Date.now() + cfg.timeMs;
  for (let d = 2; d <= cfg.depth; d++) {
    try {
      // Search the previous best first: better pruning.
      const sorted = [...scored].sort((a, b) => b.v - a.v).map((x) => x.m);
      scored = scoreRoot(bd, sorted, d, cfg.slack, cfg.quiesce, ctx);
    } catch (e) {
      if (!(e instanceof Timeout)) throw e;
      // The board is left mid-search here; it is not used again, only the scores above.
      break;
    }
  }
  // Taking material now beats taking it later (a short search sees both as equal): a small
  // bonus for captures and promotions, only on exactly scored moves.
  const gain = (m: number) => (TYPE_VALUE[bd.victim(m)] + (mPromo(m) === QUEEN ? 800 : 0)) / 10;
  const adj = scored.map((x) => ({ ...x, a: x.v + (x.exact && Math.abs(x.v) < MATE / 2 ? gain(x.m) : 0) }));
  const best = Math.max(...adj.map((x) => x.a));
  // A forced mate is never "close enough" to skip; otherwise any exact move within the slack.
  const pool = adj.filter((x) => x.exact && (best > MATE / 2 ? x.a === best : x.a >= best - cfg.slack));
  const from = pool.length ? pool : adj.filter((x) => x.a === best);
  // Noise only decides between moves that are already good enough.
  let pick = from[0];
  let top = -Infinity;
  for (const x of from) {
    const r = x.a + rnd() * 2 * cfg.jitter;
    if (r > top) {
      top = r;
      pick = x;
    }
  }
  return toChoice(pick.m);
}

/** The strongest move this brain finds for whoever is to move (used for the child's hint). */
export function bestMove(fen: string, history?: string[]): Choice | null {
  return pickMove(fen, 5, () => 0.5, history);
}
