import type { Part } from '../../core/voice';
import type { Lang } from '../../core/settings';
import { glossItem, type Letter } from '../../content/letters';

/** The letter's word in the other language: a picture word's clip, or its own (gl-<letter>). */
function glossClip(L: Letter, l: 'en' | 'ne'): string[] {
  const id = glossItem(L, l);
  return [`${l}/${id ?? `gl-${L.ch}`}`];
}

/**
 * What to say for a letter: "A! A is for apple." or "क, कुखुराको क", the way children chant
 * them, plus the word's translation in "Both" mode. Same recording keys as Smash & See.
 */
export function letterParts(L: Letter, script: 'en' | 'ne', l: Lang): Part[] {
  const parts: Part[] = [];
  if (script === 'en') {
    parts.push({ text: L.word ? `${L.say}! ${L.say} is for ${L.word}.` : `${L.say}!`, lang: 'en', clips: [`en/letter-${L.ch}`] });
    if (l !== 'en' && L.gloss) parts.push({ text: L.gloss, lang: 'ne', clips: glossClip(L, 'ne') });
  } else {
    parts.push({ text: L.word ? `${L.ch}, ${L.word}को ${L.ch}` : L.ch, lang: 'ne', clips: [`ne/letter-${L.ch}`] });
    if (l !== 'ne' && L.gloss) parts.push({ text: L.gloss, lang: 'en', clips: glossClip(L, 'en') });
  }
  return parts;
}
