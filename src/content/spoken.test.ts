import { describe, expect, it } from 'vitest';
import { scriptFor } from './script';
import { ITEMS } from './items';
import { EN_LETTERS, NE_CONSONANTS, NE_VOWELS, glossItem, letterOnlyKey } from './letters';
import { CHEERS, SORT_LINES, TRY_AGAIN, pickFresh } from './spoken';
import { COLORS, SHAPES } from './shapes';
import { GOODS, answerSaid, mathSaid, shopAlmostSaid, shopAskSaid, shopChangeIsSaid, shopChangeSaid, shopThanksSaid, type Said } from './spoken';
import { makeProblem, type Op } from '../modes/math/gen';

/** Every key the voice script records, per language (items' English name may reuse the Nepali clip). */
const keys = {
  en: new Set([...scriptFor('en').map((l) => l.key), ...ITEMS.filter((i) => i.ownName).map((i) => i.id)]),
  ne: new Set(scriptFor('ne').map((l) => l.key)),
};
const missing = (s: Said) => [...s.en.filter((g) => !keys.en.has(g.key)).map((g) => `en/${g.key}`), ...s.ne.filter((g) => !keys.ne.has(g.key)).map((g) => `ne/${g.key}`)];

let seed = 1;
const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);

describe('sentences joined from recorded pieces', () => {
  it('every Math Quest question and answer has a recording for every piece', () => {
    for (const op of ['add', 'sub', 'mul', 'missing', 'compare'] as Op[]) {
      for (const level of [1, 2, 3] as const) {
        for (let i = 0; i < 60; i++) {
          const p = makeProblem(op, level, rnd);
          expect(missing(mathSaid(p.spoken)), `${op} L${level} ${p.say.en}`).toEqual([]);
          expect(missing(answerSaid(p.answer))).toEqual([]);
        }
      }
    }
  });

  it('every Rupee Shop sentence has a recording for every piece', () => {
    for (const id of GOODS) {
      for (const p of [1, 7, 23, 49, 99]) {
        expect(missing(shopAskSaid(id, p))).toEqual([]);
        expect(missing(shopChangeSaid(id, p, 100))).toEqual([]);
      }
      expect(missing(shopThanksSaid(id))).toEqual([]);
    }
    expect(missing(shopAlmostSaid(37, 50))).toEqual([]);
    expect(missing(shopChangeIsSaid(63))).toEqual([]);
  });

  it("every letter's word in the other language has a recording", () => {
    for (const L of EN_LETTERS) if (L.gloss) expect(keys.ne.has(glossItem(L, 'ne') ?? `gl-${L.ch}`), L.ch).toBe(true);
    for (const L of [...NE_VOWELS, ...NE_CONSONANTS]) if (L.gloss) expect(keys.en.has(glossItem(L, 'en') ?? `gl-${L.ch}`), L.ch).toBe(true);
    for (const L of EN_LETTERS) expect(keys.en.has(`ln-${L.ch}`)).toBe(true);
  });

  it('records the numbers 0 to 100 in both languages', () => {
    for (let n = 0; n <= 100; n++) {
      expect(keys.en.has(`num${n}`)).toBe(true);
      expect(keys.ne.has(`num${n}`)).toBe(true);
    }
  });
});

describe('praise, encouragement and letters on their own', () => {
  it('every cheer and try-again line is recorded in both languages, with distinct keys', () => {
    const all = [...CHEERS, ...TRY_AGAIN, ...Object.values(SORT_LINES)];
    expect(new Set(all.map((x) => x.key)).size).toBe(all.length);
    for (const x of all) {
      expect(keys.en.has(x.key), `en/${x.key}`).toBe(true);
      expect(keys.ne.has(x.key), `ne/${x.key}`).toBe(true);
    }
  });

  it('Shapes & Colors can say every colour and shape before its praise', () => {
    for (const c of COLORS) for (const l of ['en', 'ne'] as const) expect(keys[l].has(`color-${c.en.replace(/\s+/g, '-')}`)).toBe(true);
    for (const sh of SHAPES) for (const l of ['en', 'ne'] as const) expect(keys[l].has(`shape-${sh.id}`)).toBe(true);
  });

  it('never picks the same line twice in a row', () => {
    const last = { current: -1 };
    let prev = '';
    for (let i = 0; i < 200; i++) {
      const x = pickFresh(CHEERS, last).key;
      expect(x).not.toBe(prev);
      prev = x;
    }
  });

  it('every letter has a recording of just the letter (Bubble Pop)', () => {
    for (const L of EN_LETTERS) expect(keys.en.has(letterOnlyKey(L, 'en')), L.ch).toBe(true);
    for (const L of [...NE_VOWELS, ...NE_CONSONANTS]) {
      expect(keys.ne.has(letterOnlyKey(L, 'ne')), L.ch).toBe(true);
      const line = scriptFor('ne').find((x) => x.key === letterOnlyKey(L, 'ne'))!;
      expect(line.text, 'no chant, just the letter').toBe(L.ch);
    }
  });
});
