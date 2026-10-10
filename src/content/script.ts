import { ITEMS } from './items';
import { EN_NUM, NE_NUM, neDigits } from './numbers';
import { EN_LETTERS, NE_VOWELS, NE_CONSONANTS } from './letters';
import { S, SPOKEN_S, PHRASES, wantText } from './strings';

/**
 * The Voice Studio's script: every line the games can play from a recording, in the
 * order a family would record them (words first: they matter most).
 * Keys match what the games ask for, so a new recording is heard everywhere at once.
 * When a game gets a new spoken line, add it here too.
 */
export type RecLang = 'en' | 'ne';
export type Group = 'words' | 'numbers' | 'sentences' | 'letters';

export interface Line {
  /** Clip key without the language, e.g. 'gai', 'num3', '_where', 'want-3', 'letter-क'. */
  key: string;
  group: Group;
  /** What to say. */
  text: string;
  /** Helper shown under it: meaning, romanization, or how it is used. */
  hint?: string;
  /** Item picture to show, if any. */
  art?: string;
}

export const GROUPS: Array<{ id: Group; en: string; ne: string }> = [
  { id: 'words', en: 'Words', ne: 'शब्द' },
  { id: 'numbers', en: 'Numbers', ne: 'अंक' },
  { id: 'sentences', en: 'Sentences', ne: 'वाक्य' },
  { id: 'letters', en: 'Letters', ne: 'अक्षर' },
];

const USE_HINT: Record<(typeof SPOKEN_S)[number], string> = {
  hello: 'Home: when the child taps Habre',
  match: 'Said when Listen & Find opens',
  memory: 'Said when Find the Pair opens',
  count: 'Said when counting opens',
  smash: 'Said when Smash & See opens',
  xylo: 'Said when the xylophone opens',
  tapBasket: 'Counting: when the plate is still empty',
  plateFull: 'Counting: when no more fit',
  countTogether: 'Counting: before counting along',
};

export function scriptFor(l: RecLang): Line[] {
  const out: Line[] = [];

  for (const it of ITEMS) {
    if (l === 'ne') out.push({ key: it.id, group: 'words', text: it.ne, hint: `${it.roman} · ${it.en}`, art: it.id });
    else if (!it.ownName) out.push({ key: it.id, group: 'words', text: it.en, hint: it.ne, art: it.id });
  }

  for (let n = 0; n <= 10; n++) {
    out.push(
      l === 'ne'
        ? { key: `num${n}`, group: 'numbers', text: NE_NUM[n], hint: `${neDigits(n)} · ${n} · ${EN_NUM[n]}` }
        : { key: `num${n}`, group: 'numbers', text: EN_NUM[n], hint: `${n} · ${NE_NUM[n]}` },
    );
  }

  const ex = ITEMS[0];
  out.push(
    l === 'ne'
      ? { key: '_where', group: 'sentences', text: PHRASES.where.ne, hint: `Joined after a word: "${ex.ne} कहाँ छ?"` }
      : { key: '_where', group: 'sentences', text: PHRASES.where.en, hint: `Say "Where is the", stopping before the word: "Where is the… ${ex.en}?"` },
    { key: '_welldone', group: 'sentences', text: PHRASES.welldone[l], hint: 'After a right answer' },
    { key: '_look', group: 'sentences', text: PHRASES.look[l], hint: 'Find the Pair: when the cards are shown' },
    { key: '_allfound', group: 'sentences', text: PHRASES.allfound[l], hint: 'Find the Pair: when every pair is found' },
  );
  for (const k of SPOKEN_S) out.push({ key: `s-${k}`, group: 'sentences', text: S[k][l], hint: USE_HINT[k] });
  for (let n = 1; n <= 10; n++) {
    out.push({ key: `want-${n}`, group: 'sentences', text: wantText(n)[l], hint: n <= 3 ? 'Counting: level 1 and up' : n <= 5 ? 'Counting: level 2 and up' : 'Counting: level 3' });
  }

  if (l === 'ne') {
    for (const L of [...NE_VOWELS, ...NE_CONSONANTS]) {
      out.push({
        key: `letter-${L.ch}`,
        group: 'letters',
        text: L.word ? `${L.ch}, ${L.word}को ${L.ch}` : L.ch,
        hint: L.word ? `The way children chant it${L.gloss ? ` · ${L.word} = ${L.gloss}` : ''}` : 'Just the letter',
        art: L.art,
      });
    }
  } else {
    for (const L of EN_LETTERS) {
      out.push({
        key: `letter-${L.ch}`,
        group: 'letters',
        text: L.word ? `${L.ch}! ${L.ch} is for ${L.word}.` : `${L.ch}!`,
        hint: L.gloss ? `${L.word} = ${L.gloss}` : undefined,
        art: L.art,
      });
    }
  }
  return out;
}
