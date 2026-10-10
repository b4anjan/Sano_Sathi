import { useEffect, useRef, useState } from 'preact/hooks';
import { signal, effect } from '@preact/signals';
import { lang } from '../../core/settings';
import { unlockAudio, beep, bloop, cheer, sfx } from '../../core/audio';
import { say, stopSpeech, type Part } from '../../core/voice';
import { award } from '../../core/rewards';
import { PHRASES, S, type Bi as BiText } from '../../content/strings';
import { COLORS, SHAPES, shapeSVG } from '../../content/shapes';
import { Bi, burst } from '../../ui/common';
import { Buddy } from '../../ui/Buddy';
import { LEVELS, NOTES, extend, levelConfig, type LevelCfg } from './levels';

/**
 * Copy Me (a Simon-style memory game). The blocks light up and sing a pattern; the child
 * taps the same blocks in the same order. Every round adds one more step. Fifteen levels:
 * 4 blocks at first, then 6, then 8, getting a little faster each level, and from level 6
 * the blocks sometimes change shape (colour, sound and place stay the same, so the pattern
 * is still fair). Finishing a level unlocks the next one; this device remembers how far
 * the child has got.
 */

type Phase = 'ready' | 'show' | 'input' | 'wait' | 'oops' | 'won';

/** Which colours a 4-, 6- or 8-block board uses (indexes into COLORS), low note to high. */
const PALETTE: Record<4 | 6 | 8, number[]> = {
  4: [0, 2, 3, 5], // red, yellow, green, blue: the classic four
  6: [0, 1, 2, 3, 5, 6],
  8: [0, 1, 2, 3, 4, 5, 6, 7],
};
/** Grid shape for landscape and portrait boards: [cols, rows]. */
const GRID: Record<4 | 6 | 8, { land: [number, number]; port: [number, number] }> = {
  4: { land: [2, 2], port: [2, 2] },
  6: { land: [3, 2], port: [2, 3] },
  8: { land: [4, 2], port: [2, 4] },
};
const SHAPE_IDS = SHAPES.map((s) => s.id);

const STORE = 'sanosathi.copyme.v1';
export interface CopyProgress {
  /** Highest level the child may play. */
  unlocked: number;
  /** The level last chosen. */
  level: number;
}
function load(): CopyProgress {
  try {
    const p = JSON.parse(localStorage.getItem(STORE) ?? 'null');
    const unlocked = Math.max(1, Math.min(LEVELS, Number(p?.unlocked) || 1));
    const level = Math.max(1, Math.min(unlocked, Number(p?.level) || 1));
    return { unlocked, level };
  } catch {
    return { unlocked: 1, level: 1 };
  }
}
/** This device's Copy Me progress (the grown-ups panel can open or reset levels). */
export const copyProgress = signal<CopyProgress>(load());
effect(() => {
  const v = copyProgress.value;
  try {
    localStorage.setItem(STORE, JSON.stringify(v));
  } catch {
    /* private mode: progress lasts for this visit only */
  }
});

function shapesFor(cfg: LevelCfg, prev?: string[]): string[] {
  if (cfg.shapes === 'fixed') return Array.from({ length: cfg.blocks }, () => 'square');
  // Deal shapes from shuffled decks, so a board uses as many different shapes as it can,
  // and never repeat the exact previous layout.
  const deal = () => {
    const out: string[] = [];
    while (out.length < cfg.blocks) out.push(...[...SHAPE_IDS].sort(() => Math.random() - 0.5));
    return out.slice(0, cfg.blocks);
  };
  let next = deal();
  for (let tries = 0; prev && next.join() === prev.join() && tries < 5; tries++) next = deal();
  return next;
}

const STATUS: Record<Phase, BiText> = {
  ready: { en: 'Press Start, then watch the lights.', ne: 'सुरु थिच, अनि बत्ती हेर।' },
  show: PHRASES.watch,
  input: PHRASES.yourTurn,
  wait: { en: 'Yes! One more…', ne: 'हो! अझै एउटा…' },
  oops: PHRASES.oops,
  won: PHRASES.levelUp,
};

