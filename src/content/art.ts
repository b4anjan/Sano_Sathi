/**
 * Felt cut-out illustrations, drawn in code.
 *
 * Every picture is a few simple shapes on a 120 x 120 grid. Each shape gets a flat colour,
 * a felt-fibre overlay (the shared #feltPat pattern) and, on its main piece, a dashed
 * "stitch" line. Simple shapes are what real felt boards are made of, so the style looks
 * intentional, stays about 1 KB per picture, and scales to any screen.
 *
 * To add a picture: write a function returning SVG markup and register it in ART.
 */

export const C = {
  red: '#E5483D', orange: '#F28C28', yellow: '#F6C232', green: '#5DB646', leaf: '#3F8F3A',
  sky: '#5BB8EC', blue: '#3E6FD8', purple: '#8D5CD0', pink: '#EC6DA6', rose: '#F2A1B6',
  cream: '#F3E9D2', white: '#FBF8F1', ink: '#2B2420', dark: '#3B2A22', brown: '#8A5A33',
  tan: '#C9A27A', rust: '#C1502E', grey: '#8E9A97', stone: '#A7A9A4', copper: '#C8743A',
  mud: '#A0613B', bamboo: '#C9A35E', bambooDark: '#9C7A3C', water: '#7FC8EE',
} as const;

const FELT = 'url(#feltPat)';
const STITCH = 'stroke="rgba(255,255,255,.72)" stroke-width="1.6" stroke-dasharray="4 3" stroke-linecap="round" fill="none"';

interface Opt {
  st?: boolean;
  rot?: number;
  op?: number;
}

const rotAttr = (rot: number | undefined, cx: number, cy: number) => (rot ? ` transform="rotate(${rot} ${cx} ${cy})"` : '');
const opAttr = (op?: number) => (op !== undefined ? ` opacity="${op}"` : '');

/** Ellipse */
export function E(cx: number, cy: number, rx: number, ry: number, fill: string, o: Opt = {}): string {
  const g = rotAttr(o.rot, cx, cy);
  const base = `cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}"`;
  let s = `<g${g}${opAttr(o.op)}><ellipse ${base} fill="${fill}"/><ellipse ${base} fill="${FELT}" opacity=".45"/>`;
  if (o.st && rx > 8 && ry > 8) s += `<ellipse cx="${cx}" cy="${cy}" rx="${rx - 5}" ry="${ry - 5}" ${STITCH}/>`;
  return s + '</g>';
}

/** Rounded rectangle */
export function R(x: number, y: number, w: number, h: number, r: number, fill: string, o: Opt = {}): string {
  const base = `x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}"`;
  let s = `<g${opAttr(o.op)}><rect ${base} fill="${fill}"/><rect ${base} fill="${FELT}" opacity=".45"/>`;
  if (o.st && w > 16 && h > 16) s += `<rect x="${x + 5}" y="${y + 5}" width="${w - 10}" height="${h - 10}" rx="${Math.max(2, r - 5)}" ${STITCH}/>`;
  return s + '</g>';
}

/** Path. `st` = [cx, cy, scale]: the stitch is the same outline shrunk toward (cx, cy). */
export function P(d: string, fill: string, o: { st?: [number, number, number]; op?: number } = {}): string {
  let s = `<g${opAttr(o.op)}><path d="${d}" fill="${fill}"/><path d="${d}" fill="${FELT}" opacity=".45"/>`;
  if (o.st) {
    const [cx, cy, k] = o.st;
    s += `<path d="${d}" ${STITCH} vector-effect="non-scaling-stroke" transform="translate(${cx} ${cy}) scale(${k}) translate(${-cx} ${-cy})"/>`;
  }
  return s + '</g>';
}

/** Stroked line (thread, straps, folds) */
export function L(d: string, stroke: string, w = 2, extra = ''): string {
  return `<path d="${d}" fill="none" stroke="${stroke}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"${extra}/>`;
}

const eye = (cx: number, cy: number, r: number) =>
  `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${C.ink}"/><circle cx="${cx + r * 0.35}" cy="${cy - r * 0.35}" r="${r * 0.35}" fill="#fff"/>`;

const zig = (y: number, x0: number, x1: number, h: number, step: number) => {
  let d = `M${x0} ${y}`;
  let up = true;
  for (let x = x0 + step; x <= x1; x += step) {
    d += ` L${x} ${up ? y - h : y}`;
    up = !up;
  }
  return d;
};

