import { Chess, type Color, type Move, type PieceSymbol, type Square } from 'chess.js';
import { VALUE } from './ai';

/* Kept apart from ai.ts so the background thinker doesn't carry chess.js with it. */

/**
 * "Teach me": would this move leave the moved piece where it can simply be taken?
 * True when the destination is attacked and either undefended or attacked by something cheaper,
 * unless the move itself wins at least as much as it risks.
 */
export function leavesHanging(fen: string, from: Square, to: Square, promotion?: PieceSymbol): boolean {
  const c = new Chess(fen);
  let m: Move;
  try {
    m = c.move({ from, to, promotion });
  } catch {
    return false;
  }
  if (m.piece === 'k') return false;
  const me: Color = m.color;
  const them: Color = me === 'w' ? 'b' : 'w';
  const mine = VALUE[m.promotion ?? m.piece];
  const won = m.captured ? VALUE[m.captured] : 0;
  const attackers = c.attackers(to, them);
  if (!attackers.length) return false;
  if (won >= mine) return false;
  const defenders = c.attackers(to, me);
  if (!defenders.length) return true;
  const cheapest = Math.min(...attackers.map((sq) => VALUE[c.get(sq)!.type] || 10000));
  return cheapest + won < mine;
}
