import { describe, expect, it } from 'vitest';
import { Chess } from 'chess.js';
import { bookMove, pickMove } from './ai';
import { leavesHanging } from './teach';

/** Repeatable "random" numbers for tests. */
function seeded(seed: number) {
  let s = seed >>> 0;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 2 ** 32);
}

const POSITIONS = [
  'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
  'r3k2r/p1ppqpb1/bn2pnp1/3PN3/1p2P3/2N2Q1p/PPPBBPPP/R3K2R w KQkq - 0 1',
  'r3k2r/Pppp1ppp/1b3nbN/nP6/BBP1P3/q4N2/Pp1P2PP/R2Q1RK1 w kq - 0 1',
  '8/2p5/3p4/KP5r/1R3p1k/8/4P1P1/8 w - - 0 1',
  'rnbqkbnr/ppp1p1pp/8/3pPp2/8/8/PPPP1PPP/RNBQKBNR w KQkq f6 0 3',
];

describe('buddy chess brain', () => {
  it('always plays a legal move, at every level', () => {
    for (const fen of POSITIONS) {
      for (let lv = 1; lv <= 5; lv++) {
        const m = pickMove(fen, lv, seeded(lv));
        expect(m).not.toBeNull();
        const c = new Chess(fen);
        expect(() => c.move(m!)).not.toThrow();
      }
    }
  });

  it('takes a free queen from level 3 up', () => {
    const fen = 'rnb1kbnr/pppp1ppp/8/3q4/8/2N5/PPPP1PPP/R1BQKBNR w KQkq - 0 4';
    for (let lv = 3; lv <= 5; lv++) {
      for (let seed = 1; seed <= 4; seed++) expect(pickMove(fen, lv, seeded(seed))).toMatchObject({ from: 'c3', to: 'd5' });
    }
  });

  it('finds checkmate in one from level 2 up', () => {
    const backRank = '6k1/5ppp/8/8/8/8/5PPP/R5K1 w - - 0 1';
    const scholar = 'r1bqkb1r/pppp1ppp/2n2n2/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR w KQkq - 4 4';
    for (let lv = 2; lv <= 5; lv++) {
      expect(pickMove(backRank, lv, seeded(lv))).toMatchObject({ from: 'a1', to: 'a8' });
      expect(pickMove(scholar, lv, seeded(lv))).toMatchObject({ from: 'h5', to: 'f7' });
    }
  });

  it('stops a checkmate in one from level 3 up', () => {
    const fen = 'r1bqkbnr/pppp1ppp/2n5/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR b KQkq - 3 3';
    for (let lv = 3; lv <= 5; lv++) {
      const c = new Chess(fen);
      c.move(pickMove(fen, lv, seeded(lv))!);
      const mates = c.moves({ verbose: true }).filter((m) => {
        c.move(m);
        const mate = c.isCheckmate();
        c.undo();
        return mate;
      });
      expect(mates).toEqual([]);
    }
  });

  it('promotes a pawn to a queen when it can', () => {
    const fen = '8/P6k/8/8/8/8/8/K7 w - - 0 1';
    expect(pickMove(fen, 4, seeded(1))).toMatchObject({ from: 'a7', to: 'a8', promotion: 'q' });
  });

  it('opens with well-known moves', () => {
    expect(['e2e4', 'd2d4', 'g1f3', 'c2c4']).toContain(bookMove([], seeded(3)));
    expect(['e7e5', 'c7c5', 'e7e6', 'c7c6']).toContain(bookMove(['e2e4'], seeded(5)));
    expect(bookMove(['a2a3'])).toBeNull();
  });

  it('a stronger level beats the easiest one', () => {
    let wins = 0;
    for (let game = 0; game < 2; game++) {
      const c = new Chess();
      const rnd = seeded(100 + game);
      while (!c.isGameOver() && c.history().length < 160) {
        const strong = c.turn() === (game === 0 ? 'w' : 'b');
        c.move(pickMove(c.fen(), strong ? 4 : 1, rnd)!);
      }
      const strongColor = game === 0 ? 'w' : 'b';
      if (c.isCheckmate() && c.turn() !== strongColor) wins++;
    }
    expect(wins).toBe(2);
  }, 60000);

  it('warns when a move leaves a piece where it can simply be taken', () => {
    // Knight to d5, attacked by the e6 pawn and not defended: hanging.
    expect(leavesHanging('rnbqkbnr/pppp1ppp/4p3/8/8/2N5/PPPPPPPP/R1BQKBNR w KQkq - 0 2', 'c3', 'd5')).toBe(true);
    // Knight to d5, attacked by the f6 knight and not defended: hanging.
    expect(leavesHanging('rnbqkb1r/pppppppp/5n2/8/8/2N5/PPPPPPPP/R1BQKBNR w KQkq - 2 2', 'c3', 'd5')).toBe(true);
    // Queen to h5, attacked by the g6 pawn: hanging.
    expect(leavesHanging('rnbqkbnr/pppppp1p/6p1/8/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2', 'd1', 'h5')).toBe(true);
    // Knight to d5 where nothing attacks it: safe.
    expect(leavesHanging('rnbqkbnr/pppp1ppp/8/4p3/8/2N5/PPPPPPPP/R1BQKBNR w KQkq - 0 2', 'c3', 'd5')).toBe(false);
    // Pawn takes pawn (an even trade): fine.
    expect(leavesHanging('rnbqkbnr/pppp1ppp/8/4p3/3P4/8/PPP1PPPP/RNBQKBNR w KQkq - 0 2', 'd4', 'e5')).toBe(false);
    // Knight to e5 defended by the d4 pawn, attacked only by the black queen: fine.
    expect(leavesHanging('rnbqkb1r/pppp1ppp/5n2/8/3P4/5N2/PPP1PPPP/RNBQKB1R w KQkq - 0 3', 'f3', 'e5')).toBe(false);
  });
});
