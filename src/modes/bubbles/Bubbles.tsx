import { useEffect, useRef, useState } from 'preact/hooks';
import { lang } from '../../core/settings';
import { unlockAudio, cheer, sfx, mallet, PENTA } from '../../core/audio';
import { say, stopSpeech, type Part } from '../../core/voice';
import { award } from '../../core/rewards';
import { EN_LETTERS, NE_CONSONANTS } from '../../content/letters';
import { EN_NUM, NE_NUM, neDigits } from '../../content/numbers';
import { COLORS } from '../../content/shapes';
import { Bi } from '../../ui/common';
import { SpeakerIcon } from '../letters/Letters';
import { colorKey } from '../shapes/Shapes';

/**
 * Bubble Pop: felt-board bubbles float up; pop them with a finger. In the learning modes a
 * target is named ("Pop the B!") and popping it fills the progress row; other bubbles still
 * pop (popping is the fun part) and simply say what they were.
 */
type Mode = 'free' | 'abc' | 'kakha' | 'num' | 'color';
const GOAL = 6;
const MAX = 9;

interface Thing {
  key: string;
  label: string;
  /** Bubble tint (colour mode) */
  tint?: string;
  parts: (l: string) => Part[];
}

function things(mode: Mode, l: string): Thing[] {
  const one = (p: Part) => () => [p];
  const abc = EN_LETTERS.map((L) => ({ key: `en-${L.ch}`, label: L.ch, parts: one({ text: L.say, lang: 'en' }) }));
  const kakha = NE_CONSONANTS.slice(0, 25).map((L) => ({ key: `ne-${L.ch}`, label: L.ch, parts: one({ text: L.ch, lang: 'ne', clips: [`ne/letter-${L.ch}`] }) }));
  const num = Array.from({ length: 10 }, (_, i) => i + 1).map((n) => ({
    key: `n-${n}`,
    label: l === 'ne' ? neDigits(n) : String(n),
    parts: (lg: string): Part[] => {
      const ne: Part = { text: NE_NUM[n], lang: 'ne', clips: [`ne/num${n}`] };
      const en: Part = { text: EN_NUM[n], lang: 'en', clips: [`en/num${n}`] };
      return lg === 'en' ? [en] : lg === 'ne' ? [ne] : [ne, en];
    },
  }));
  const color = COLORS.map((c) => ({
    key: `c-${c.en}`,
    label: '',
    tint: c.hex,
    parts: (lg: string): Part[] => {
      const ne: Part = { text: c.ne, lang: 'ne', clips: [`ne/${colorKey(c)}`] };
      const en: Part = { text: c.en, lang: 'en', clips: [`en/${colorKey(c)}`] };
      return lg === 'en' ? [en] : lg === 'ne' ? [ne] : [ne, en];
    },
  }));
  if (mode === 'abc') return abc;
  if (mode === 'kakha') return kakha;
  if (mode === 'num') return num;
  if (mode === 'color') return color;
  return [...abc.slice(0, 10), ...num, ...color.slice(0, 5)];
}

interface Bubble {
  id: number;
  thing: Thing;
  x: number; // 0..1
  size: number; // px
  speed: number; // px per second
  phase: number;
  popped?: boolean;
}

let nextId = 1;

