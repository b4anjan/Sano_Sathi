/**
 * Learning items. One record per word; every mode reads from here, so adding a word
 * (plus its picture in art.ts and, later, its recordings) needs no new screen code.
 *
 * `review: true` marks Nepali text a native speaker has not yet confirmed.
 * Culture words (dhaka topi, daura suruwal, doko, madal) keep their Nepali name in
 * English mode too, the way "momo" is used in English.
 */
export type CategoryId = 'animals' | 'produce' | 'clothing' | 'village' | 'nature';

export interface Item {
  id: string;
  cat: CategoryId;
  en: string;
  ne: string;
  roman: string;
  review?: boolean;
}

export interface Category {
  id: CategoryId;
  en: string;
  ne: string;
  icon: string;
  /** Pastel felt behind the cards, so white and cream pictures still stand out. */
  tint: string;
}

export const CATEGORIES: Category[] = [
  { id: 'animals', en: 'Animals', ne: 'जनावर', icon: 'gai', tint: '#CFE8C6' },
  { id: 'produce', en: 'Fruits & vegetables', ne: 'फलफूल र तरकारी', icon: 'suntala', tint: '#CDE6F3' },
  { id: 'clothing', en: 'Clothing', ne: 'पोसाक', icon: 'dhaka-topi', tint: '#E3D7F2' },
  { id: 'village', en: 'Village life', ne: 'गाउँको जीवन', icon: 'doko', tint: '#F6E6B8' },
  { id: 'nature', en: 'Nature', ne: 'प्रकृति', icon: 'gham', tint: '#FBD9C6' },
];

export const ITEMS: Item[] = [
  { id: 'gai', cat: 'animals', en: 'cow', ne: 'गाई', roman: 'gai' },
  { id: 'bakhra', cat: 'animals', en: 'goat', ne: 'बाख्रा', roman: 'bakhra' },
  { id: 'kukhura', cat: 'animals', en: 'hen', ne: 'कुखुरा', roman: 'kukhura' },
  { id: 'yak', cat: 'animals', en: 'yak', ne: 'याक', roman: 'yak' },
  { id: 'gainda', cat: 'animals', en: 'rhino', ne: 'गैंडा', roman: 'gainda' },
  { id: 'habre', cat: 'animals', en: 'red panda', ne: 'हाब्रे', roman: 'habre' },
  { id: 'machha', cat: 'animals', en: 'fish', ne: 'माछा', roman: 'machha' },

  { id: 'aanp', cat: 'produce', en: 'mango', ne: 'आँप', roman: 'aanp' },
  { id: 'kera', cat: 'produce', en: 'banana', ne: 'केरा', roman: 'kera' },
  { id: 'suntala', cat: 'produce', en: 'orange', ne: 'सुन्तला', roman: 'suntala' },
  { id: 'golbheda', cat: 'produce', en: 'tomato', ne: 'गोलभेडा', roman: 'golbheda' },
  { id: 'mula', cat: 'produce', en: 'radish', ne: 'मूला', roman: 'mula' },
  { id: 'makai', cat: 'produce', en: 'corn', ne: 'मकै', roman: 'makai' },
  { id: 'syau', cat: 'produce', en: 'apple', ne: 'स्याउ', roman: 'syau' },

  { id: 'dhaka-topi', cat: 'clothing', en: 'dhaka topi', ne: 'ढाका टोपी', roman: 'dhaka topi' },
  { id: 'daura-suruwal', cat: 'clothing', en: 'daura suruwal', ne: 'दौरा सुरुवाल', roman: 'daura suruwal' },
  { id: 'gunyu-cholo', cat: 'clothing', en: 'gunyu cholo', ne: 'गुन्यु चोलो', roman: 'gunyu cholo', review: true },
  { id: 'kurtha-suruwal', cat: 'clothing', en: 'kurta suruwal', ne: 'कुर्था सुरुवाल', roman: 'kurtha suruwal', review: true },
  { id: 'chappal', cat: 'clothing', en: 'sandals', ne: 'चप्पल', roman: 'chappal' },
  { id: 'galbandi', cat: 'clothing', en: 'scarf', ne: 'गलबन्दी', roman: 'galbandi', review: true },

  { id: 'doko', cat: 'village', en: 'doko basket', ne: 'डोको', roman: 'doko' },
  { id: 'gagri', cat: 'village', en: 'water pot', ne: 'गाग्री', roman: 'gagri' },
  { id: 'khet', cat: 'village', en: 'field', ne: 'खेत', roman: 'khet' },
  { id: 'chulo', cat: 'village', en: 'clay stove', ne: 'चुलो', roman: 'chulo' },
  { id: 'dhunge-dhara', cat: 'village', en: 'stone water spout', ne: 'ढुंगे धारा', roman: 'dhunge dhara' },
  { id: 'madal', cat: 'village', en: 'madal drum', ne: 'मादल', roman: 'madal' },
  { id: 'changa', cat: 'village', en: 'kite', ne: 'चङ्गा', roman: 'changa' },
  { id: 'chhata', cat: 'village', en: 'umbrella', ne: 'छाता', roman: 'chhata' },

  { id: 'gham', cat: 'nature', en: 'sun', ne: 'घाम', roman: 'gham' },
  { id: 'jun', cat: 'nature', en: 'moon', ne: 'जून', roman: 'jun' },
  { id: 'tara', cat: 'nature', en: 'star', ne: 'तारा', roman: 'tara' },
  { id: 'laligurans', cat: 'nature', en: 'rhododendron', ne: 'लालीगुराँस', roman: 'laligurans' },
];

export const itemById = (id: string): Item | undefined => ITEMS.find((i) => i.id === id);
export const categoryOf = (item: Item): Category => CATEGORIES.find((c) => c.id === item.cat)!;