/* ---------------- Animals / जनावर ---------------- */

const horn = '#D8C08E';

const gai = () =>
  P('M40 34 Q26 24 30 12 Q37 22 47 30Z', horn) +
  P('M80 34 Q94 24 90 12 Q83 22 73 30Z', horn) +
  E(22, 50, 16, 8, C.white, { rot: -20 }) + E(22, 50, 9, 4, C.rose, { rot: -20 }) +
  E(98, 50, 16, 8, C.white, { rot: 20 }) + E(98, 50, 9, 4, C.rose, { rot: 20 }) +
  R(32, 26, 56, 74, 28, C.white, { st: true }) +
  P('M36 42 Q42 26 60 30 Q62 46 54 56 Q40 58 36 42Z', C.ink) +
  `<circle cx="48" cy="52" r="6.5" fill="${C.white}"/>` + eye(48, 52, 4.5) + eye(72, 52, 4.5) +
  E(60, 86, 25, 16, C.rose, { st: true }) +
  E(51, 86, 3.5, 5, C.ink) + E(69, 86, 3.5, 5, C.ink);

const bakhra = () =>
  P('M48 30 Q42 10 28 8 Q40 18 42 32Z', C.stone) +
  P('M72 30 Q78 10 92 8 Q80 18 78 32Z', C.stone) +
  E(25, 48, 17, 6, C.tan, { rot: 22 }) + E(95, 48, 17, 6, C.tan, { rot: -22 }) +
  P('M60 24 Q84 24 84 52 Q84 78 70 96 Q60 104 50 96 Q36 78 36 52 Q36 24 60 24Z', C.tan, { st: [60, 60, 0.82] }) +
  P('M60 27 Q66 42 64 70 L56 70 Q54 42 60 27Z', C.cream) +
  eye(48, 52, 4) + eye(72, 52, 4) +
  E(60, 89, 11, 7, C.rose) + E(55, 89, 2, 3, C.ink) + E(65, 89, 2, 3, C.ink) +
  P('M53 99 Q60 120 67 99Z', C.cream);

const kukhura = () => {
  const body = '#B5532B';
  const wing = '#8E3B1E';
  return (
    P('M36 64 Q14 46 18 22 Q30 40 44 52Z', wing) +
    P('M40 58 Q24 34 34 16 Q40 36 50 48Z', C.dark) +
    L('M54 96 L52 112 M46 112 L58 112', '#E39B2D', 4) +
    L('M68 96 L70 112 M64 112 L76 112', '#E39B2D', 4) +
    E(60, 74, 36, 26, body, { st: true }) +
    P('M44 70 Q62 58 80 70 Q68 88 46 82Z', wing) +
    E(88, 48, 15, 16, body) +
    P('M78 36 Q78 24 86 30 Q88 20 95 30 Q100 24 101 37 Q90 40 78 36Z', C.red) +
    P('M101 45 L114 50 L101 55Z', C.yellow) +
    E(98, 61, 4, 6, C.red) +
    eye(92, 45, 3)
  );
};

const yak = () => {
  const coat = '#4A3328';
  return (
    P('M40 40 Q12 40 12 12 Q22 30 42 32Z', horn) +
    P('M80 40 Q108 40 108 12 Q98 30 78 32Z', horn) +
    P('M34 54 Q24 84 38 106 L46 72Z', C.dark) +
    P('M86 54 Q96 84 82 106 L74 72Z', C.dark) +
    E(25, 56, 11, 5, C.dark, { rot: 15 }) + E(95, 56, 11, 5, C.dark, { rot: -15 }) +
    R(34, 30, 52, 72, 24, coat, { st: true }) +
    P('M34 50 L40 38 L46 50 L53 38 L60 50 L67 38 L74 50 L80 38 L86 50 L86 40 Q60 22 34 40Z', C.dark) +
    eye(48, 60, 3.5) + eye(72, 60, 3.5) +
    E(60, 88, 20, 13, '#6B4A3A', { st: true }) +
    E(53, 88, 2.5, 3.5, C.ink) + E(67, 88, 2.5, 3.5, C.ink)
  );
};

