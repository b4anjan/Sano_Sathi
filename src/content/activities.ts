import { S, type Bi } from './strings';

/**
 * Every activity on the home screen, in one list: title, subtitle, age band, tile colour
 * and section. The home screen, the grown-ups panel and the top rail all read from here,
 * so adding an activity means one entry here, one screen component and one tile picture.
 */
export type ActivityId =
  | 'match' | 'memory' | 'letters' | 'numbers' | 'count' | 'shapes'
  | 'smash' | 'xylo' | 'bubbles' | 'paint' | 'village'
  | 'math' | 'shop';

export type Section = 'learn' | 'play' | 'big';

export interface Activity {
  id: ActivityId;
  title: Bi;
  sub: Bi;
  age: string;
  color: string;
  section: Section;
  /** Learning screens keep the living background calm (at most "gentle"). */
  focus?: boolean;
  /** Screens with their own full-screen picture or canvas switch the background off. */
  still?: boolean;
}

export const SECTIONS: Array<{ id: Section; title: Bi }> = [
  { id: 'learn', title: { en: 'Words, letters & numbers', ne: 'शब्द, अक्षर र अंक' } },
  { id: 'play', title: { en: 'Play & explore', ne: 'खेलौँ र हेरौँ' } },
  { id: 'big', title: { en: 'Big kids · 6–8', ne: 'ठूला साथी · ६–८' } },
];

export const ACTIVITIES: Activity[] = [
  { id: 'match', title: S.match, sub: S.matchSub, age: '2–8', color: 'var(--yellow)', section: 'learn', focus: true },
  { id: 'memory', title: S.memory, sub: S.memorySub, age: '3–8', color: 'var(--green)', section: 'learn', focus: true },
  { id: 'letters', title: S.letters, sub: S.lettersSub, age: '3–7', color: 'var(--sky)', section: 'learn', focus: true },
  { id: 'numbers', title: S.numbers, sub: S.numbersSub, age: '3–7', color: 'var(--orange)', section: 'learn', focus: true },
  { id: 'count', title: S.count, sub: S.countSub, age: '3–6', color: 'var(--pink)', section: 'learn', focus: true },
  { id: 'shapes', title: S.shapes, sub: S.shapesSub, age: '2–5', color: 'var(--purple)', section: 'learn', focus: true },
  { id: 'smash', title: S.smash, sub: S.smashSub, age: '1–6', color: 'var(--orange)', section: 'play' },
  { id: 'bubbles', title: S.bubbles, sub: S.bubblesSub, age: '2–6', color: 'var(--sky)', section: 'play', still: true },
  { id: 'xylo', title: S.xylo, sub: S.xyloSub, age: '2–8', color: 'var(--pink)', section: 'play' },
  { id: 'paint', title: S.paint, sub: S.paintSub, age: '2–8', color: 'var(--yellow)', section: 'play', still: true },
  { id: 'village', title: S.village, sub: S.villageSub, age: '1–6', color: 'var(--green)', section: 'play', still: true },
  { id: 'math', title: S.math, sub: S.mathSub, age: '6–8', color: 'var(--blue)', section: 'big', focus: true },
  { id: 'shop', title: S.shop, sub: S.shopSub, age: '5–8', color: 'var(--red)', section: 'big', focus: true },
];

export const activityById = (id: string): Activity | undefined => ACTIVITIES.find((a) => a.id === id);
