import { CATEGORIES, ITEMS, type Item } from '../../content/items';
import { shuffle } from '../../core/progress';
import type { MemoryKind } from '../../core/settings';

export type Face = 'pic' | 'word' | 'ne' | 'en';
export interface MCard {
  uid: number;
  item: Item;
  face: Face;
}

/**
 * A memory deck: `pairs` items from one topic (so pictures share a theme), two cards each.
 * - same:   picture + picture (youngest)
 * - word:   picture + its word in the chosen language (early readers)
 * - bridge: Nepali word + English word (bilingual readers)
 * Pure function, unit-tested in deck.test.ts.
 */
export function buildDeck(pairs: number, kind: MemoryKind, rand = Math.random): MCard[] {
  const topics = CATEGORIES.filter((c) => ITEMS.filter((i) => i.cat === c.id).length >= pairs);
  const topic = topics[Math.floor(rand() * topics.length)];
  const pool = topic ? ITEMS.filter((i) => i.cat === topic.id) : ITEMS;
  const chosen = shuffle(pool, rand).slice(0, pairs);
  const faces: [Face, Face] = kind === 'same' ? ['pic', 'pic'] : kind === 'word' ? ['pic', 'word'] : ['ne', 'en'];
  let uid = 0;
  const cards = chosen.flatMap((item) => faces.map((face) => ({ uid: uid++, item, face })));
  return shuffle(cards, rand);
}

export function columnsFor(cards: number): number {
  return cards <= 4 ? 2 : cards <= 6 ? 3 : 4;
}
