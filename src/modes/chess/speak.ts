import { lang } from '../../core/settings';
import { say, type Part } from '../../core/voice';
import type { Bi } from '../../content/strings';
import { CH, PIECE_NAMES, type ChLine } from '../../content/chess';
import type { PieceType } from './pieces';

/** Parts for a sentence in the current language(s); `key` names its clip (ne/<key>, en/<key>). */
export function biParts(t: Bi, key: string): Part[] {
  const l = lang.value;
  const ne: Part = { text: t.ne, lang: 'ne', clips: [`ne/${key}`] };
  const en: Part = { text: t.en, lang: 'en', clips: [`en/${key}`] };
  return l === 'en' ? [en] : l === 'ne' ? [ne] : [ne, en];
}

export const sayLine = (k: ChLine) => void say(biParts(CH[k], `ch-${k}`));

/** Parts for the piece's name, and (optionally) how it moves, in the current language(s). */
export function pieceParts(t: PieceType, how: boolean): Part[] {
  const l = lang.value;
  const one = (x: 'ne' | 'en'): Part[] => [
    { text: PIECE_NAMES[t][x], lang: x, clips: [`${x}/pc-${t}`] },
    ...(how ? [{ text: CH[`how-${t}` as ChLine][x], lang: x, clips: [`${x}/ch-how-${t}`] } as Part] : []),
  ];
  return l === 'en' ? one('en') : l === 'ne' ? one('ne') : [...one('ne'), ...one('en')];
}

export const sayPiece = (t: PieceType, how: boolean) => void say(pieceParts(t, how));
