import { BRAND } from '../brand';
import { EN_NUM, NE_COUNTED } from './numbers';

/**
 * Child-facing words in both languages. Kept in one place so a native speaker can review
 * every Nepali sentence without reading component code.
 * Register: the friendly तिमी form a parent uses with a young child.
 */
export interface Bi {
  en: string;
  ne: string;
}

export const S = {
  hello: { en: `Hi! I'm ${BRAND.mascot.en}. Let's play!`, ne: `नमस्ते! म ${BRAND.mascot.ne}। आऊ, खेलौँ!` },
  match: { en: 'Listen & Find', ne: 'सुनेर खोज' },
  matchSub: { en: 'Hear a word, find its picture.', ne: 'शब्द सुन, चित्र खोज।' },
  count: { en: `Count with ${BRAND.mascot.en}`, ne: `${BRAND.mascot.ne}सँग गनौँ` },
  countSub: { en: `Put oranges on ${BRAND.mascot.en}'s plate.`, ne: `${BRAND.mascot.ne}को थालीमा सुन्तला राख।` },
  xylo: { en: 'Xylophone', ne: 'बाजा बजाऔँ' },
  xyloSub: { en: 'Tap, slide and make a tune.', ne: 'थिच, घिसार, धुन बनाऊ।' },
  smash: { en: 'Smash & See', ne: 'थिच र हेर' },
  smashSub: { en: 'Every key and tap makes a letter, number or shape.', ne: 'हरेक थिचाइमा अक्षर, अंक वा आकार।' },
  memory: { en: 'Find the Pair', ne: 'जोडी खोज' },
  memorySub: { en: 'Turn two cards. Can you find a match?', ne: 'दुईवटा कार्ड पल्टाऊ। जोडी भेट्छौ?' },
  all: { en: 'All', ne: 'सबै' },
  grownups: { en: 'Grown-ups', ne: 'अभिभावक' },
  hold: { en: 'hold 2 sec', ne: '२ सेकेन्ड थिच' },
  keepHolding: { en: 'Keep holding for 2 seconds.', ne: '२ सेकेन्डसम्म थिचिराख।' },
  tapBasket: { en: 'Tap the doko to pick an orange.', ne: 'सुन्तला टिप्न डोको थिच।' },
  plateFull: { en: 'The plate is full!', ne: 'थाली भरियो!' },
  countTogether: { en: "Let's count together.", ne: 'सँगै गनौँ।' },
  tapHabre: { en: `Tap ${BRAND.mascot.en} to share`, ne: `${BRAND.mascot.ne}लाई थिच` },
  tapDoko: { en: 'Tap the doko', ne: 'डोको थिच' },
  stars: { en: 'Stars earned', ne: 'पाएका तारा' },
  found: { en: 'Found', ne: 'भेटियो' },
  onPlate: { en: 'on the plate', ne: 'थालीमा' },
} satisfies Record<string, Bi>;

/** Spoken sentences that have their own recording, keyed by clip key (`s-<name>` for S above). */
export const SPOKEN_S = ['hello', 'match', 'memory', 'count', 'smash', 'xylo', 'tapBasket', 'plateFull', 'countTogether'] as const;

/** Short phrases the games join to a word. Clip key: `_<name>` (for example ne/_where). */
export const PHRASES = {
  where: { en: 'Where is the…', ne: 'कहाँ छ?' },
  welldone: { en: 'Well done!', ne: 'स्याबास!' },
  look: { en: 'Look!', ne: 'हेर त!' },
  allfound: { en: 'You found them all!', ne: 'सबै जोडी भेट्यौ!' },
} satisfies Record<string, Bi>;

const oranges = (n: number) => (n === 1 ? 'orange' : 'oranges');
/** Count with Habre's request. Clip key: `want-<n>`. */
export const wantText = (n: number): Bi => ({
  en: `${BRAND.mascot.en} wants ${EN_NUM[n]} ${oranges(n)}.`,
  ne: `${BRAND.mascot.ne}लाई ${NE_COUNTED[n]} सुन्तला चाहियो।`,
});
