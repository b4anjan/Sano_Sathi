/**
 * How the English computer voice should say Nepali names it would otherwise misread
 * ("dhaka" as "DACK-uh", "Habre" as "HAB-er"). Applied to English speech only, and only
 * until a real recording exists: recordings always win.
 *
 * Spellings use English sounds: "ah" as in father, "oo" as in moon, "ay" as in day,
 * "oh" as in go. Add a row when the English voice mangles a new word.
 */
const EN_SAY: Array<[RegExp, string]> = [
  [/\bhabre\b/gi, 'hah-bray'],
  [/\bdhaka\b/gi, 'dhah-kah'],
  [/\btopi\b/gi, 'toh-pee'],
  [/\bdaura\b/gi, 'dow-rah'],
  [/\bsuruwal\b/gi, 'soo-roo-wahl'],
  [/\bgunyu\b/gi, 'goon-yoo'],
  [/\bcholo\b/gi, 'choh-loh'],
  [/\bkurtha?\b/gi, 'koor-tah'],
  [/\bdoko\b/gi, 'doh-koh'],
  [/\bmadal\b/gi, 'mah-dahl'],
  [/\bnamaste\b/gi, 'nah-mah-stay'],
];

export function respellForEnglish(text: string): string {
  let out = text;
  for (const [re, say] of EN_SAY) out = out.replace(re, say);
  return out;
}
