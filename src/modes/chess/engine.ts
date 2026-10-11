/**
 * A small, fast chess board for the buddy's thinking (0x88 layout).
 *
 * chess.js runs the game on screen (rules, move names, draws, saving). It is too slow to
 * search ahead, because it writes the full move name of every candidate, so the buddy
 * thinks on this board instead. Every result is double-checked by chess.js before it is
 * played, and the unit tests compare this board's move counts with published "perft"
 * numbers for tricky positions (castling, en passant, promotion, pins, checks).
 *
 * Squares: index = rank * 16 + file, rank 0 = rank 1. Off-board squares have (sq & 0x88) set.
 * Pieces: type 1–6 (pawn, knight, bishop, rook, queen, king) plus 8 for black.
 */
export const PAWN = 1, KNIGHT = 2, BISHOP = 3, ROOK = 4, QUEEN = 5, KING = 6;
export const WHITE = 0, BLACK = 8;

const N_OFF = [-33, -31, -18, -14, 14, 18, 31, 33];
const K_OFF = [-17, -16, -15, -1, 1, 15, 16, 17];
const B_DIR = [-17, -15, 15, 17];
const R_DIR = [-16, -1, 1, 16];

const F_DOUBLE = 1, F_EP = 2, F_CASTLE = 3;
const WK = 1, WQ = 2, BK = 4, BQ = 8;

/** Castling rights kept after a move touches this square. */
const KEEP = new Uint8Array(128).fill(15);
KEEP[4] = 15 & ~(WK | WQ);
KEEP[7] = 15 & ~WK;
KEEP[0] = 15 & ~WQ;
KEEP[116] = 15 & ~(BK | BQ);
KEEP[119] = 15 & ~BK;
KEEP[112] = 15 & ~BQ;

export const move = (from: number, to: number, promo = 0, flag = 0): number => from | (to << 7) | (promo << 14) | (flag << 17);
export const mFrom = (m: number) => m & 127;
export const mTo = (m: number) => (m >> 7) & 127;
export const mPromo = (m: number) => (m >> 14) & 7;
const mFlag = (m: number) => (m >> 17) & 7;

export const sqName = (sq: number): string => 'abcdefgh'[sq & 7] + String((sq >> 4) + 1);
export const sqIndex = (name: string): number => (Number(name[1]) - 1) * 16 + (name.charCodeAt(0) - 97);
const LETTER = ' pnbrqk';

export class Board {
  b = new Int8Array(128);
  side = WHITE;
  castling = 0;
  ep = -1;
  half = 0;
  king = [4, 116];
  private stack: number[] = [];

  constructor(fen: string) {
    const [pos, side, cast, ep, half] = fen.trim().split(/\s+/);
    let r = 7;
    let f = 0;
    for (const ch of pos) {
      if (ch === '/') {
        r--;
        f = 0;
      } else if (/\d/.test(ch)) f += Number(ch);
      else {
        const t = LETTER.indexOf(ch.toLowerCase());
        const color = ch === ch.toLowerCase() ? BLACK : WHITE;
        const sq = r * 16 + f;
        this.b[sq] = t | color;
        if (t === KING) this.king[color >> 3] = sq;
        f++;
      }
    }
    this.side = side === 'b' ? BLACK : WHITE;
    this.castling = (cast?.includes('K') ? WK : 0) | (cast?.includes('Q') ? WQ : 0) | (cast?.includes('k') ? BK : 0) | (cast?.includes('q') ? BQ : 0);
    this.ep = ep && ep !== '-' ? sqIndex(ep) : -1;
    this.half = Number(half) || 0;
  }

  /** Is `sq` attacked by side `by`? */
  attacked(sq: number, by: number): boolean {
    const b = this.b;
    // Pawns: a white pawn on s attacks s+15 and s+17.
    if (by === WHITE) {
      if (!((sq - 15) & 0x88) && b[sq - 15] === (PAWN | WHITE)) return true;
      if (!((sq - 17) & 0x88) && b[sq - 17] === (PAWN | WHITE)) return true;
    } else {
      if (!((sq + 15) & 0x88) && b[sq + 15] === (PAWN | BLACK)) return true;
      if (!((sq + 17) & 0x88) && b[sq + 17] === (PAWN | BLACK)) return true;
    }
    for (const o of N_OFF) {
      const t = sq + o;
      if (!(t & 0x88) && b[t] === (KNIGHT | by)) return true;
    }
    for (const o of K_OFF) {
      const t = sq + o;
      if (!(t & 0x88) && b[t] === (KING | by)) return true;
    }
    for (const d of B_DIR) {
      for (let t = sq + d; !(t & 0x88); t += d) {
        const p = b[t];
        if (!p) continue;
        if (p === (BISHOP | by) || p === (QUEEN | by)) return true;
        break;
      }
    }
    for (const d of R_DIR) {
      for (let t = sq + d; !(t & 0x88); t += d) {
        const p = b[t];
        if (!p) continue;
        if (p === (ROOK | by) || p === (QUEEN | by)) return true;
        break;
      }
    }
    return false;
  }

  inCheck(side = this.side): boolean {
    return this.attacked(this.king[side >> 3], side ^ 8);
  }

