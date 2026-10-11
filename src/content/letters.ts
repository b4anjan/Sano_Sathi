/**
 * Letters for Smash & See and, later, Trace Lab.
 * Each letter may have a word (and a picture, when that word has felt art).
 * Nepali consonants are grouped by वर्ग (velar, palatal, retroflex, dental, labial…),
 * the order Nepali children chant them in: "क कुखुराको क, ख खेतको ख…".
 * Words were chosen to reuse our pictures where possible; all need a native speaker's review.
 */
import { itemById } from './items';

export interface Letter {
  ch: string;
  /** How to say the letter's name aloud (English letter names; Nepali is the letter itself). */
  say: string;
  word?: string;
  /** Translation of the word, for "Both" mode. */
  gloss?: string;
  art?: string;
}

const L = (ch: string, say: string, word?: string, gloss?: string, art?: string): Letter => ({ ch, say, word, gloss, art });

export const EN_LETTERS: Letter[] = [
  L('A', 'ay', 'apple', 'स्याउ', 'syau'), L('B', 'bee', 'banana', 'केरा', 'kera'), L('C', 'see', 'cow', 'गाई', 'gai'),
  L('D', 'dee', 'doko', 'डोको', 'doko'), L('E', 'ee', 'elephant', 'हात्ती'), L('F', 'eff', 'fish', 'माछा', 'machha'),
  L('G', 'jee', 'goat', 'बाख्रा', 'bakhra'), L('H', 'aitch', 'hen', 'कुखुरा', 'kukhura'), L('I', 'eye', 'ice', 'बरफ'),
  L('J', 'jay', 'juice', 'जुस'), L('K', 'kay', 'kite', 'चङ्गा', 'changa'), L('L', 'el', 'lion', 'सिंह'),
  L('M', 'em', 'moon', 'जून', 'jun'), L('N', 'en', 'nest', 'गुँड'), L('O', 'oh', 'orange', 'सुन्तला', 'suntala'),
  L('P', 'pee', 'panda', 'हाब्रे', 'habre'), L('Q', 'cue', 'queen', 'रानी'), L('R', 'ar', 'rhino', 'गैंडा', 'gainda'),
  L('S', 'ess', 'sun', 'घाम', 'gham'), L('T', 'tee', 'tomato', 'गोलभेडा', 'golbheda'), L('U', 'you', 'umbrella', 'छाता', 'chhata'),
  L('V', 'vee', 'van', 'भ्यान'), L('W', 'double you', 'water pot', 'गाग्री', 'gagri'), L('X', 'ex', 'xylophone', 'जाइलोफोन'),
  L('Y', 'why', 'yak', 'याक', 'yak'), L('Z', 'zee', 'zebra', 'जेब्रा'),
];

export const NE_VOWELS: Letter[] = [
  L('अ', 'अ', 'अनार', 'pomegranate'), L('आ', 'आ', 'आँप', 'mango', 'aanp'), L('इ', 'इ', 'इनार', 'well'),
  L('ई', 'ई', 'ईख', 'sugarcane'), L('उ', 'उ', 'उल्लु', 'owl'), L('ऊ', 'ऊ', 'ऊन', 'wool'),
  L('ऋ', 'ऋ', 'ऋषि', 'sage'), L('ए', 'ए', 'एक', 'one'), L('ऐ', 'ऐ', 'ऐना', 'mirror'),
  L('ओ', 'ओ', 'ओखर', 'walnut'), L('औ', 'औ', 'औंला', 'finger'), L('अं', 'अं', 'अंगुर', 'grapes'),
  L('अः', 'अः'),
];

/** Consonants, one inner array per वर्ग row. */
export const NE_CONSONANT_ROWS: Letter[][] = [
  [L('क', 'क', 'कुखुरा', 'hen', 'kukhura'), L('ख', 'ख', 'खेत', 'field', 'khet'), L('ग', 'ग', 'गाई', 'cow', 'gai'), L('घ', 'घ', 'घाम', 'sun', 'gham'), L('ङ', 'ङ')],
  [L('च', 'च', 'चङ्गा', 'kite', 'changa'), L('छ', 'छ', 'छाता', 'umbrella', 'chhata'), L('ज', 'ज', 'जून', 'moon', 'jun'), L('झ', 'झ', 'झण्डा', 'flag'), L('ञ', 'ञ')],
  [L('ट', 'ट', 'टोपी', 'cap', 'dhaka-topi'), L('ठ', 'ठ', 'ठेकी', 'milk churn'), L('ड', 'ड', 'डोको', 'doko basket', 'doko'), L('ढ', 'ढ', 'ढुंगे धारा', 'stone water spout', 'dhunge-dhara'), L('ण', 'ण')],
  [L('त', 'त', 'तारा', 'star', 'tara'), L('थ', 'थ', 'थाली', 'plate'), L('द', 'द', 'दौरा सुरुवाल', 'daura suruwal', 'daura-suruwal'), L('ध', 'ध', 'धनुष', 'bow'), L('न', 'न', 'नरिवल', 'coconut')],
  [L('प', 'प', 'परेवा', 'pigeon'), L('फ', 'फ', 'फर्सी', 'pumpkin'), L('ब', 'ब', 'बाख्रा', 'goat', 'bakhra'), L('भ', 'भ', 'भालु', 'bear'), L('म', 'म', 'माछा', 'fish', 'machha')],
  [L('य', 'य', 'याक', 'yak', 'yak'), L('र', 'र', 'रुख', 'tree'), L('ल', 'ल', 'लालीगुराँस', 'rhododendron', 'laligurans'), L('व', 'व', 'वन', 'forest')],
  [L('श', 'श', 'शङ्ख', 'conch'), L('ष', 'ष', 'षट्कोण', 'hexagon'), L('स', 'स', 'सुन्तला', 'orange', 'suntala'), L('ह', 'ह', 'हाब्रे', 'red panda', 'habre')],
  [L('क्ष', 'क्ष'), L('त्र', 'त्र', 'त्रिशूल', 'trident'), L('ज्ञ', 'ज्ञ', 'ज्ञान', 'knowledge')],
];
export const NE_CONSONANTS = NE_CONSONANT_ROWS.flat();

/**
 * Clip key for a letter said on its own ("ख", "B"), without the chant. A Nepali letter that
 * has no word (ङ, ण…) is already said on its own by its letter- clip.
 */
export const letterOnlyKey = (L: Letter, l: 'en' | 'ne'): string => (l === 'ne' && !L.word ? `letter-${L.ch}` : `ln-${L.ch}`);

/** The letter's word in the other language reuses a picture word's recording when it is the same word. */
export function glossItem(L: Letter, l: 'en' | 'ne'): string | undefined {
  const it = L.art ? itemById(L.art) : undefined;
  return it && it[l] === L.gloss ? it.id : undefined;
}