export function CopyMe() {
  const saved = copyProgress.value;
  const level = saved.level;
  const cfg = levelConfig(level);
  const [phase, setPhase] = useState<Phase>('ready');
  const [seqLen, setSeqLen] = useState(0);
  const [pos, setPos] = useState(0);
  const [lit, setLit] = useState<number | null>(null);
  const [wrong, setWrong] = useState<number | null>(null);
  const [shapes, setShapes] = useState<string[]>(() => shapesFor(cfg));
  const [picker, setPicker] = useState(false);

  // Game state the async flow reads; React state above mirrors it for drawing.
  const g = useRef({ seq: [] as number[], pos: 0, phase: 'ready' as Phase });
  const token = useRef(0);
  const timers = useRef<number[]>([]);
  const litTimer = useRef<number>();
  const hostRef = useRef<HTMLElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const l = lang.value;

  const sleep = (ms: number) =>
    new Promise<void>((r) => {
      timers.current.push(window.setTimeout(r, ms));
    });
  const cancel = () => {
    token.current++;
    timers.current.forEach((t) => window.clearTimeout(t));
    timers.current = [];
    window.clearTimeout(litTimer.current);
    setLit(null);
  };
  const go = (p: Phase) => {
    g.current.phase = p;
    setPhase(p);
  };
  const parts = (t: BiText, key: string): Part[] => {
    const ne: Part = { text: t.ne, lang: 'ne', clips: [`ne/${key}`] };
    const en: Part = { text: t.en, lang: 'en', clips: [`en/${key}`] };
    return l === 'en' ? [en] : l === 'ne' ? [ne] : [ne, en];
  };

  /** Light one block and sing its note. */
  const flash = (b: number, ms: number, c: LevelCfg) => {
    window.clearTimeout(litTimer.current);
    setLit(b);
    beep(NOTES[c.blocks][b], ms / 1000 + 0.05);
    litTimer.current = window.setTimeout(() => setLit((x) => (x === b ? null : x)), ms);
  };

  /** Play the pattern, then hand over to the child. */
  const round = async (c: LevelCfg, my: number, first: boolean) => {
    go('show');
    g.current.pos = 0;
    setPos(0);
    setSeqLen(g.current.seq.length);
    await sleep(first ? 250 : 650);
    for (const b of g.current.seq) {
      if (token.current !== my) return;
      flash(b, c.flashMs, c);
      await sleep(c.flashMs + c.gapMs);
    }
    if (token.current !== my) return;
    go('input');
    if (first) void say(parts(PHRASES.yourTurn, '_yourTurn'));
  };

  const reset = (lv: number) => {
    cancel();
    stopSpeech();
    const c = levelConfig(lv);
    g.current = { seq: [], pos: 0, phase: 'ready' };
    setPhase('ready');
    setSeqLen(0);
    setPos(0);
    setWrong(null);
    setShapes(shapesFor(c));
  };

  const begin = async () => {
    unlockAudio();
    cancel();
    const my = token.current;
    const c = levelConfig(level);
    g.current.seq = extend([], c.blocks);
    go('show');
    setSeqLen(1);
    await Promise.all([say(parts(PHRASES.watch, '_watch')), sleep(700)]);
    if (token.current !== my) return;
    await round(c, my, true);
  };

  const levelDone = (c: LevelCfg) => {
    go('won');
    cheer();
    // One star a level, and a bonus at the end of each band (levels 5, 10 and 15).
    award(c.level % 5 === 0 ? 3 : 1);
    if (hostRef.current && gridRef.current) burst(hostRef.current, gridRef.current, 26);
    copyProgress.value = { unlocked: Math.min(LEVELS, Math.max(saved.unlocked, c.level + 1)), level: c.level };
    void say(parts(PHRASES.levelUp, '_levelUp'));
  };

  const tap = async (b: number) => {
    unlockAudio();
    const st = g.current;
    const c = cfg;
    if (st.phase !== 'input') {
      // Before Start, blocks are a little keyboard; during the show they wait quietly.
      if (st.phase === 'ready' || st.phase === 'won') flash(b, 260, c);
      return;
    }
    const my = token.current;
    if (b === st.seq[st.pos]) {
      flash(b, 260, c);
      st.pos++;
      setPos(st.pos);
      if (st.pos < st.seq.length) return;
      if (st.seq.length >= c.target) return levelDone(c);
      go('wait');
      st.seq = extend(st.seq, c.blocks);
      if (c.shapes === 'every' || (c.shapes === 'sometimes' && Math.random() < 0.4)) {
        await sleep(420);
        if (token.current !== my) return;
        setShapes((prev) => shapesFor(c, prev));
        sfx('swish');
      }
      await round(c, my, false);
      return;
    }
    // Wrong block: no score lost. Show it again (or start over on the hardest levels).
    go('oops');
    setWrong(b);
    bloop(330, 190, 0.22, 'triangle', 0.22);
    window.setTimeout(() => setWrong((x) => (x === b ? null : x)), 500);
    // Hold "Oops" on screen for a moment even when spoken words are off.
    await Promise.all([say(parts(PHRASES.oops, '_oops')), sleep(1100)]);
    if (token.current !== my) return;
    if (c.strict) st.seq = extend([], c.blocks);
    await round(c, my, false);
  };

  const pick = (lv: number) => {
    if (lv > saved.unlocked) {
      bloop(330, 260, 0.12);
      return;
    }
    setPicker(false);
    copyProgress.value = { ...saved, level: lv };
  };

  useEffect(() => {
    reset(level);
  }, [level]);
  useEffect(
    () => () => {
      cancel();
      stopSpeech();
    },
    [],
  );

  // Number keys 1–8 tap the blocks; Space or Enter starts. Ref pattern: one listener, fresh handler.
  const keyRef = useRef<(e: KeyboardEvent) => void>(() => {});
  keyRef.current = (e: KeyboardEvent) => {
    if (picker) return;
    const n = Number(e.key);
    if (n >= 1 && n <= cfg.blocks) {
      e.preventDefault();
      void tap(n - 1);
    } else if ((e.key === ' ' || e.key === 'Enter') && (phase === 'ready' || phase === 'won') && !(e.target as HTMLElement)?.closest?.('button')) {
      e.preventDefault();
      if (phase === 'won') {
        if (level < LEVELS) pick(level + 1);
        else void begin();
      } else void begin();
    }
  };
  useEffect(() => {
    const h = (e: KeyboardEvent) => keyRef.current(e);
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, []);

  const colors = PALETTE[cfg.blocks].map((i) => COLORS[i]);
  const grid = GRID[cfg.blocks];
  const done = phase === 'won';
  const last = level >= LEVELS;
  const stepsDone = phase === 'won' ? cfg.target : Math.max(0, seqLen - 1);

  return (
    <section class="screen copyme" ref={hostRef} aria-label="Copy Me">
      <div class="cm-top">
        <Buddy class="habre-small" />
        <div class="bubble left cm-status" aria-live="polite">
          <Bi t={STATUS[phase]} />
        </div>
        <div class="cm-progress" aria-label={`${stepsDone} of ${cfg.target}`}>
          {Array.from({ length: cfg.target }, (_, i) => (
            <i key={i} class={i < stepsDone ? 'on' : i === stepsDone && phase !== 'ready' ? 'now' : ''} />
          ))}
        </div>
        <div class="cm-level" role="group" aria-label="Level">
          <button type="button" class="cm-step" aria-label="Easier level" disabled={level <= 1} onClick={() => pick(level - 1)}>
            ‹
          </button>
          <button type="button" class="cm-lv" aria-haspopup="dialog" aria-expanded={picker} onClick={() => setPicker((p) => !p)}>
            <Bi t={{ en: `Level ${level}`, ne: `तह ${level}` }} />
            <span class="cm-band" aria-hidden="true">
              {'★'.repeat(cfg.band)}
            </span>
          </button>
          <button
            type="button"
            class="cm-step"
            aria-label="Harder level"
            disabled={level >= saved.unlocked}
            onClick={() => pick(level + 1)}
          >
            ›
          </button>
        </div>
      </div>

      <div class="cm-wrap">
        <div
          ref={gridRef}
          class={`cm-grid b${cfg.blocks}${phase === 'input' ? ' live' : ''}`}
          style={{ '--lc': grid.land[0], '--lr': grid.land[1], '--pc': grid.port[0], '--pr': grid.port[1] }}
        >
          {colors.map((c, i) => (
            <button
              key={i}
              type="button"
              class={`cm-block${lit === i ? ' lit' : ''}${wrong === i ? ' wrong' : ''}`}
              style={{ '--c': c.hex }}
              aria-label={`${i + 1}: ${c.en}, ${c.ne}`}
              onPointerDown={(e) => {
                e.preventDefault();
                void tap(i);
              }}
              onClick={(e) => {
                // Keyboard activation (Enter/Space on a focused block) arrives as a click with detail 0.
                if ((e as MouseEvent).detail === 0) void tap(i);
              }}
            >
              <span class="cm-shape" key={shapes[i]} dangerouslySetInnerHTML={{ __html: shapeSVG(shapes[i] ?? 'square', c.hex) }} />
            </button>
          ))}
        </div>

        {phase === 'ready' && (
          <div class="cm-over">
            <button type="button" class="pill-btn go cm-go" onClick={() => void begin()}>
              <span aria-hidden="true">▶</span>
              <Bi t={{ en: 'Start', ne: 'सुरु' }} />
            </button>
          </div>
        )}
        {done && (
          <div class="cm-over">
            <div class="cm-won">
              <b>
                <Bi t={last ? { en: 'You finished all 15 levels!', ne: 'सबै १५ तह पूरा!' } : PHRASES.levelUp} />
              </b>
              <span class="cm-won-stars" aria-hidden="true">
                {'★'.repeat(level % 5 === 0 ? 3 : 1)}
              </span>
              <div class="cm-won-btns">
                <button type="button" class="pill-btn" onClick={() => void begin()}>
                  <span aria-hidden="true">↻</span>
                  <Bi t={{ en: 'Again', ne: 'फेरि' }} />
                </button>
                {!last && (
                  <button type="button" class="pill-btn go" onClick={() => pick(level + 1)}>
                    <Bi t={{ en: `Level ${level + 1}`, ne: `तह ${level + 1}` }} />
                    <span aria-hidden="true">▶</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {picker && (
        <div class="cm-picker" role="dialog" aria-label="Choose a level" onClick={(e) => e.target === e.currentTarget && setPicker(false)}>
          <div class="cm-picker-card">
            <h2>
              <Bi t={{ en: 'Choose a level', ne: 'तह छान' }} />
            </h2>
            <div class="cm-picker-grid">
              {Array.from({ length: LEVELS }, (_, k) => {
                const lv = k + 1;
                const locked = lv > saved.unlocked;
                const c = levelConfig(lv);
                return (
                  <button
                    key={lv}
                    type="button"
                    class={`cm-pick b${c.band}${lv === level ? ' here' : ''}${locked ? ' locked' : ''}${lv < saved.unlocked ? ' passed' : ''}`}
                    aria-label={`Level ${lv}${locked ? ', locked' : ''}`}
                    aria-pressed={lv === level}
                    onClick={() => pick(lv)}
                  >
                    <b>{locked ? '🔒' : lv}</b>
                    <small>
                      {c.blocks} {lv < saved.unlocked ? '✓' : ''}
                    </small>
                  </button>
                );
              })}
            </div>
            <p class="cm-picker-note">
              <Bi t={{ en: 'Finish a level to open the next one.', ne: 'एउटा तह पूरा गरे अर्को खुल्छ।' }} />
            </p>
          </div>
        </div>
      )}
      <span class="sr-only">{S.copySub.en}</span>
      <span class="sr-only" aria-live="polite">
        {phase === 'input' ? `${pos} of ${seqLen}` : ''}
      </span>
    </section>
  );
}