const gainda = () => {
  const skin = '#8E9A97';
  const fold = '#6F7B78';
  return (
    P('M36 46 Q28 26 40 22 Q48 32 46 44Z', '#7A8683') +
    P('M14 88 Q10 52 40 42 Q70 34 88 50 Q100 58 106 76 Q108 92 92 96 L30 98 Q16 96 14 88Z', skin, { st: [58, 70, 0.84] }) +
    P('M88 62 Q94 42 102 28 Q108 48 102 68Z', C.cream) +
    P('M76 50 Q80 40 86 37 Q88 45 84 53Z', C.cream) +
    L('M44 46 Q38 70 46 94', fold, 2) +
    L('M58 44 Q54 56 58 68', fold, 2) +
    eye(70, 62, 3) +
    E(100, 78, 2, 3, C.ink) +
    L('M103 88 Q96 92 89 90', C.ink, 2)
  );
};

/** Red panda — also Habre, the guide character. */
const habre = () => {
  const tear = '#6A2716';
  return (
    P('M30 48 L30 16 Q46 18 55 35Z', C.rust) + P('M35 41 L35.5 23 Q44 25 49.5 35Z', C.white) +
    P('M90 48 L90 16 Q74 18 65 35Z', C.rust) + P('M85 41 L84.5 23 Q76 25 70.5 35Z', C.white) +
    E(60, 66, 42, 34, C.rust, { st: true }) +
    E(45, 48, 7, 5, C.white) + E(75, 48, 7, 5, C.white) +
    P('M30 74 Q40 66 60 70 Q80 66 90 74 Q84 96 60 98 Q36 96 30 74Z', C.white) +
    P('M42 56 Q38 70 46 86 L52 84 Q46 70 48 58Z', tear) +
    P('M78 56 Q82 70 74 86 L68 84 Q74 70 72 58Z', tear) +
    `<g class="look"><g class="eyes">${eye(46, 60, 4.5)}${eye(74, 60, 4.5)}</g></g>` +
    E(60, 78, 6, 4.5, C.ink) +
    L('M54 86 Q60 91 66 86', C.ink, 2)
  );
};

/** Cat (बिरालो) — also the Cat buddy. Tail and eyes are grouped so the buddy can animate them. */
const biralo = () => {
  const fur = '#F2A65A';
  const stripe = '#D9822B';
  return (
    `<g class="tail">${L('M86 100 Q114 94 108 64 Q105 52 113 44', fur, 11)}${L('M104 78 L113 76 M107 64 L115 66', stripe, 3)}</g>` +
    P('M26 54 L28 12 L56 34Z', fur) + P('M32 45 L33 23 L47 35Z', C.rose) +
    P('M94 54 L92 12 L64 34Z', fur) + P('M88 45 L87 23 L73 35Z', C.rose) +
    E(60, 68, 41, 34, fur, { st: true }) +
    L('M60 36 L60 47 M50 38 L52 47 M70 38 L68 47', stripe, 3.5) +
    L('M20 62 L30 64 M20 70 L29 70', stripe, 3) + L('M100 62 L90 64 M100 70 L91 70', stripe, 3) +
    E(60, 82, 17, 11, C.cream) +
    E(39, 78, 6, 3.5, C.rose, { op: 0.65 }) + E(81, 78, 6, 3.5, C.rose, { op: 0.65 }) +
    `<g class="look"><g class="eyes">` +
    `<circle cx="46" cy="64" r="7" fill="#7BC46A"/><circle cx="74" cy="64" r="7" fill="#7BC46A"/>${eye(46, 64, 4.6)}${eye(74, 64, 4.6)}</g></g>` +
    P('M55 75 L65 75 L60 81Z', C.pink) +
    L('M60 81 Q57 87 51 85 M60 81 Q63 87 69 85', C.ink, 2) +
    L('M42 80 L18 76 M42 84 L19 87 M78 80 L102 76 M78 84 L101 87', C.ink, 1.3)
  );
};

