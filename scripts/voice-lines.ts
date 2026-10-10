/**
 * Every line the AI voices should say, for each buddy and language. Built from the same
 * script the Voice Studio uses (src/content/script.ts), so a new word in the app gets an
 * AI voice the next time the voice job runs. Bundled and run by generate-voices.mjs.
 */
import { scriptFor, type Group } from '../src/content/script';
import { BUDDY_IDS, type BuddyId } from '../src/content/buddies';
import { respellForEnglish } from '../src/content/pronounce';

export interface VoiceJob {
  buddy: BuddyId;
  lang: 'en' | 'ne';
  key: string;
  group: Group;
  text: string;
}

export function voiceJobs(): VoiceJob[] {
  const out: VoiceJob[] = [];
  for (const buddy of BUDDY_IDS) {
    for (const lang of ['ne', 'en'] as const) {
      for (const line of scriptFor(lang)) {
        // Each buddy says only its own hello and reactions.
        if (line.group === 'buddies' && !line.key.startsWith(`m-${buddy}-`)) continue;
        const text = lang === 'en' ? respellForEnglish(line.text) : line.text;
        out.push({ buddy, lang, key: line.key, group: line.group, text });
      }
    }
  }
  return out;
}
