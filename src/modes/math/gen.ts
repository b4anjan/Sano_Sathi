import type { Level } from '../../core/settings';
import { neDigits } from '../../content/numbers';
import type { Bi } from '../../content/strings';

/**
 * Math Quest problems for ages 6–8, in five kinds and three levels.
 *
 *            level 1                level 2                    level 3
 * add        sums to 10             sums 10–20 (bridging 10)   two-digit sums to 99
 * sub        from 10 or less        from 11–20                 two-digit, to 99
 * mul        2, 5 and 10 tables     2, 3, 4, 5 and 10 tables   all tables 2–10
 * missing    7 + ? = 10             within 20, three forms     within 100, and ? × 5 = 20
 * compare    numbers to 20          numbers to 99              7 + 5 ? 13
 *
 * Pure functions with an injectable random source, so they are unit-tested.
 */
export type Op = 'add' | 'sub' | 'mul' | 'missing' | 'compare';
export type Sign = '<' | '=' | '>';

export interface Problem {
  op: Op;
  /** Tokens to show; '?' is the blank the child fills in. Digits are Latin; the screen converts. */
  show: string[];
  answer: number | Sign;
  /** Numbers for the "show me" picture. */
  a: number;
  b: number;
  c: number;
  say: Bi;
}

type Rnd = () => number;
const int = (rnd: Rnd, lo: number, hi: number) => lo + Math.floor(rnd() * (hi - lo + 1));
const pick = <T,>(rnd: Rnd, xs: readonly T[]): T => xs[Math.floor(rnd() * xs.length)];
const nd = (n: number) => neDigits(n);

export const TABLES: Record<Level, number[]> = { 1: [2, 5, 10], 2: [2, 3, 4, 5, 10], 3: [2, 3, 4, 5, 6, 7, 8, 9, 10] };

function add(level: Level, rnd: Rnd): [number, number] {
  if (level === 1) {
    const s = int(rnd, 3, 10);
    const a = int(rnd, 1, s - 1);
    return [a, s - a];
  }
  if (level === 2) {
    const s = int(rnd, 11, 20);
    const a = int(rnd, Math.max(2, s - 10), Math.min(s - 2, 10));
    return [a, s - a];
  }
  const a = int(rnd, 12, 79);
  const b = int(rnd, 5, Math.min(87, 99 - a));
  return [a, b];
}

function sub(level: Level, rnd: Rnd): [number, number] {
  if (level === 1) {
    const a = int(rnd, 3, 10);
    return [a, int(rnd, 1, a - 1)];
  }
  if (level === 2) {
    const a = int(rnd, 11, 20);
    return [a, int(rnd, 2, Math.min(9, a - 2))];
  }
  const a = int(rnd, 25, 99);
  return [a, int(rnd, 6, a - 8)];
}