/** Dog (कुकुर) — also the Puppy buddy: floppy ears, eye patch, tongue out. */
const kukur = () => {
  const coat = '#C98B4F';
  const ear = '#7A4A26';
  return (
    `<g class="tail">${L('M84 102 Q110 98 110 72', coat, 10)}${E(110, 70, 5, 6, C.white)}</g>` +
    E(60, 66, 37, 35, coat, { st: true }) +
    P('M60 33 Q67 50 65 62 Q82 66 81 81 Q77 98 60 98 Q43 98 39 81 Q38 66 55 62 Q53 50 60 33Z', C.white) +
    E(75, 58, 10, 9, ear, { op: 0.9 }) +
    `<g class="ears">` +
    P('M28 38 Q10 42 13 70 Q15 88 29 86 Q38 70 40 47Z', ear) +
    P('M92 38 Q110 42 107 70 Q105 88 91 86 Q82 70 80 47Z', ear) +
    `</g>` +
    `<g class="look"><g class="eyes">${eye(46, 60, 5)}${eye(74, 60, 5)}</g></g>` +
    E(60, 77, 7.5, 5.5, C.ink) + E(57.5, 75.5, 2.4, 1.6, '#fff', { op: 0.7 }) +
    L('M60 82 L60 87 M60 87 Q55 92 49 89 M60 87 Q65 92 71 89', C.ink, 2) +
    P('M55.5 89.5 Q60 104 64.5 89.5Z', C.pink) + L('M60 91 L60 97', '#D2557F', 1.4)
  );
};

/* ---------------- Fruits and vegetables / फलफूल र तरकारी ---------------- */

const aanp = () =>
  P('M44 30 Q72 14 92 40 Q106 70 82 96 Q58 112 38 94 Q20 74 28 52 Q32 38 44 30Z', '#F5B630', { st: [62, 64, 0.82] }) +
  E(50, 54, 16, 12, '#F07A2B', { rot: -30, op: 0.5 }) +
  P('M63 27 L65 15 L70 16 L68 28Z', C.brown) +
  P('M68 20 Q80 4 100 10 Q88 26 68 20Z', C.leaf) +
  L('M71 19 Q84 13 96 11', '#2E6B2A', 1.5);

const kera = () =>
  P('M30 30 Q36 78 78 86 Q104 88 112 70 Q90 78 72 74 Q46 64 42 30Z', '#E9B528') +
  P('M22 34 Q18 86 64 98 Q98 104 110 82 Q86 90 66 84 Q38 74 34 36Z', C.yellow) +
  L('M29 46 Q30 76 64 89', '#FBE38A', 3) +
  P('M21 37 L22 22 L31 22 L35 34Z', C.brown) +
  E(109, 83, 4, 3, C.dark);

const suntala = () =>
  E(60, 68, 38, 36, C.orange, { st: true }) +
  [[46, 60], [74, 54], [66, 82], [44, 84], [82, 76], [56, 48]]
    .map(([x, y]) => `<circle cx="${x}" cy="${y}" r="1.6" fill="#D9731C"/>`)
    .join('') +
  E(46, 52, 8, 5, '#FFC98A', { rot: -30, op: 0.6 }) +
  R(57, 26, 6, 9, 2, C.brown) +
  P('M62 31 Q76 14 96 20 Q84 36 62 31Z', C.leaf);

const golbheda = () =>
  E(60, 70, 42, 34, C.red, { st: true }) +
  L('M44 42 Q35 70 46 100', '#C13A30', 2) +
  L('M76 42 Q85 70 74 100', '#C13A30', 2) +
  E(44, 58, 8, 5, '#FF9A8E', { rot: -30, op: 0.6 }) +
  P('M60 42 L48 34 L55 45 L41 47 L57 49 L51 59 L62 50 L72 57 L67 47 L80 45 L65 43 L72 33Z', C.leaf) +
  R(58, 28, 5, 12, 2, C.leaf);

const mula = () =>
  P('M58 46 Q40 14 30 18 Q40 34 54 48Z', C.leaf) +
  P('M60 46 Q58 8 70 6 Q72 26 64 46Z', C.green) +
  P('M62 48 Q86 14 94 22 Q80 36 66 50Z', C.leaf) +
  P('M46 46 Q60 40 74 46 Q78 66 70 88 Q64 104 60 116 Q56 104 50 88 Q42 66 46 46Z', C.white, { st: [60, 72, 0.8] }) +
  P('M46 46 Q60 40 74 46 L73.5 54 Q60 49 46.5 54Z', '#D9EFC9') +
  L('M52 70 L57 69 M63 84 L68 83 M54 96 L58 95', '#CFC6B4', 1.5);

