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
  match: { en: 'Listen & Find', ne: 'सुनेर खोज' },
  matchSub: { en: 'Hear a word, find its picture.', ne: 'शब्द सुन, चित्र खोज।' },
  count: { en: 'Count with me', ne: 'मसँगै गनौँ' },
  countSub: { en: 'Put oranges on my plate.', ne: 'मेरो थालीमा सुन्तला राख।' },
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
  tapMe: { en: 'Tap me to share', ne: 'बाँड्न मलाई थिच' },
  tapDoko: { en: 'Tap the doko', ne: 'डोको थिच' },
  stars: { en: 'Stars earned', ne: 'पाएका तारा' },
  found: { en: 'Found', ne: 'भेटियो' },
  onPlate: { en: 'on the plate', ne: 'थालीमा' },
  letters: { en: 'Letters', ne: 'अक्षर' },
  lettersSub: { en: 'Explore and trace ABC and कखग.', ne: 'ABC र कखग हेर, अनि लेख।' },
  numbers: { en: 'Numbers', ne: 'अंक' },
  numbersSub: { en: 'Count to 20 and trace numbers.', ne: '२० सम्म गन, अंक लेख।' },
  math: { en: 'Math Quest', ne: 'गणित यात्रा' },
  mathSub: { en: 'Add, take away, times tables and more.', ne: 'जोड, घटाउ, गुणन र अझ धेरै।' },
  shop: { en: 'Rupee Shop', ne: 'रुपैयाँ पसल' },
  shopSub: { en: 'Buy things with coins and notes.', ne: 'सिक्का र नोटले सामान किन।' },
  shapes: { en: 'Shapes & Colors', ne: 'आकार र रङ' },
  shapesSub: { en: 'Sort felt shapes into baskets.', ne: 'आकारहरू डालोमा छुट्याऊ।' },
  bubbles: { en: 'Bubble Pop', ne: 'फोका फोड' },
  bubblesSub: { en: 'Pop the letter, number or color.', ne: 'अक्षर, अंक वा रङको फोका फोड।' },
  paint: { en: 'Felt Paint', ne: 'चित्र कोर' },
  paintSub: { en: 'Draw, stamp and make rainbows.', ne: 'कोर, छाप लगाऊ, इन्द्रेणी बनाऊ।' },
  village: { en: 'My Village', ne: 'मेरो गाउँ' },
  villageSub: { en: 'Tap everything in a Nepali village.', ne: 'गाउँका सबै कुरा थिचेर हेर।' },
  stickers: { en: 'Sticker book', ne: 'स्टिकर किताब' },
  holdHome: { en: 'Hold to go home', ne: 'घर जान थिचिराख' },
  newSticker: { en: 'New sticker!', ne: 'नयाँ स्टिकर!' },
  chooseBuddy: { en: 'Choose your buddy', ne: 'साथी छान' },
  tryAgain: { en: 'Almost! Try again.', ne: 'झन्डै! फेरि कोसिस गर।' },
  stickerHow: { en: 'Play any game to earn stars. Every 5 stars unlock a new sticker!', ne: 'जुनसुकै खेल खेलेर तारा कमाऊ। हरेक ५ तारामा नयाँ स्टिकर!' },
  copy: { en: 'Copy Me', ne: 'मेरो नक्कल गर' },
  copySub: { en: 'Watch the lights, then copy the pattern.', ne: 'बत्ती हेर, अनि त्यस्तै थिच।' },
  chess: { en: 'Chess', ne: 'चेस' },
  chessSub: { en: 'Play your buddy, or learn how each piece moves.', ne: 'साथीसँग खेल, वा हरेक गोटीको चाल सिक।' },
} satisfies Record<string, Bi>;

/** Spoken sentences that have their own recording, keyed by clip key (`s-<name>` for S above). */
export const SPOKEN_S = [
  'match', 'memory', 'count', 'smash', 'xylo', 'letters', 'numbers', 'math', 'shop', 'shapes', 'bubbles', 'paint', 'village', 'stickers',
  'copy', 'chess', 'tapBasket', 'plateFull', 'countTogether', 'tryAgain', 'stickerHow',
] as const;

/** Short phrases the games join to a word. Clip key: `_<name>` (for example ne/_where). */
export const PHRASES = {
  where: { en: 'Where is the…', ne: 'कहाँ छ?' },
  welldone: { en: 'Well done!', ne: 'स्याबास!' },
  look: { en: 'Look!', ne: 'हेर त!' },
  allfound: { en: 'You found them all!', ne: 'सबै जोडी भेट्यौ!' },
  pop: { en: 'Pop', ne: 'फोड!' },
  night: { en: 'Good night!', ne: 'शुभ रात्रि!' },
  watch: { en: 'Watch and listen!', ne: 'हेर र सुन!' },
  yourTurn: { en: 'Your turn!', ne: 'अब तिम्रो पालो!' },
  levelUp: { en: 'Level complete!', ne: 'तह पूरा भयो!' },
  oops: { en: 'Oops! Watch again.', ne: 'ओहो! फेरि हेर।' },
} satisfies Record<string, Bi>;

const oranges = (n: number) => (n === 1 ? 'orange' : 'oranges');
/** The buddy's request in Count with me (first person, so it suits every buddy). Clip key: `want-<n>`. */
export const wantText = (n: number): Bi => ({
  en: `I want ${EN_NUM[n]} ${oranges(n)}.`,
  ne: `मलाई ${NE_COUNTED[n]} सुन्तला चाहियो।`,
});
