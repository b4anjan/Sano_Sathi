import { ITEMS } from './items';
import { EN_NUM, NE_NUM, neDigits } from './numbers';
import { EN_LETTERS, NE_VOWELS, NE_CONSONANTS, glossItem } from './letters';
import { S, SPOKEN_S, PHRASES, wantText } from './strings';
import { COLORS, SHAPES } from './shapes';
import { BUDDIES, BUDDY_IDS, GREETINGS } from './buddies';
import { CH, CH_HINT, PIECE_NAMES, type ChLine } from './chess';
import { MAX_NUM, numSay, spokenLines } from './spoken';

/** Scene words in My Village that are not picture items (clip key w-<id>). Kept here so the
 *  studio and the village agree; the village imports this list. */
export const SCENE_WORDS = {
  house: { en: 'house', ne: 'घर' },
  himal: { en: 'mountains', ne: 'हिमाल' },
  cloud: { en: 'cloud', ne: 'बादल' },
  pond: { en: 'pond', ne: 'पोखरी' },
  star: { en: 'star', ne: 'तारा' },
};

/**
 * The Voice Studio's script: every line the games can play from a recording, in the
 * order a family would record them (words first: they matter most).
 * Keys match what the games ask for, so a new recording is heard everywhere at once.
 * When a game gets a new spoken line, add it here too.
 */
export type RecLang = 'en' | 'ne';
export type Group = 'words' | 'numbers' | 'sentences' | 'colors' | 'buddies' | 'letters';

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
  /** Read it letter by letter ("B" as "bee"), for the AI voice. */
  sayAs?: 'characters';
}

export const GROUPS: Array<{ id: Group; en: string; ne: string }> = [
  { id: 'words', en: 'Words', ne: 'शब्द' },
  { id: 'numbers', en: 'Numbers', ne: 'अंक' },
  { id: 'sentences', en: 'Sentences', ne: 'वाक्य' },
  { id: 'colors', en: 'Colors & shapes', ne: 'रङ र आकार' },
  { id: 'buddies', en: 'Buddies', ne: 'साथीहरू' },
  { id: 'letters', en: 'Letters', ne: 'अक्षर' },
];

const USE_HINT: Record<(typeof SPOKEN_S)[number], string> = {
  match: 'Said when Listen & Find opens',
  memory: 'Said when Find the Pair opens',
  count: 'Said when counting opens',
  smash: 'Said when Smash & See opens',
  xylo: 'Said when the xylophone opens',
  letters: 'Said when Letters opens',
  numbers: 'Said when Numbers opens',
  math: 'Said when Math Quest opens',
  shop: 'Said when the Rupee Shop opens',
  shapes: 'Said when Shapes & Colors opens',
  bubbles: 'Said when Bubble Pop opens',
  paint: 'Said when Felt Paint opens',
  village: 'Said when My Village opens',
  stickers: 'Said when the sticker book opens',
  copy: 'Said when Copy Me opens',
  chess: 'Said when Chess opens',
  stickerHow: 'Sticker book: how to earn stickers (tap the line)',
  tapBasket: 'Counting: when the plate is still empty',
  plateFull: 'Counting: when no more fit',
  countTogether: 'Counting: before counting along',
  tryAgain: 'After a wrong answer (math, shop)',
};