const makai = () => {
  let kernels = '';
  for (let y = 30; y <= 92; y += 9) {
    const half = y < 40 ? 8 : y > 84 ? 9 : 13;
    for (let x = 60 - half; x <= 60 + half; x += 7) kernels += `<ellipse cx="${x}" cy="${y}" rx="3" ry="3.6" fill="#FBE38A" opacity=".85"/>`;
  }
  return (
    P('M60 16 Q80 28 78 66 Q76 98 60 104 Q44 98 42 66 Q40 28 60 16Z', C.yellow) +
    kernels +
    P('M42 58 Q22 92 52 114 Q46 92 50 66Z', C.leaf) +
    P('M78 58 Q98 92 68 114 Q74 92 70 66Z', C.green)
  );
};

/* ---------------- Clothing / पोसाक ---------------- */

const dhakaTopi = () =>
  P('M22 94 L32 24 Q60 14 88 24 L98 94 Q60 102 22 94Z', '#F4EBDD', { st: [60, 60, 0.86] }) +
  L(zig(40, 36, 84, 6, 6), C.red, 3) +
  L(zig(56, 34, 86, 6, 6), C.ink, 3) +
  L(zig(72, 32, 88, 6, 6), C.orange, 3) +
  L(zig(88, 30, 90, 6, 6), C.red, 3) +
  [42, 54, 66, 78].map((x) => `<path d="M${x} 44 l4 4 l-4 4 l-4 -4z" fill="${C.leaf}"/>`).join('') +
  [48, 60, 72].map((x) => `<path d="M${x} 60 l4 4 l-4 4 l-4 -4z" fill="${C.blue}"/>`).join('') +
  [42, 54, 66, 78].map((x) => `<path d="M${x} 76 l4 4 l-4 4 l-4 -4z" fill="${C.purple}"/>`).join('') +
  L('M32 24 Q60 16 88 24', '#CDBFAA', 1.5);

const dauraSuruwal = () =>
  P('M44 78 L42 114 L56 114 L60 90 L64 114 L78 114 L76 78Z', C.white) +
  P('M36 22 L50 16 Q60 24 70 16 L84 22 L98 46 L88 52 L82 40 L84 86 L36 86 L38 40 L32 52 L22 46Z', '#EFE4CC', { st: [60, 52, 0.84] }) +
  L('M50 16 Q58 40 80 62', '#B9A988', 2) +
  L('M80 44 l9 4 M80 44 l8 -3 M78 60 l9 4 M78 60 l8 -3', '#8A7A5A', 1.5);

const gunyuCholo = () =>
  P('M40 54 L80 54 L94 114 L26 114Z', '#2E7D4F', { st: [60, 84, 0.84] }) +
  P('M27.5 106 L92.5 106 L94 114 L26 114Z', C.yellow) +
  L('M52 60 L46 104 M60 60 L60 104 M68 60 L74 104', '#24653F', 1.5) +
  P('M38 22 L50 16 Q60 24 70 16 L82 22 L94 40 L84 46 L80 38 L80 56 L40 56 L40 38 L36 46 L26 40Z', C.red) +
  L('M50 16 Q60 34 76 44', '#A9322A', 2) +
  R(38, 52, 44, 7, 3, C.yellow);

const kurthaSuruwal = () =>
  P('M46 92 L44 114 L56 114 L60 100 L64 114 L76 114 L74 92Z', C.white) +
  P('M38 22 L50 16 Q60 26 70 16 L82 22 L94 42 L84 48 L80 38 L82 98 L38 98 L40 38 L36 48 L26 42Z', C.pink, { st: [60, 58, 0.84] }) +
  P('M50 16 Q60 34 70 16 Q60 26 50 16Z', '#C24E86') +
  P('M30 30 Q60 52 90 30 L94 38 Q60 64 26 38Z', C.yellow) +
  [44, 52, 60, 68, 76].map((x, i) => `<circle cx="${x}" cy="${46 + (i === 2 ? 4 : i % 2 ? 3 : 0)}" r="1.8" fill="${C.red}"/>`).join('');

const chappal = () =>
  P('M26 30 Q40 18 50 30 Q56 60 50 96 Q38 108 28 96 Q20 62 26 30Z', C.blue, { st: [38, 62, 0.82] }) +
  P('M70 30 Q80 18 94 30 Q100 62 92 96 Q82 108 70 96 Q64 60 70 30Z', C.blue, { st: [82, 62, 0.82] }) +
  L('M38 34 L28 62 M38 34 L50 60', C.red, 5) +
  L('M82 34 L70 60 M82 34 L92 62', C.red, 5);