export function Bubbles() {
  const [mode, setMode] = useState<Mode>('free');
  const [bubbles, setBubbles] = useState<Bubble[]>([]);
  const [target, setTarget] = useState<Thing | null>(null);
  const [hits, setHits] = useState(0);
  const [pops, setPops] = useState(0);
  const fieldRef = useRef<HTMLDivElement>(null);
  const nodes = useRef(new Map<number, HTMLElement>());
  const ys = useRef(new Map<number, number>());
  const state = useRef({ bubbles: [] as Bubble[], target: null as Thing | null, mode: 'free' as Mode });
  const timers = useRef<number[]>([]);
  const later = (fn: () => void, ms: number) => timers.current.push(window.setTimeout(fn, ms));
  const clearTimers = () => {
    timers.current.forEach((t) => window.clearTimeout(t));
    timers.current = [];
  };
  state.current = { bubbles, target, mode };
  const l = lang.value;

  const pool = () => things(state.current.mode, lang.value);

  const promptTarget = (t: Thing) => {
    const lg = lang.value;
    const lead: Part[] = lg === 'en' ? [{ text: 'Pop', lang: 'en', clips: ['en/_pop'] }] : lg === 'ne' ? [] : [];
    const tail: Part[] = lg === 'ne' || lg === 'both' ? [{ text: 'फोड!', lang: 'ne', clips: ['ne/_pop'] }] : [];
    void say(lg === 'both' ? [...t.parts('ne'), ...tail, { text: 'Pop', lang: 'en', clips: ['en/_pop'] }, ...t.parts('en')] : [...lead, ...t.parts(lg), ...tail]);
  };

  const pickTarget = (m: Mode) => {
    if (m === 'free') {
      setTarget(null);
      return;
    }
    const p = things(m, lang.value);
    const t = p[Math.floor(Math.random() * p.length)];
    setTarget(t);
    setHits(0);
    later(() => promptTarget(t), 300);
  };

  useEffect(() => {
    clearTimers();
    state.current.bubbles = [];
    setBubbles([]);
    ys.current.clear();
    pickTarget(mode);
  }, [mode, l]);

  // Spawner
  useEffect(() => {
    const spawn = (prefill = false) => {
      const s = state.current;
      if (s.bubbles.filter((b) => !b.popped).length >= MAX) return;
      const p = pool();
      const t = s.target && Math.random() < 0.38 ? s.target : p[Math.floor(Math.random() * p.length)];
      const field = fieldRef.current;
      const w = field?.clientWidth ?? 800;
      const size = Math.round(Math.max(70, Math.min(130, w / 7)) * (0.8 + Math.random() * 0.4));
      const b: Bubble = { id: nextId++, thing: t, x: 0.06 + Math.random() * 0.88, size, speed: 45 + Math.random() * 45, phase: Math.random() * 6.28 };
      // The first few start part-way up, so the screen is never empty.
      if (prefill) ys.current.set(b.id, (field?.clientHeight ?? 600) * (0.25 + Math.random() * 0.7));
      s.bubbles = [...s.bubbles, b];
      setBubbles((bs) => [...bs, b]);
    };
    for (let i = 0; i < 5; i++) spawn(true);
    const iv = window.setInterval(() => spawn(), 950);
    return () => window.clearInterval(iv);
  }, [mode]);

  // Motion: positions are written straight to the DOM each frame (no re-render).
  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    const calm = document.documentElement.classList.contains('calm');
    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const field = fieldRef.current;
      const H = field?.clientHeight ?? 600;
      const W = field?.clientWidth ?? 800;
      const gone: number[] = [];
      for (const b of state.current.bubbles) {
        if (b.popped) continue;
        const el = nodes.current.get(b.id);
        let y = ys.current.get(b.id);
        if (y === undefined) y = H + 10;
        y -= b.speed * (calm ? 0.6 : 1) * dt;
        ys.current.set(b.id, y);
        if (y < -b.size - 20) gone.push(b.id);
        if (el) {
          const sway = calm ? 0 : Math.sin(now / 900 + b.phase) * 14;
          el.style.transform = `translate(${b.x * (W - b.size) + sway}px, ${y}px)`;
        }
      }
      if (gone.length) {
        gone.forEach((id) => ys.current.delete(id));
        setBubbles((bs) => bs.filter((x) => !gone.includes(x.id)));
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  useEffect(() => () => (clearTimers(), stopSpeech()), []);

  const pop = (b: Bubble) => {
    if (b.popped) return;
    unlockAudio();
    sfx('pop');
    setBubbles((bs) => bs.map((x) => (x.id === b.id ? { ...x, popped: true } : x)));
    later(() => {
      ys.current.delete(b.id);
      setBubbles((bs) => bs.filter((x) => x.id !== b.id));
    }, 380);
    const t = state.current.target;
    const lg = lang.value;
    if (t && b.thing.key === t.key) {
      if (hits >= GOAL) {
        void say(b.thing.parts(lg));
        return;
      }
      const h = hits + 1;
      setHits(h);
      sfx('sparkle');
      if (h >= GOAL) {
        cheer();
        award(2);
        void say(lg === 'en' ? [{ text: 'Well done!', lang: 'en', clips: ['en/_welldone'] }] : [{ text: 'स्याबास!', lang: 'ne', clips: ['ne/_welldone'] }]);
        later(() => pickTarget(state.current.mode), 1600);
      } else void say(b.thing.parts(lg));
      return;
    }
    const n = pops + 1;
    setPops(n);
    mallet(PENTA[n % PENTA.length], 0.22, 0.6);
    if (!t && n % 12 === 0) award(1);
    void say(b.thing.parts(lg === 'both' ? (b.thing.key.startsWith('ne-') ? 'ne' : b.thing.key.startsWith('en-') ? 'en' : 'both') : lg));
  };

  const MODES: Array<{ m: Mode; label: string; ne?: boolean }> = [
    { m: 'free', label: '★' },
    { m: 'abc', label: 'A B C' },
    { m: 'kakha', label: 'क ख ग', ne: true },
    { m: 'num', label: l === 'ne' ? '१ २ ३' : '1 2 3' },
    { m: 'color', label: '●●●' },
  ];

  return (
    <section class="screen bubbles" aria-label="Bubble Pop">
      <div class="bb-top">
        <div class="kid-tabs" role="group" aria-label="What is in the bubbles">
          {MODES.map((x) => (
            <button key={x.m} type="button" aria-pressed={mode === x.m} class={`${x.ne ? 'ne' : ''}${x.m === 'color' ? ' bb-colors' : ''}`} onClick={() => (unlockAudio(), setMode(x.m))}>
              {x.m === 'free' ? <Bi t={{ en: 'Pop all', ne: 'सबै फोड' }} /> : x.label}
            </button>
          ))}
        </div>
        {target && (
          <button type="button" class="bb-target" onClick={() => promptTarget(target)}>
            <SpeakerIcon />
            <Bi t={{ en: 'Pop', ne: 'फोड' }} />
            <span class="bb-mini" style={target.tint ? { '--tint': target.tint } : undefined}>
              {target.label}
            </span>
            <span class="bb-hits">
              {Array.from({ length: GOAL }, (_, i) => (
                <i key={i} class={i < hits ? 'on' : ''} />
              ))}
            </span>
          </button>
        )}
      </div>
      <div class="bb-field" ref={fieldRef}>
        {bubbles.map((b) => (
          <button
            key={b.id}
            type="button"
            ref={(el) => {
              if (el) nodes.current.set(b.id, el);
              else nodes.current.delete(b.id);
            }}
            class={`bubble-b${b.popped ? ' popped' : ''}${b.thing.key.startsWith('ne-') ? ' ne' : ''}`}
            style={{ width: `${b.size}px`, height: `${b.size}px`, fontSize: `${b.size * 0.42}px`, transform: `translate(${b.x * 600}px, 9999px)`, ...(b.thing.tint ? { '--tint': b.thing.tint } : {}) }}
            onPointerDown={() => pop(b)}
            aria-label={b.thing.label || b.thing.key}
          >
            {b.thing.label}
          </button>
        ))}
      </div>
    </section>
  );
}
