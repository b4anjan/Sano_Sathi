import { describe, it, expect } from 'vitest';
import { scriptFor } from './script';
import { ITEMS } from './items';
import { respellForEnglish } from './pronounce';

describe('Voice Studio script', () => {
  for (const l of ['ne', 'en'] as const) {
    it(`has unique, file-safe keys (${l})`, () => {
      const keys = scriptFor(l).map((x) => x.key);
      expect(new Set(keys).size).toBe(keys.length);
      for (const k of keys) expect(k).not.toMatch(/[\\/:*?"<>|\s]/);
    });
  }

  it('lists every word in Nepali, words first', () => {
    const ne = scriptFor('ne');
    expect(ne[0].group).toBe('words');
    for (const it of ITEMS) expect(ne.some((x) => x.key === it.id && x.text === it.ne)).toBe(true);
  });

  it('skips English recordings for words whose English name is the Nepali name', () => {
    const en = scriptFor('en').map((x) => x.key);
    for (const it of ITEMS) expect(en.includes(it.id)).toBe(!it.ownName);
  });

  it('covers the keys the games ask for', () => {
    const ne = new Set(scriptFor('ne').map((x) => x.key));
    for (const k of ['_where', '_welldone', '_look', '_allfound', '_pop', '_night', '_morning', '_late', 's-match', 's-math', 's-tryAgain', 'num0', 'num20', 'want-1', 'want-10', 'letter-क', 'letter-अ', 'color-red', 'color-sky-blue', 'shape-star', 'w-house', 'm-cat-hello', 'm-puppy-tickle', 'm-panda-munch'])
      expect(ne.has(k), k).toBe(true);
    const en = new Set(scriptFor('en').map((x) => x.key));
    for (const k of ['_where', 'letter-A', 'letter-Z', 'num7']) expect(en.has(k), k).toBe(true);
  });
});

describe('English respellings', () => {
  it('respells Nepali names for the English voice, keeping other words', () => {
    expect(respellForEnglish('Where is the dhaka topi?')).toBe('Where is the dhah-kah toh-pee?');
    expect(respellForEnglish("Hi! I'm Habre.")).toBe("Hi! I'm hah-bray.");
    expect(respellForEnglish('D is for doko.')).toBe('D is for doh-koh.');
    expect(respellForEnglish('Where is the cow?')).toBe('Where is the cow?');
  });
});
