import type { Bi } from './strings';
import { EN_NUM, NE_NUM, NE_COUNTED, neDigits } from './numbers';
import { itemById } from './items';

/**
 * Sentences that change with the game (Math Quest, Rupee Shop, Count with me) are spoken
 * from short recorded pieces joined together, so every word is the buddy's natural voice:
 * "seven" + "plus" + "five" + "makes?". Each piece is one line in the voice script
 * (src/content/script.ts), so the AI voice job makes it like any other line.
 *
 * Numbers up to 20 are written as words; bigger ones as digits, which the voices read as
 * proper number words ("चवालीस", "forty-four").
 */
export interface Seg {
  key: string;
  text: string;
}
/** What to say, in each language (the pieces may come in a different order). */
export interface Said {
  en: Seg[];
  ne: Seg[];
}

export const MAX_NUM = 100;
export const numSay = (n: number, l: 'en' | 'ne'): string => (n <= 20 ? (l === 'en' ? EN_NUM : NE_NUM)[n] : l === 'en' ? String(n) : neDigits(n));
const num = (n: number, l: 'en' | 'ne'): Seg => ({ key: `num${n}`, text: numSay(n, l) });

/** Pieces. A piece used in only one language leaves the other empty. */
export const FRAG = {
  'mq-plus': { en: 'plus', ne: 'जोड' },
  'mq-minus': { en: 'take away', ne: 'घटाउ' },
  'mq-times': { en: 'times', ne: 'गुणा' },
  'mq-makes': { en: 'makes?', ne: 'कति हुन्छ?' },
  'mq-leaves': { en: 'leaves?', ne: '' },
  'mq-plus-what-makes': { en: 'plus what makes', ne: '' },
  'mq-what-plus': { en: 'What plus', ne: '' },
  'mq-makes-then': { en: 'makes', ne: '' },
  'mq-minus-what-leaves': { en: 'take away what leaves', ne: '' },
  'mq-what-times': { en: 'What times', ne: '' },
  'mq-is': { en: 'Is', ne: '' },
  'mq-compare': { en: 'bigger than, smaller than, or the same as', ne: 'भन्दा ठूलो, सानो कि बराबर?' },
  'mq-ma-kati-jodda': { en: '', ne: 'मा कति जोड्दा' },
  'mq-katima': { en: '', ne: 'कतिमा' },
  'mq-jodda': { en: '', ne: 'जोड्दा' },
  'mq-bata-kati-ghataunda': { en: '', ne: 'बाट कति घटाउँदा' },
  'mq-katilai': { en: '', ne: 'कतिलाई' },
  'mq-le-guna-garda': { en: '', ne: 'ले गुणा गर्दा' },
  'mq-hunchha': { en: '', ne: 'हुन्छ?' },
  'mq-answer-is': { en: 'The answer is', ne: 'उत्तर' },
  'mq-ho': { en: '', ne: 'हो।' },
  'mq-smaller': { en: 'smaller.', ne: 'सानो' },
  'mq-bigger': { en: 'bigger.', ne: 'ठूलो' },
  'mq-same': { en: 'the same.', ne: 'बराबर' },
  'shop-rupees-can-you-pay': { en: 'rupees. Can you pay?', ne: 'रुपैयाँ। तिर्न सक्छौ?' },
  'shop-rupees-you-give': { en: 'rupees. You give', ne: '' },
  'shop-how-much-change': { en: 'How much change?', ne: '' },
  'shop-rupaiyako-timile': { en: '', ne: 'रुपैयाँको। तिमीले' },
  'shop-diyau-kati-phirta': { en: '', ne: 'दियौ। कति फिर्ता?' },
  'shop-almost-count-from': { en: 'Almost! Count up from', ne: 'झन्डै!' },
  'shop-to': { en: 'to', ne: '' },
  'shop-dekhi': { en: '', ne: 'देखि' },
  'shop-samma-gana': { en: '', ne: 'सम्म गन।' },
  'shop-change-is': { en: 'The change is', ne: 'फिर्ता' },
  'shop-rupees': { en: 'rupees.', ne: 'रुपैयाँ।' },
  'shop-thanks-here-is': { en: 'Thank you! Here is your', ne: 'धन्यवाद! यो लेऊ तिम्रो' },
  'shop-too-much': { en: 'Oops, too much! Take some back.', ne: 'ओहो, धेरै भयो! अलिकति फिर्ता लेऊ।' },
} satisfies Record<string, Bi>;
type FragKey = keyof typeof FRAG;
const fr = (k: FragKey, l: 'en' | 'ne'): Seg => ({ key: k, text: FRAG[k][l] });

