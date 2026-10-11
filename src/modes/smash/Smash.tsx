import { useEffect, useRef, useState } from 'preact/hooks';
import { lang } from '../../core/settings';
import { unlockAudio, mallet, bloop, PENTA } from '../../core/audio';
import { say, stopSpeech, type Part } from '../../core/voice';
import { art } from '../../content/art';
import { EN_LETTERS, NE_VOWELS, NE_CONSONANT_ROWS, type Letter } from '../../content/letters';
import { EN_NUM, NE_NUM, neDigits } from '../../content/numbers';
import { SHAPES, COLORS, shapeSVG } from '../../content/shapes';
import type { Bi as BiText } from '../../content/strings';
import type { JSX } from 'preact';
import { Bi } from '../../ui/common';
import { itemById } from '../../content/items';

/** The letter's word, in the other language, can reuse that item's recording when it is the same word. */
function glossClip(L: Letter, l: 'en' | 'ne'): string[] | undefined {
  const it = L.art ? itemById(L.art) : undefined;
  return it && it[l] === L.gloss ? [`${l}/${it.id}`] : undefined;
}

type Tab = 'abc' | 'vowels' | 'cons' | 'num';
interface Spawn {
  key: number; x: number; y: number; rot: number; color: string; html: string; label: string; bye?: boolean;
}

const RANKS: Array<[number, BiText]> = [
  [80, { en: 'Super smasher!', ne: 'धमाका!' }],
  [30, { en: 'Tiny storm', ne: 'सानो आँधी' }],
  [10, { en: 'Busy fingers', ne: 'फुर्तिला औंला' }],
  [0, { en: 'Little taps', ne: 'सानो थिचाइ' }],
];
const rankFor = (n: number) => RANKS.find(([min]) => n >= min)![1];
const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);
const pic = (id?: string) => (id ? `<svg class="art chip-pic" viewBox="0 0 120 120" aria-hidden="true">${art(id)}</svg>` : '');
let keySeq = 0;

/**
 * Smash & See: every key, tap and on-screen key makes something happen.
 * Physical keys give English letters and numbers; the on-screen keyboard adds Nepali
 * vowels, consonants (in वर्ग rows) and Nepali digits. Taps on the felt make shapes.
 */