const galbandi = () =>
  P('M30 22 Q60 6 90 22 L86 34 Q60 22 34 34Z', C.purple) +
  R(32, 28, 18, 70, 5, C.purple) +
  R(70, 28, 18, 62, 5, C.purple) +
  R(32, 46, 18, 8, 0, C.yellow) + R(32, 70, 18, 8, 0, C.yellow) +
  R(70, 44, 18, 8, 0, C.yellow) + R(70, 66, 18, 8, 0, C.yellow) +
  L('M35 98 v9 M40 98 v9 M45 98 v9 M49 98 v9', C.purple, 2) +
  L('M73 90 v9 M78 90 v9 M83 90 v9 M87 90 v9', C.purple, 2);

/* ---------------- Village life / गाउँको जीवन ---------------- */

const doko = () => {
  let weave = '';
  for (let i = 0; i <= 8; i++) weave += L(`M${29 + i * 7.75} 33 L${45 + i * 3.75} 104`, C.bambooDark, 1.4);
  for (const y of [48, 64, 80, 96]) {
    const l = 22 + ((y - 28) * 20) / 80;
    const r = 98 - ((y - 28) * 20) / 80;
    weave += L(`M${l + 2} ${y} L${r - 2} ${y}`, C.bambooDark, 1.4);
  }
  return (
    L('M30 30 Q60 -6 90 30', '#6B4A2A', 5) +
    P('M22 28 L98 28 L78 108 Q60 112 42 108Z', C.bamboo) +
    weave +
    E(60, 28, 38, 6, C.bambooDark)
  );
};

const gagri = () =>
  E(60, 76, 36, 32, C.copper, { st: true }) +
  R(48, 32, 24, 18, 4, '#B5652F') +
  E(60, 32, 18, 5, '#D9894A') +
  L('M26 70 Q60 80 94 70', '#E9A46A', 3) +
  E(44, 66, 6, 13, '#FFD3A6', { rot: 20, op: 0.5 });

const khet = () =>
  P('M8 50 L36 20 L52 36 L72 12 L112 46Z', '#DDE7EE') +
  P('M66 18 L72 12 L78 18 L75 17 L72 21 L69 17Z', C.white) +
  E(96, 22, 9, 9, C.yellow) +
  P('M8 48 Q40 36 70 42 Q92 46 112 38 L112 58 Q90 64 70 60 Q40 54 8 66Z', '#9BD27A') +
  P('M8 66 Q40 54 70 60 Q90 64 112 58 L112 78 Q90 84 70 80 Q40 74 8 86Z', C.green) +
  P('M8 86 Q40 74 70 80 Q90 84 112 78 L112 98 Q90 104 70 100 Q40 94 8 106Z', '#4AA03C') +
  P('M8 106 Q40 94 70 100 Q90 104 112 98 L112 114 L8 114Z', C.leaf) +
  L('M8 66 Q40 54 70 60 Q90 64 112 58 M8 86 Q40 74 70 80 Q90 84 112 78 M8 106 Q40 94 70 100 Q90 104 112 98', '#2F7A2C', 1.5) +
  [[30, 72], [54, 70], [80, 72], [24, 92], [48, 90], [74, 92], [98, 90], [40, 110], [66, 112]]
    .map(([x, y]) => L(`M${x - 3} ${y} L${x} ${y - 6} L${x + 3} ${y}`, '#D9EFC9', 1.5))
    .join('');

const chulo = () =>
  L('M50 24 Q46 18 50 12 M60 22 Q56 16 60 10 M70 24 Q66 18 70 12', '#C9C9C9', 2) +
  P('M18 100 L24 56 Q60 46 96 56 L102 100Z', C.mud, { st: [60, 78, 0.86] }) +
  E(60, 56, 36, 8, '#B87148') +
  E(60, 44, 22, 14, '#4A4A4A') +
  E(60, 32, 16, 4, '#5E5E5E') +
  P('M44 100 L44 82 Q60 68 76 82 L76 100Z', '#3A2018') +
  P('M50 100 Q48 88 56 82 Q56 90 60 86 Q62 76 68 82 Q72 90 70 100Z', C.orange) +
  P('M55 100 Q56 92 60 90 Q64 94 65 100Z', C.yellow);