export function scriptFor(l: RecLang): Line[] {
  const out: Line[] = [];

  for (const it of ITEMS) {
    if (l === 'ne') out.push({ key: it.id, group: 'words', text: it.ne, hint: `${it.roman} · ${it.en}`, art: it.id });
    else if (!it.ownName) out.push({ key: it.id, group: 'words', text: it.en, hint: it.ne, art: it.id });
  }

  for (const [id, w] of Object.entries(SCENE_WORDS)) {
    out.push({ key: `w-${id}`, group: 'words', text: w[l], hint: `My Village · ${l === 'ne' ? w.en : w.ne}` });
  }

  for (let n = 0; n <= MAX_NUM; n++) {
    // Up to 20 as words; above that as digits (Math Quest and the shop need them; the
    // voices read digits as proper number words).
    out.push(
      l === 'ne'
        ? { key: `num${n}`, group: 'numbers', text: numSay(n, 'ne'), hint: n <= 20 ? `${neDigits(n)} · ${n} · ${EN_NUM[n]}` : `${n}` }
        : { key: `num${n}`, group: 'numbers', text: numSay(n, 'en'), hint: n <= 20 ? `${n} · ${NE_NUM[n]}` : neDigits(n) },
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
    { key: '_pop', group: 'sentences', text: PHRASES.pop[l], hint: l === 'ne' ? 'Bubble Pop: said after the letter, "B फोड!"' : 'Bubble Pop: said before the letter, "Pop… B!"' },
    { key: '_night', group: 'sentences', text: PHRASES.night[l], hint: 'My Village: when the sun is tapped' },
    { key: '_watch', group: 'sentences', text: PHRASES.watch[l], hint: 'Copy Me: before the lights play' },
    { key: '_yourTurn', group: 'sentences', text: PHRASES.yourTurn[l], hint: 'Copy Me: when the child should copy' },
    { key: '_levelUp', group: 'sentences', text: PHRASES.levelUp[l], hint: 'Copy Me: when a level is finished' },
    { key: '_oops', group: 'sentences', text: PHRASES.oops[l], hint: 'Copy Me: after a wrong block' },
    { key: '_whereGo', group: 'sentences', text: PHRASES.whereGo[l], hint: 'Shapes & Colors: after naming the shape' },
    { key: '_otherBasket', group: 'sentences', text: PHRASES.otherBasket[l], hint: 'Shapes & Colors: wrong basket' },
  );
  for (const [k, g] of Object.entries(GREETINGS)) {
    out.push({ key: `_${k}`, group: 'sentences', text: g[l], hint: k === 'late' ? 'Home: after 8 in the evening' : `Home: greeting in the ${k}` });
  }
  for (const k of SPOKEN_S) out.push({ key: `s-${k}`, group: 'sentences', text: S[k][l], hint: USE_HINT[k] });
  for (const k of Object.keys(CH) as ChLine[]) out.push({ key: `ch-${k}`, group: 'sentences', text: CH[k][l], hint: CH_HINT[k] });
  for (const [key, text, hint] of spokenLines(l)) out.push({ key, group: 'sentences', text, hint });
  for (let n = 1; n <= 10; n++) {
    out.push({ key: `want-${n}`, group: 'sentences', text: wantText(n)[l], hint: n <= 3 ? 'Counting: level 1 and up' : n <= 5 ? 'Counting: level 2 and up' : 'Counting: level 3' });
  }

  for (const c of COLORS) {
    out.push({ key: `color-${c.en.replace(/\s+/g, '-')}`, group: 'colors', text: c[l], hint: `Colour · ${l === 'ne' ? c.en : c.ne}` });
  }
  for (const sh of SHAPES) {
    out.push({ key: `shape-${sh.id}`, group: 'colors', text: sh[l], hint: `Shape · ${l === 'ne' ? sh.en : sh.ne}` });
  }
  for (const [id, nm] of Object.entries(PIECE_NAMES)) {
    out.push({ key: `pc-${id}`, group: 'words', text: nm[l], hint: `Chess piece · ${l === 'ne' ? nm.en : nm.ne}` });
  }

  for (const id of BUDDY_IDS) {
    const b = BUDDIES[id];
    const who = `${b.name.en} (${b.voiceLabel.toLowerCase()})`;
    out.push({ key: `m-${id}-hello`, group: 'buddies', text: b.hello[l], hint: `${who} · hello`, art: b.art });
    for (const r of [...b.reactions, b.tickle]) {
      out.push({ key: `m-${id}-${r.id}`, group: 'buddies', text: r.say[l], hint: `${who} · when tapped${r.id === 'tickle' ? ' fast' : ''}`, art: b.art });
    }
  }

  // A letter's word in the other language ("A is for apple" → स्याउ), when no picture word
  // already has a clip for it.
  const glossFrom = l === 'ne' ? EN_LETTERS : [...NE_VOWELS, ...NE_CONSONANTS];
  for (const L of glossFrom) {
    if (!L.gloss || glossItem(L, l)) continue;
    out.push({ key: `gl-${L.ch}`, group: 'words', text: L.gloss, hint: `Letters: the word for ${L.ch} (${L.word}) in ${l === 'ne' ? 'Nepali' : 'English'}` });
  }
  if (l === 'en') {
    for (const L of EN_LETTERS) out.push({ key: `ln-${L.ch}`, group: 'letters', text: L.ch, hint: 'Bubble Pop: just the letter name', sayAs: 'characters' });
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