export function Smash() {
  const [spawns, setSpawns] = useState<Spawn[]>([]);
  const [taps, setTaps] = useState(0);
  const [tab, setTab] = useState<Tab>(lang.value === 'en' ? 'abc' : 'cons');
  const [kbOpen, setKbOpen] = useState(true);
  const fieldRef = useRef<HTMLDivElement>(null);
  const timers = useRef<number[]>([]);
  const lastSay = useRef(0);
  const lastColor = useRef(-1);

  const speak = (parts: Part[]) => {
    // While a child smashes, speak at most every 0.8 s so words finish instead of stuttering.
    const now = performance.now();
    if (now - lastSay.current < 800) return;
    lastSay.current = now;
    void say(parts);
  };

  const color = () => {
    let i: number;
    do i = Math.floor(Math.random() * COLORS.length);
    while (i === lastColor.current);
    lastColor.current = i;
    return COLORS[i];
  };

  const spawn = (html: string, hex: string, label: string, at?: { x: number; y: number }) => {
    const f = fieldRef.current?.getBoundingClientRect();
    if (!f) return;
    const clamp = (v: number, lo: number, hi: number) => Math.min(Math.max(v, lo), Math.max(lo, hi));
    const x = at ? clamp(at.x - f.left, 60, f.width - 60) : f.width * (0.14 + Math.random() * 0.72);
    const y = at ? clamp(at.y - f.top, 70, f.height - 70) : f.height * (0.22 + Math.random() * 0.56);
    const key = ++keySeq;
    const rot = Math.round(Math.random() * 24 - 12);
    setSpawns((s) => [...s.slice(-11), { key, x, y, rot, color: hex, html, label }]);
    setTaps((t) => t + 1);
    timers.current.push(window.setTimeout(() => setSpawns((s) => s.map((p) => (p.key === key ? { ...p, bye: true } : p))), 3400));
    timers.current.push(window.setTimeout(() => setSpawns((s) => s.filter((p) => p.key !== key)), 4400));
  };

  const letter = (L: Letter, script: 'en' | 'ne') => {
    unlockAudio();
    const c = color();
    const l = lang.value;
    let words = '';
    if (L.word) {
      const main = esc(L.word);
      const other = L.gloss ? esc(L.gloss) : '';
      const showOther = other && (script === 'en' ? l !== 'en' : l !== 'ne');
      words = `<span class="w" ${script === 'ne' ? 'lang="ne"' : ''}><b>${main}</b>${showOther ? ` · <span class="g">${other}</span>` : ''}</span>`;
    }
    const chip = L.word ? `<span class="chip" style="--c-ink:${c.hex}">${pic(L.art)}${words}</span>` : '';
    spawn(`<div class="glyph${script === 'ne' ? ' ne' : ''}">${esc(L.ch)}</div>${chip}`, c.hex, L.word ? `${L.ch}: ${L.word}` : L.ch);
    const idx = script === 'en' ? L.ch.charCodeAt(0) - 65 : Math.abs(L.ch.charCodeAt(0) - 0x0915);
    mallet(PENTA[idx % PENTA.length], 0.4, 1.1);
    const parts: Part[] = [];
    if (script === 'en') {
      parts.push({ text: L.word ? `${L.say}! ${L.say} is for ${L.word}.` : `${L.say}!`, lang: 'en', clips: [`en/letter-${L.ch}`] });
      if (l !== 'en' && L.gloss) parts.push({ text: L.gloss, lang: 'ne', clips: glossClip(L, 'ne') });
    } else {
      parts.push({ text: L.word ? `${L.ch}, ${L.word}को ${L.ch}` : L.ch, lang: 'ne', clips: [`ne/letter-${L.ch}`] });
      if (l !== 'ne' && L.gloss) parts.push({ text: L.gloss, lang: 'en', clips: glossClip(L, 'en') });
    }
    speak(parts);
  };

  const number = (n: number) => {
    unlockAudio();
    const c = color();
    const l = lang.value;
    const glyph = l === 'en' ? String(n) : neDigits(n);
    const word = l === 'en' ? EN_NUM[n] : l === 'ne' ? NE_NUM[n] : `${NE_NUM[n]} · ${EN_NUM[n]}`;
    const dots = n ? `<div class="dots">${'<i></i>'.repeat(n)}</div>` : '';
    spawn(`<div class="glyph${l === 'en' ? '' : ' ne'}">${glyph}</div>${dots}<span class="chip" style="--c-ink:${c.hex}"><span class="w"><b>${word}</b></span></span>`, c.hex, `${n}`);
    [0, 1, 2].slice(0, Math.max(1, Math.min(3, n))).forEach((i) => mallet(PENTA[(n + i * 2) % PENTA.length], 0.3, 0.8, i * 0.08));
    const parts: Part[] = [];
    if (l !== 'en') parts.push({ text: NE_NUM[n], lang: 'ne', clips: [`ne/num${n}`] });
    if (l !== 'ne') parts.push({ text: EN_NUM[n], lang: 'en', clips: [`en/num${n}`] });
    speak(parts);
  };

  const shape = (at?: { x: number; y: number }) => {
    unlockAudio();
    const c = color();
    const s = SHAPES[Math.floor(Math.random() * SHAPES.length)];
    const l = lang.value;
    const name = l === 'en' ? `${c.en} ${s.en}` : l === 'ne' ? `${c.ne} ${s.ne}` : `${c.ne} ${s.ne} · ${c.en} ${s.en}`;
    spawn(`${shapeSVG(s.id, c.hex)}<span class="chip" style="--c-ink:${c.hex}"><span class="w"><b>${esc(name)}</b></span></span>`, c.hex, name, at);
    bloop(240 + Math.random() * 120, 520 + Math.random() * 300, 0.16);
    const parts: Part[] = [];
    // Colour + shape, each its own recording (same clips as Shapes & Colors).
    const keys = (x: 'en' | 'ne') => [`${x}/color-${c.en.replace(/\s+/g, '-')}`, `${x}/shape-${s.id}`];
    if (l !== 'en') parts.push({ text: `${c.ne} ${s.ne}!`, lang: 'ne', clips: keys('ne') });
    if (l !== 'ne') parts.push({ text: `${c.en} ${s.en}!`, lang: 'en', clips: keys('en') });
    speak(parts);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (document.querySelector('.panel') || e.ctrlKey || e.metaKey || e.altKey) return;
      if ((e.target as HTMLElement)?.closest?.('.kb')) return; // on-screen key buttons handle themselves
      e.preventDefault();
      if (e.repeat) return;
      if (/^[a-z]$/i.test(e.key)) letter(EN_LETTERS[e.key.toUpperCase().charCodeAt(0) - 65], 'en');
      else if (/^[0-9]$/.test(e.key)) number(Number(e.key));
      else shape();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      timers.current.forEach((t) => window.clearTimeout(t));
      stopSpeech();
    };
  }, []);

  const l = lang.value;
  const press = (fn: () => void) => ({
    onPointerDown: (e: PointerEvent) => {
      e.preventDefault();
      fn();
    },
    onClick: (e: MouseEvent) => {
      if (e.detail === 0) fn(); // keyboard activation (Enter/Space); pointer presses already fired
    },
  });

  const key = (L: Letter, script: 'en' | 'ne') => (
    <button type="button" class={`key${script === 'ne' ? ' ne' : ''}`} key={L.ch} aria-label={L.word ? `${L.ch}, ${L.word}` : L.ch} {...press(() => letter(L, script))}>
      {L.ch}
    </button>
  );

  const rows: JSX.Element[] = [];
  if (tab === 'abc') {
    for (let i = 0; i < 26; i += 7) rows.push(<div class="kb-row" key={i}>{EN_LETTERS.slice(i, i + 7).map((L) => key(L, 'en'))}</div>);
  } else if (tab === 'vowels') {
    rows.push(<div class="kb-row" key="v1">{NE_VOWELS.slice(0, 7).map((L) => key(L, 'ne'))}</div>);
    rows.push(<div class="kb-row" key="v2">{NE_VOWELS.slice(7).map((L) => key(L, 'ne'))}</div>);
  } else if (tab === 'cons') {
    for (let r = 0; r < NE_CONSONANT_ROWS.length; r += 2) {
      rows.push(
        <div class="kb-row" key={r}>
          {NE_CONSONANT_ROWS[r].map((L) => key(L, 'ne'))}
          <span class="kb-gap" aria-hidden="true" />
          {NE_CONSONANT_ROWS[r + 1].map((L) => key(L, 'ne'))}
        </div>,
      );
    }
  } else {
    const digit = (n: number) => (
      <button type="button" class={`key${l === 'en' ? '' : ' ne'}`} key={n} aria-label={`${n}`} {...press(() => number(n))}>
        {l === 'en' ? n : neDigits(n)}
      </button>
    );
    rows.push(<div class="kb-row" key="n1">{[1, 2, 3, 4, 5].map(digit)}</div>);
    rows.push(<div class="kb-row" key="n2">{[6, 7, 8, 9, 0].map(digit)}</div>);
  }

  const rank = rankFor(taps);
  return (
    <section class="screen smash" aria-label="Smash and See">
      <div class="tally" aria-live="off">
        <span class="tally-n">{l === 'en' ? taps : neDigits(taps)}</span>
        <span class="tally-rank"><Bi t={rank} /></span>
      </div>
      <div
        class="playfield"
        ref={fieldRef}
        onPointerDown={(e) => {
          if ((e.target as HTMLElement).closest('.kb')) return;
          e.preventDefault();
          shape({ x: e.clientX, y: e.clientY });
        }}
        onContextMenu={(e) => e.preventDefault()}
      >
        {spawns.length === 0 && (
          <div class="smash-hint">
            <b><Bi t={{ en: 'Tap anywhere, or press a key', ne: 'जहाँ पनि थिच, वा अक्षर थिच' }} /></b>
          </div>
        )}
        {spawns.map((p) => (
          <div
            key={p.key}
            class={`item${p.bye ? ' bye' : ''}`}
            role="img"
            aria-label={p.label}
            style={{ left: `${p.x}px`, top: `${p.y}px`, '--rot': `${p.rot}deg`, '--c': p.color }}
          >
            <div class="inner" dangerouslySetInnerHTML={{ __html: p.html }} />
          </div>
        ))}
      </div>
      <div class={`kb${kbOpen ? '' : ' closed'}`}>
        <div class="kb-tabs" role="tablist" aria-label="Keyboard">
          {(
            [
              ['abc', 'ABC'],
              ['vowels', 'अ आ'],
              ['cons', 'क ख'],
              ['num', l === 'en' ? '123' : '१२३'],
            ] as Array<[Tab, string]>
          ).map(([t, label]) => (
            <button type="button" role="tab" key={t} aria-selected={tab === t} class={t === 'abc' ? '' : 'ne'} onClick={() => setTab(t)}>
              {label}
            </button>
          ))}
          <button type="button" class="kb-toggle" aria-label={kbOpen ? 'Hide keyboard' : 'Show keyboard'} onClick={() => setKbOpen((o) => !o)}>
            {kbOpen ? '▾' : '▴'}
          </button>
        </div>
        {kbOpen && <div class={`kb-keys tab-${tab}`}>{rows}</div>}
      </div>
    </section>
  );
}