  /** Pseudo-legal moves (may leave the king in check); `caps` = captures and promotions only. */
  gen(caps = false): number[] {
    const out: number[] = [];
    const b = this.b;
    const me = this.side;
    const them = me ^ 8;
    const enemy = (p: number) => p !== 0 && (p & 8) === them;
    for (let sq = 0; sq < 120; sq++) {
      if (sq & 0x88) {
        sq += 7;
        continue;
      }
      const p = b[sq];
      if (!p || (p & 8) !== me) continue;
      const t = p & 7;
      if (t === PAWN) {
        const dir = me === WHITE ? 16 : -16;
        const startRank = me === WHITE ? 1 : 6;
        const lastRank = me === WHITE ? 7 : 0;
        const one = sq + dir;
        const pushPromo = (from: number, to: number, flag = 0) => {
          if (to >> 4 === lastRank) for (const pr of [QUEEN, KNIGHT, ROOK, BISHOP]) out.push(move(from, to, pr, flag));
          else out.push(move(from, to, 0, flag));
        };
        if (!(one & 0x88) && !b[one]) {
          if (!caps || one >> 4 === lastRank) pushPromo(sq, one);
          const two = one + dir;
          if (!caps && sq >> 4 === startRank && !b[two]) out.push(move(sq, two, 0, F_DOUBLE));
        }
        for (const d of [dir - 1, dir + 1]) {
          const to = sq + d;
          if (to & 0x88) continue;
          if (enemy(b[to])) pushPromo(sq, to);
          else if (to === this.ep) out.push(move(sq, to, 0, F_EP));
        }
      } else if (t === KNIGHT || t === KING) {
        for (const o of t === KNIGHT ? N_OFF : K_OFF) {
          const to = sq + o;
          if (to & 0x88) continue;
          const q = b[to];
          if (q ? enemy(q) : !caps) out.push(move(sq, to));
        }
        if (t === KING && !caps) this.genCastles(out, sq);
      } else {
        const dirs = t === BISHOP ? B_DIR : t === ROOK ? R_DIR : K_OFF;
        for (const d of dirs) {
          for (let to = sq + d; !(to & 0x88); to += d) {
            const q = b[to];
            if (q) {
              if (enemy(q)) out.push(move(sq, to));
              break;
            }
            if (!caps) out.push(move(sq, to));
          }
        }
      }
    }
    return out;
  }

  private genCastles(out: number[], sq: number) {
    const b = this.b;
    const me = this.side;
    const them = me ^ 8;
    const base = me === WHITE ? 0 : 112;
    if (sq !== base + 4) return;
    const [kRight, qRight] = me === WHITE ? [WK, WQ] : [BK, BQ];
    if (this.castling & kRight && !b[base + 5] && !b[base + 6] && b[base + 7] === (ROOK | me)) {
      if (!this.attacked(base + 4, them) && !this.attacked(base + 5, them) && !this.attacked(base + 6, them)) out.push(move(base + 4, base + 6, 0, F_CASTLE));
    }
    if (this.castling & qRight && !b[base + 3] && !b[base + 2] && !b[base + 1] && b[base] === (ROOK | me)) {
      if (!this.attacked(base + 4, them) && !this.attacked(base + 3, them) && !this.attacked(base + 2, them)) out.push(move(base + 4, base + 2, 0, F_CASTLE));
    }
  }

  /** Captured piece of a move, before it is made (for ordering). */
  victim(m: number): number {
    return mFlag(m) === F_EP ? PAWN : this.b[mTo(m)] & 7;
  }

  make(m: number): void {
    const b = this.b;
    const from = mFrom(m);
    const to = mTo(m);
    const promo = mPromo(m);
    const flag = mFlag(m);
    const piece = b[from];
    const me = this.side;
    let captured = b[to];
    if (flag === F_EP) {
      const cs = to + (me === WHITE ? -16 : 16);
      captured = b[cs];
      b[cs] = 0;
    }
    this.stack.push(m, captured, this.castling, this.ep, this.half);
    b[to] = promo ? promo | me : piece;
    b[from] = 0;
    if (flag === F_CASTLE) {
      if (to === from + 2) {
        b[from + 1] = b[from + 3];
        b[from + 3] = 0;
      } else {
        b[from - 1] = b[from - 4];
        b[from - 4] = 0;
      }
    }
    if ((piece & 7) === KING) this.king[me >> 3] = to;
    this.castling &= KEEP[from] & KEEP[to];
    this.ep = flag === F_DOUBLE ? (from + to) >> 1 : -1;
    this.half = (piece & 7) === PAWN || captured ? 0 : this.half + 1;
    this.side = me ^ 8;
  }

  unmake(): void {
    const s = this.stack;
    const half = s.pop()!;
    const ep = s.pop()!;
    const castling = s.pop()!;
    const captured = s.pop()!;
    const m = s.pop()!;
    const b = this.b;
    this.side ^= 8;
    const me = this.side;
    const from = mFrom(m);
    const to = mTo(m);
    const flag = mFlag(m);
    const piece = mPromo(m) ? PAWN | me : b[to];
    b[from] = piece;
    if (flag === F_EP) {
      b[to] = 0;
      b[to + (me === WHITE ? -16 : 16)] = captured;
    } else b[to] = captured;
    if (flag === F_CASTLE) {
      if (to === from + 2) {
        b[from + 3] = b[from + 1];
        b[from + 1] = 0;
      } else {
        b[from - 4] = b[from - 1];
        b[from - 1] = 0;
      }
    }
    if ((piece & 7) === KING) this.king[me >> 3] = from;
    this.castling = castling;
    this.ep = ep;
    this.half = half;
  }

  /** Fully legal moves. */
  legal(caps = false): number[] {
    const out: number[] = [];
    for (const m of this.gen(caps)) {
      this.make(m);
      if (!this.inCheck(this.side ^ 8)) out.push(m);
      this.unmake();
    }
    return out;
  }

  perft(depth: number): number {
    if (depth === 0) return 1;
    let n = 0;
    for (const m of this.gen()) {
      this.make(m);
      if (!this.inCheck(this.side ^ 8)) n += depth === 1 ? 1 : this.perft(depth - 1);
      this.unmake();
    }
    return n;
  }
}