/** The Rupee Shop's goods (also the per-item "The mango costs" pieces). */
export const GOODS = ['aanp', 'kera', 'suntala', 'golbheda', 'mula', 'makai', 'syau', 'chappal', 'chhata', 'changa', 'doko', 'gagri', 'dhaka-topi', 'madal'];
export const costsLine = (id: string): Bi => {
  const it = itemById(id)!;
  return { en: `The ${it.en} costs`, ne: `${it.ne}को मूल्य` };
};
const item = (id: string, l: 'en' | 'ne'): Seg => ({ key: id, text: itemById(id)![l] });
const costs = (id: string, l: 'en' | 'ne'): Seg => ({ key: `shop-costs-${id}`, text: costsLine(id)[l] });

/* ------------------------------ Math Quest ------------------------------ */
export type MathSay =
  | { kind: 'add' | 'sub' | 'mul'; a: number; b: number }
  | { kind: 'plusWhat'; a: number; c: number }
  | { kind: 'whatPlus'; b: number; c: number }
  | { kind: 'minusWhat'; a: number; c: number }
  | { kind: 'whatTimes'; t: number; c: number }
  | { kind: 'compare'; left: number[]; right: number };

export function mathSaid(m: MathSay): Said {
  const both = (f: (l: 'en' | 'ne') => Seg[]): Said => ({ en: f('en'), ne: f('ne') });
  switch (m.kind) {
    case 'add':
      return both((l) => [num(m.a, l), fr('mq-plus', l), num(m.b, l), fr('mq-makes', l)]);
    case 'sub':
      return { en: [num(m.a, 'en'), fr('mq-minus', 'en'), num(m.b, 'en'), fr('mq-leaves', 'en')], ne: [num(m.a, 'ne'), fr('mq-minus', 'ne'), num(m.b, 'ne'), fr('mq-makes', 'ne')] };
    case 'mul':
      return both((l) => [num(m.a, l), fr('mq-times', l), num(m.b, l), fr('mq-makes', l)]);
    case 'plusWhat':
      return { en: [num(m.a, 'en'), fr('mq-plus-what-makes', 'en'), num(m.c, 'en')], ne: [num(m.a, 'ne'), fr('mq-ma-kati-jodda', 'ne'), num(m.c, 'ne'), fr('mq-hunchha', 'ne')] };
    case 'whatPlus':
      return { en: [fr('mq-what-plus', 'en'), num(m.b, 'en'), fr('mq-makes-then', 'en'), num(m.c, 'en')], ne: [fr('mq-katima', 'ne'), num(m.b, 'ne'), fr('mq-jodda', 'ne'), num(m.c, 'ne'), fr('mq-hunchha', 'ne')] };
    case 'minusWhat':
      return { en: [num(m.a, 'en'), fr('mq-minus-what-leaves', 'en'), num(m.c, 'en')], ne: [num(m.a, 'ne'), fr('mq-bata-kati-ghataunda', 'ne'), num(m.c, 'ne'), fr('mq-hunchha', 'ne')] };
    case 'whatTimes':
      return { en: [fr('mq-what-times', 'en'), num(m.t, 'en'), fr('mq-makes-then', 'en'), num(m.c, 'en')], ne: [fr('mq-katilai', 'ne'), num(m.t, 'ne'), fr('mq-le-guna-garda', 'ne'), num(m.c, 'ne'), fr('mq-hunchha', 'ne')] };
    case 'compare': {
      const left = (l: 'en' | 'ne'): Seg[] => (m.left.length === 2 ? [num(m.left[0], l), fr('mq-plus', l), num(m.left[1], l)] : [num(m.left[0], l)]);
      return { en: [fr('mq-is', 'en'), ...left('en'), fr('mq-compare', 'en'), num(m.right, 'en')], ne: [...left('ne'), num(m.right, 'ne'), fr('mq-compare', 'ne')] };
    }
  }
}

/** "The answer is 12." / "उत्तर बाह्र हो।" (or bigger / smaller / the same). */
export function answerSaid(ans: number | '<' | '>' | '='): Said {
  const word = (l: 'en' | 'ne'): Seg =>
    typeof ans === 'number' ? num(ans, l) : fr(ans === '<' ? 'mq-smaller' : ans === '>' ? 'mq-bigger' : 'mq-same', l);
  return { en: [fr('mq-answer-is', 'en'), word('en')], ne: [fr('mq-answer-is', 'ne'), word('ne'), fr('mq-ho', 'ne')] };
}

