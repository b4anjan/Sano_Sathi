/** Shapes and colours for Smash & See, with names in both languages. */
import { C } from './art';

const FELT = 'url(#feltPat)';

function star(): string {
  let d = '';
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const r = i % 2 ? 20 : 45;
    d += `${i ? 'L' : 'M'}${(50 + r * Math.cos(a)).toFixed(1)} ${(54 + r * Math.sin(a)).toFixed(1)}`;
  }
  return d + 'Z';
}

export const SHAPES = [
  { id: 'circle', en: 'circle', ne: 'गोलो', d: 'M6 50a44 44 0 1 0 88 0a44 44 0 1 0 -88 0Z', c: [50, 50] },
  { id: 'square', en: 'square', ne: 'वर्ग', d: 'M22 8H78Q92 8 92 22V78Q92 92 78 92H22Q8 92 8 78V22Q8 8 22 8Z', c: [50, 50] },
  { id: 'triangle', en: 'triangle', ne: 'त्रिभुज', d: 'M50 9Q54 9 56 13L92 79Q95 88 86 88H14Q5 88 8 79L44 13Q46 9 50 9Z', c: [50, 62] },
  { id: 'star', en: 'star', ne: 'तारा', d: star(), c: [50, 54] },
  { id: 'heart', en: 'heart', ne: 'मुटु', d: 'M50 88C26 70 6 54 8 32C9 16 22 8 34 8C42 8 47 13 50 20C53 13 58 8 66 8C78 8 91 16 92 32C94 54 74 70 50 88Z', c: [50, 44] },
  { id: 'oval', en: 'oval', ne: 'अण्डाकार', d: 'M5 50a45 31 0 1 0 90 0a45 31 0 1 0 -90 0Z', c: [50, 50] },
] as const;

export const COLORS = [
  { en: 'red', ne: 'रातो', hex: C.red },
  { en: 'orange', ne: 'सुन्तले', hex: C.orange },
  { en: 'yellow', ne: 'पहेँलो', hex: C.yellow },
  { en: 'green', ne: 'हरियो', hex: C.green },
  { en: 'sky blue', ne: 'आकाशे', hex: C.sky },
  { en: 'blue', ne: 'निलो', hex: C.blue },
  { en: 'purple', ne: 'बैजनी', hex: C.purple },
  { en: 'pink', ne: 'गुलाबी', hex: C.pink },
];

export function shapeSVG(id: string, hex: string): string {
  const s = SHAPES.find((x) => x.id === id) ?? SHAPES[0];
  const [cx, cy] = s.c;
  return (
    `<svg class="shape" viewBox="0 0 100 100" aria-hidden="true">` +
    `<path d="${s.d}" fill="${hex}" stroke="${hex}" stroke-width="6" stroke-linejoin="round"/>` +
    `<path d="${s.d}" fill="${FELT}" opacity=".5"/>` +
    `<path d="${s.d}" fill="none" stroke="rgba(255,255,255,.75)" stroke-width="2.5" stroke-dasharray="6 5" stroke-linecap="round" vector-effect="non-scaling-stroke" transform="translate(${cx} ${cy}) scale(.78) translate(${-cx} ${-cy})"/>` +
    `</svg>`
  );
}