export function makeProblem(op: Op, level: Level, rnd: Rnd = Math.random): Problem {
  if (op === 'add') {
    const [a, b] = add(level, rnd);
    return { op, a, b, c: a + b, answer: a + b, show: [`${a}`, '+', `${b}`, '=', '?'], say: { en: `${a} plus ${b} makes?`, ne: `${nd(a)} जोड ${nd(b)} कति हुन्छ?` } };
  }
  if (op === 'sub') {
    const [a, b] = sub(level, rnd);
    return { op, a, b, c: a - b, answer: a - b, show: [`${a}`, '−', `${b}`, '=', '?'], say: { en: `${a} take away ${b} leaves?`, ne: `${nd(a)} घटाउ ${nd(b)} कति हुन्छ?` } };
  }
  if (op === 'mul') {
    const t = pick(rnd, TABLES[level]);
    const k = int(rnd, 1, 10);
    const [a, b] = rnd() < 0.5 ? [t, k] : [k, t];
    return { op, a, b, c: a * b, answer: a * b, show: [`${a}`, '×', `${b}`, '=', '?'], say: { en: `${a} times ${b} makes?`, ne: `${nd(a)} गुणा ${nd(b)} कति हुन्छ?` } };
  }
  if (op === 'missing') {
    const form = level === 1 ? 0 : level === 2 ? int(rnd, 0, 2) : int(rnd, 0, 3);
    if (form === 3) {
      const t = pick(rnd, [2, 5, 10]);
      const k = int(rnd, 2, 10);
      return { op, a: k, b: t, c: k * t, answer: k, show: ['?', '×', `${t}`, '=', `${k * t}`], say: { en: `What times ${t} makes ${k * t}?`, ne: `कतिलाई ${nd(t)} ले गुणा गर्दा ${nd(k * t)} हुन्छ?` } };
    }
    const [a, b] = level === 3 ? add(3, rnd) : add(level === 1 ? 1 : rnd() < 0.5 ? 1 : 2, rnd);
    const c = a + b;
    if (form === 0) return { op, a, b, c, answer: b, show: [`${a}`, '+', '?', '=', `${c}`], say: { en: `${a} plus what makes ${c}?`, ne: `${nd(a)} मा कति जोड्दा ${nd(c)} हुन्छ?` } };
    if (form === 1) return { op, a, b, c, answer: a, show: ['?', '+', `${b}`, '=', `${c}`], say: { en: `What plus ${b} makes ${c}?`, ne: `कतिमा ${nd(b)} जोड्दा ${nd(c)} हुन्छ?` } };
    return { op, a: c, b, c: a, answer: b, show: [`${c}`, '−', '?', '=', `${a}`], say: { en: `${c} take away what leaves ${a}?`, ne: `${nd(c)} बाट कति घटाउँदा ${nd(a)} हुन्छ?` } };
  }
  // compare
  let left: number;
  let right: number;
  let leftShow: string;
  if (level === 3) {
    const [a, b] = add(rnd() < 0.5 ? 1 : 2, rnd);
    left = a + b;
    right = rnd() < 0.25 ? left : left + pick(rnd, [-3, -2, -1, 1, 2, 3]);
    leftShow = `${a}+${b}`;
  } else {
    const hi = level === 1 ? 20 : 99;
    left = int(rnd, level === 1 ? 0 : 10, hi);
    right = rnd() < 0.2 ? left : int(rnd, level === 1 ? 0 : 10, hi);
    leftShow = `${left}`;
  }
  const answer: Sign = left < right ? '<' : left > right ? '>' : '=';
  const ls = leftShow.replace(/\d+/g, (d) => nd(Number(d)));
  return {
    op, a: left, b: right, c: 0, answer, show: [leftShow, '?', `${right}`],
    say: { en: `Is ${leftShow.replace('+', ' plus ')} bigger than, smaller than, or the same as ${right}?`, ne: `${ls.replace('+', ' जोड ')}, ${nd(right)} भन्दा ठूलो, सानो कि बराबर?` },
  };
}

/** Check an answer typed or tapped by the child. */
export function isRight(p: Problem, given: string): boolean {
  return typeof p.answer === 'number' ? given.trim() !== '' && Number(given) === p.answer : given === p.answer;
}

/** Evaluate shown tokens, for tests: does the equation hold with the answer filled in? */
export function holds(p: Problem): boolean {
  if (p.op === 'compare') {
    const l = p.show[0].split('+').reduce((s, x) => s + Number(x), 0);
    const r = Number(p.show[2]);
    return (p.answer === '<' && l < r) || (p.answer === '>' && l > r) || (p.answer === '=' && l === r);
  }
  const t = p.show.map((x) => (x === '?' ? String(p.answer) : x));
  const [x, op, y, , z] = t;
  const X = Number(x);
  const Y = Number(y);
  const Z = Number(z);
  if (op === '+') return X + Y === Z;
  if (op === '−') return X - Y === Z;
  return X * Y === Z;
}