const dhungeDhara = () =>
  R(14, 18, 92, 62, 6, C.stone, { st: true }) +
  L('M14 38 H106 M14 58 H106 M40 18 V38 M76 18 V38 M28 38 V58 M60 38 V58 M92 38 V58 M44 58 V80 M80 58 V80', '#8B8D88', 1.5) +
  P('M46 50 Q58 42 74 48 L80 58 Q64 56 50 60Z', '#5E615C') +
  E(76, 54, 3, 3, C.ink) +
  R(10, 92, 100, 20, 6, '#8C8F89') +
  E(60, 98, 42, 7, C.water) +
  P('M72 58 Q76 72 74 98 L82 98 Q84 72 79 57Z', C.water) +
  E(68, 92, 2, 3, C.water) + E(88, 92, 2, 3, C.water);

const madal = () =>
  L('M22 46 Q60 4 98 46', '#5E3B1F', 3) +
  P('M22 46 Q60 32 98 46 L98 82 Q60 96 22 82Z', C.brown, { st: [60, 64, 0.84] }) +
  L('M28 50 L40 82 L52 48 L64 84 L76 48 L88 82 L94 52', C.cream, 2) +
  E(22, 64, 9, 18, C.cream) + E(22, 64, 4, 8, C.ink) +
  E(98, 64, 9, 18, C.cream) + E(98, 64, 5, 9, C.ink);

/* ---------------- Added in v3: more animals, fruit, things and nature ---------------- */

const machha = () =>
  P('M30 60 L10 40 L15 60 L10 80Z', C.orange) +
  P('M56 40 Q66 26 80 40Z', C.orange) +
  P('M60 80 Q68 92 78 80Z', C.orange) +
  P('M24 60 Q50 30 86 44 Q104 52 108 60 Q104 68 86 76 Q50 90 24 60Z', '#F2A33A', { st: [64, 60, 0.8] }) +
  L('M50 52 q7 8 0 16 M62 50 q7 10 0 20 M74 52 q7 8 0 16', '#D9822B', 1.5) +
  eye(92, 56, 3.5) +
  L('M105 63 Q101 66 98 64', C.ink, 1.5);

const syau = () =>
  P('M60 36 Q40 22 26 40 Q14 62 28 88 Q40 108 60 98 Q80 108 92 88 Q106 62 94 40 Q80 22 60 36Z', C.red, { st: [60, 66, 0.82] }) +
  E(42, 54, 8, 5, '#FF9A8E', { rot: -30, op: 0.6 }) +
  L('M60 36 Q60 22 66 14', C.brown, 4) +
  P('M64 22 Q78 8 94 16 Q80 30 64 22Z', C.leaf);

const changa = () =>
  L('M60 100 Q74 106 64 112 Q54 118 66 120', C.red, 3) +
  P('M60 8 L100 52 L60 52Z', C.yellow) +
  P('M60 52 L100 52 L60 100Z', C.blue) +
  P('M20 52 L60 52 L60 8Z', C.red) +
  P('M20 52 L60 100 L60 52Z', C.green) +
  L('M60 8 L100 52 L60 100 L20 52Z', 'rgba(255,255,255,.75)', 1.6, ' stroke-dasharray="4 3"') +
  L('M60 8 L60 100 M20 52 L100 52', C.brown, 1.5);

const chhata = () =>
  L('M60 58 L60 100 Q60 110 50 110 Q42 110 42 102', C.brown, 4) +
  P('M14 60 Q16 22 60 18 Q104 22 106 60 Q96 52 86 60 Q76 52 66 60 Q56 52 46 60 Q36 52 26 60 Q20 54 14 60Z', C.blue, { st: [60, 44, 0.82] }) +
  P('M60 18 Q47 32 46 60 Q56 52 66 60 Q66 32 60 18Z', C.yellow) +
  L('M60 18 L60 9', C.ink, 3);

const gham = () => {
  let rays = '';
  for (let i = 0; i < 10; i++) {
    const a = (i * Math.PI) / 5;
    const x = (r: number, da = 0) => (60 + Math.cos(a + da) * r).toFixed(1);
    const y = (r: number, da = 0) => (60 + Math.sin(a + da) * r).toFixed(1);
    rays += `<path d="M${x(36, -0.16)} ${y(36, -0.16)} L${x(54)} ${y(54)} L${x(36, 0.16)} ${y(36, 0.16)}Z" fill="${C.orange}"/>`;
  }
  return (
    rays +
    E(60, 60, 32, 32, C.yellow, { st: true }) +
    E(46, 66, 5, 3, C.orange, { op: 0.5 }) + E(74, 66, 5, 3, C.orange, { op: 0.5 }) +
    eye(50, 56, 3) + eye(70, 56, 3) +
    L('M50 70 Q60 78 70 70', C.ink, 2)
  );
};

