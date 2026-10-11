/**
 * Felt chess pieces in classic shapes (so what children learn here works on a real board).
 * Drawn in code like the rest of the art: one outline path per piece, a felt overlay, a
 * stitched inner line, and a few details (the knight's eye, the bishop's slit).
 */
export type PieceType = 'k' | 'q' | 'r' | 'b' | 'n' | 'p';
export type Side = 'w' | 'b';

const BASE = 'M24 77H76Q81 77 81 82V84Q81 89 76 89H24Q19 89 19 84V82Q19 77 24 77Z';

const SHAPE: Record<PieceType, string> = {
  p:
    'M50 14a13 13 0 1 1 -0.01 0Z' +
    'M40 42H60Q64 42 64 46Q64 50 60 50H58L66 77H34L42 50H40Q36 50 36 46Q36 42 40 42Z' +
    BASE,
  r:
    'M29 14H38V22H45V14H55V22H62V14H71V33Q71 37 66 38V68L72 77H28L34 68V38Q29 37 29 33Z' +
    BASE,
  b:
    'M50 7a6 6 0 1 1 -0.01 0Z' +
    'M50 17C62 27 66 40 59 49H41C34 40 38 27 50 17Z' +
    'M38 50H62Q65 50 65 54Q65 58 62 58H38Q35 58 35 54Q35 50 38 50Z' +
    'M41 58H59L67 77H33Z' +
    BASE,
  n:
    'M31 77C32 66 38 59 46 52C41 55 35 57 29 56C24 55 20 51 22 46C24 41 31 34 40 26C44 22 48 19 50 17L53 7L59 15C69 19 75 31 74 47C73 59 72 68 72 77Z' +
    BASE,
  q:
    'M30 70L22 31L36 46L38 24L46 43L50 19L54 43L62 24L64 46L78 31L70 70Z' +
    'M22 25a5 5 0 1 1 -0.01 0ZM38 18a5 5 0 1 1 -0.01 0ZM50 12a5 5 0 1 1 -0.01 0ZM62 18a5 5 0 1 1 -0.01 0ZM78 25a5 5 0 1 1 -0.01 0Z' +
    'M29 68H71Q73 68 73 71V74Q73 77 70 77H30Q27 77 27 74V71Q27 68 29 68Z' +
    BASE,
  k:
    'M46 4H54V11H61V19H54V27H46V19H39V11H46Z' +
    'M50 27C67 27 74 37 69 49L64 68H36L31 49C26 37 33 27 50 27Z' +
    'M33 68H67Q70 68 70 71V74Q70 77 67 77H33Q30 77 30 74V71Q30 68 33 68Z' +
    BASE,
};

/** Small details drawn on top, in the piece's line colour. */
const DETAIL: Partial<Record<PieceType, (ink: string) => string>> = {
  n: (ink) => `<circle cx="43" cy="31" r="3" fill="${ink}"/><path d="M28 49Q31 47 33 49" fill="none" stroke="${ink}" stroke-width="2.4" stroke-linecap="round"/>`,
  b: (ink) => `<path d="M45 35L55 27" stroke="${ink}" stroke-width="3" stroke-linecap="round"/>`,
};

const LOOK: Record<Side, { fill: string; line: string; stitch: string }> = {
  w: { fill: '#F6EEDD', line: '#3B2A22', stitch: 'rgba(59,42,34,.38)' },
  b: { fill: '#34302D', line: '#15110F', stitch: 'rgba(255,255,255,.5)' },
};

export function pieceSVG(type: PieceType, side: Side): string {
  const k = LOOK[side];
  const d = SHAPE[type];
  return (
    `<svg class="cpiece" viewBox="0 0 100 100" aria-hidden="true">` +
    `<path d="${d}" fill="${k.fill}" stroke="${k.line}" stroke-width="3.2" stroke-linejoin="round"/>` +
    `<path d="${d}" fill="url(#feltPat)" opacity=".45"/>` +
    `<path d="${d}" fill="none" stroke="${k.stitch}" stroke-width="1.6" stroke-dasharray="4 3.5" transform="translate(50 50) scale(.86) translate(-50 -50)" vector-effect="non-scaling-stroke"/>` +
    (DETAIL[type]?.(side === 'w' ? k.line : 'rgba(255,255,255,.8)') ?? '') +
    `</svg>`
  );
}

/** A felt star (lesson goals) and a felt rock (lesson obstacles). */
export const STAR_SVG =
  `<svg class="cstar" viewBox="0 0 100 100" aria-hidden="true"><path d="M50 10L61 37L90 39L68 58L75 87L50 71L25 87L32 58L10 39L39 37Z" fill="#F6C232" stroke="#B88A12" stroke-width="3" stroke-linejoin="round"/>` +
  `<path d="M50 10L61 37L90 39L68 58L75 87L50 71L25 87L32 58L10 39L39 37Z" fill="url(#feltPat)" opacity=".45"/></svg>`;
export const ROCK_SVG =
  `<svg class="crock" viewBox="0 0 100 100" aria-hidden="true"><path d="M18 74C12 60 20 42 34 34C44 22 64 22 74 34C88 40 92 60 84 74Z" fill="#8E918C" stroke="#5B5E5A" stroke-width="3" stroke-linejoin="round"/>` +
  `<path d="M18 74C12 60 20 42 34 34C44 22 64 22 74 34C88 40 92 60 84 74Z" fill="url(#feltPat)" opacity=".5"/><path d="M34 46Q42 40 50 44" stroke="rgba(255,255,255,.45)" stroke-width="3" fill="none" stroke-linecap="round"/></svg>`;
