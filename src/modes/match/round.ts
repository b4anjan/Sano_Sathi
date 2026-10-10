import type { Item } from '../../content/items';
import { pickWeighted, shuffle, type ProgressLang } from '../../core/progress';

export interface Round {
  target: Item;
  cards: Item[];
  key: number;
}

/**
 * Build one Listen & Find round: a target the child is still learning (weighted by past
 * answers in the active language or languages) plus distinct distractors, shuffled.
 * Pure function, unit-tested in round.test.ts.
 */
export function buildRound(pool: Item[], n: number, langs: ProgressLang[], avoidId?: string, rand = Math.random): Round {
  const size = Math.max(2, Math.min(n, pool.length));
  const target = pickWeighted(pool, langs, avoidId, rand);
  const others = shuffle(
    pool.filter((i) => i.id !== target.id),
    rand,
  ).slice(0, size - 1);
  return { target, cards: shuffle([target, ...others], rand), key: Math.floor(rand() * 1e9) };
}