/** End of a Math Quest round: one line per score. */
export const mathDoneLine = (f: number): Bi => ({ en: `Great work! You got ${f} right first time.`, ne: `स्याबास! तिमीले ${neDigits(f)} वटा पहिलो पटकमै मिलायौ।` });

/* ------------------------------ Rupee Shop ------------------------------ */
export const shopAskSaid = (id: string, p: number): Said => ({
  en: [costs(id, 'en'), num(p, 'en'), fr('shop-rupees-can-you-pay', 'en')],
  ne: [costs(id, 'ne'), num(p, 'ne'), fr('shop-rupees-can-you-pay', 'ne')],
});
export const shopChangeSaid = (id: string, p: number, given: number): Said => ({
  en: [costs(id, 'en'), num(p, 'en'), fr('shop-rupees-you-give', 'en'), num(given, 'en'), fr('shop-how-much-change', 'en')],
  ne: [item(id, 'ne'), num(p, 'ne'), fr('shop-rupaiyako-timile', 'ne'), num(given, 'ne'), fr('shop-diyau-kati-phirta', 'ne')],
});
export const shopAlmostSaid = (p: number, given: number): Said => ({
  en: [fr('shop-almost-count-from', 'en'), num(p, 'en'), fr('shop-to', 'en'), num(given, 'en')],
  ne: [fr('shop-almost-count-from', 'ne'), num(p, 'ne'), fr('shop-dekhi', 'ne'), num(given, 'ne'), fr('shop-samma-gana', 'ne')],
});
export const shopChangeIsSaid = (n: number): Said => ({
  en: [fr('shop-change-is', 'en'), num(n, 'en'), fr('shop-rupees', 'en')],
  ne: [fr('shop-change-is', 'ne'), num(n, 'ne'), fr('shop-rupees', 'ne')],
});
export const shopThanksSaid = (id: string): Said => ({
  en: [fr('shop-thanks-here-is', 'en'), item(id, 'en')],
  ne: [fr('shop-thanks-here-is', 'ne'), item(id, 'ne')],
});
export const shopTooMuchSaid = (): Said => ({ en: [fr('shop-too-much', 'en')], ne: [fr('shop-too-much', 'ne')] });

/* ------------------------------ Count with me ------------------------------ */
const cap = (s: string) => s[0].toUpperCase() + s.slice(1);
const oranges = (n: number) => (n === 1 ? 'orange' : 'oranges');
export const COUNT_LINES = {
  yum: (t: number): Bi => ({ en: `Yum! ${cap(EN_NUM[t])} ${oranges(t)}. Thank you!`, ne: `मीठो! ${NE_COUNTED[t]} सुन्तला। धन्यवाद!` }),
  have: (p: number): Bi => ({ en: `That's ${EN_NUM[p]}.`, ne: `यहाँ ${NE_COUNTED[p]} छ।` }),
  addMore: (d: number): Bi => ({ en: `Let's add ${EN_NUM[d]} more.`, ne: `अझै ${NE_COUNTED[d]} थपौँ।` }),
  takeAway: (d: number): Bi => ({ en: `Let's take ${EN_NUM[d]} away.`, ne: `${NE_COUNTED[d]} झिकौँ।` }),
};

/** All pieces for the voice script, per language: [key, text, where used]. */
export function spokenLines(l: 'en' | 'ne'): Array<[string, string, string]> {
  const out: Array<[string, string, string]> = [];
  for (const [k, t] of Object.entries(FRAG)) if (t[l]) out.push([k, t[l], k.startsWith('mq-') ? 'Math Quest: joined with numbers' : 'Rupee Shop: joined with numbers and goods']);
  for (const id of GOODS) out.push([`shop-costs-${id}`, costsLine(id)[l], 'Rupee Shop: said before the price']);
  for (let f = 0; f <= 10; f++) out.push([`mq-done-${f}`, mathDoneLine(f)[l], 'Math Quest: end of a round']);
  for (let n = 1; n <= 10; n++) {
    out.push([`yum-${n}`, COUNT_LINES.yum(n)[l], 'Counting: the buddy got the right number']);
    out.push([`have-${n}`, COUNT_LINES.have(n)[l], 'Counting: how many are on the plate']);
    if (n < 10) {
      out.push([`addmore-${n}`, COUNT_LINES.addMore(n)[l], 'Counting: hint, add more']);
      out.push([`takeaway-${n}`, COUNT_LINES.takeAway(n)[l], 'Counting: hint, take some away']);
    }
  }
  return out;
}