const smallStar = (cx: number, cy: number, r: number, fill: string) => {
  let d = '';
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const rr = i % 2 ? r * 0.45 : r;
    d += `${i ? 'L' : 'M'}${(cx + Math.cos(a) * rr).toFixed(1)} ${(cy + Math.sin(a) * rr).toFixed(1)}`;
  }
  return `${d}Z|${fill}`;
};
const starShape = (cx: number, cy: number, r: number, fill: string, o: { st?: [number, number, number] } = {}) => {
  const [d, f] = smallStar(cx, cy, r, fill).split('|');
  return P(d, f, o);
};

const jun = () =>
  starShape(92, 30, 9, C.yellow) + starShape(100, 76, 6, C.white) + starShape(84, 100, 5, C.yellow) +
  P('M76 12 Q30 20 30 60 Q30 100 76 108 Q44 94 44 60 Q44 26 76 12Z', '#F6E7A8') +
  E(40, 46, 3, 3, '#E2CF85') + E(38, 76, 4, 4, '#E2CF85') +
  L('M38 60 Q42 64 46 60', C.ink, 2);

const tara = () =>
  starShape(60, 64, 52, C.yellow, { st: [60, 64, 0.78] }) +
  eye(50, 62, 3) + eye(70, 62, 3) +
  L('M52 74 Q60 80 68 74', C.ink, 2) +
  E(44, 70, 4, 2.5, C.orange, { op: 0.5 }) + E(76, 70, 4, 2.5, C.orange, { op: 0.5 });

const laligurans = () => {
  const petal = '#D7263D';
  const flower = (x: number, y: number) =>
    E(x, y, 14, 12, petal) + E(x, y - 1, 6, 5, '#F05D6C') +
    `<circle cx="${x - 3}" cy="${y - 2}" r="1.4" fill="${C.yellow}"/><circle cx="${x + 3}" cy="${y - 3}" r="1.4" fill="${C.yellow}"/><circle cx="${x}" cy="${y + 1}" r="1.4" fill="${C.yellow}"/>`;
  return (
    P('M60 72 Q30 80 12 104 Q40 102 60 82Z', C.leaf) +
    P('M60 72 Q90 80 108 104 Q80 102 60 82Z', C.leaf) +
    P('M58 76 Q56 100 60 116 Q64 100 62 76Z', '#2E6B2A') +
    flower(48, 30) + flower(72, 30) + flower(36, 50) + flower(84, 50) + flower(60, 46) + flower(60, 66)
  );
};

export const ART: Record<string, () => string> = {
  gai, bakhra, kukhura, yak, gainda, habre, machha, biralo, kukur,
  aanp, kera, suntala, golbheda, mula, makai, syau,
  'dhaka-topi': dhakaTopi, 'daura-suruwal': dauraSuruwal, 'gunyu-cholo': gunyuCholo,
  'kurtha-suruwal': kurthaSuruwal, chappal, galbandi,
  doko, gagri, khet, chulo, 'dhunge-dhara': dhungeDhara, madal, changa, chhata,
  gham, jun, tara, laligurans,
};

/** Card back for the memory game: a dhaka weave tile, as a CSS background image. */
export function dhakaTile(): string {
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 36 36">` +
    `<rect width="36" height="36" fill="#F4EBDD"/>` +
    `<path d="M0 8 L6 2 L12 8 L18 2 L24 8 L30 2 L36 8" fill="none" stroke="#E5483D" stroke-width="2.4"/>` +
    `<path d="M0 26 L6 20 L12 26 L18 20 L24 26 L30 20 L36 26" fill="none" stroke="#2B2420" stroke-width="2.4"/>` +
    `<path d="M9 14 l3 3 l-3 3 l-3 -3z M27 14 l3 3 l-3 3 l-3 -3z" fill="#3E6FD8"/>` +
    `<path d="M18 30 l3 3 l-3 3 l-3 -3z M0 30 l3 3 l-3 3 l-3 -3z M36 30 l3 3 l-3 3 l-3 -3z" fill="#F28C28"/>` +
    `</svg>`;
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
}

const cache: Record<string, string> = {};
export function art(id: string): string {
  if (!cache[id]) cache[id] = ART[id] ? ART[id]() : '';
  return cache[id];
}
