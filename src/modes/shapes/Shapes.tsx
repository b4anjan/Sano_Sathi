import { useEffect, useRef, useState } from 'preact/hooks';
import { lang, shapesLevel, type Level } from '../../core/settings';
import { unlockAudio, cheer, bloop, sfx, mallet, PENTA } from '../../core/audio';
import { say, stopSpeech, type Part } from '../../core/voice';
import { award } from '../../core/rewards';
import { SHAPES, COLORS, shapeSVG } from '../../content/shapes';
import { Bi, Stars, burst } from '../../ui/common';
import { Buddy } from '../../ui/Buddy';

/**
 * Shapes & Colors: sort felt shapes into baskets, by colour or by shape.
 * Drag a shape onto its basket, or tap the basket. A wrong basket just says what the
 * shape is and sends it back; there is nothing to lose.
 */
const PER_ROUND = 8;
type Rule = 'color' | 'shape';
type ShapeId = (typeof SHAPES)[number]['id'];
type Color = (typeof COLORS)[number];
interface Piece {
  shape: ShapeId;
  color: Color;
}

export const colorKey = (c: Color) => `color-${c.en.replace(/\s+/g, '-')}`;
export const shapeKey = (s: ShapeId) => `shape-${s}`;

const pickN = <T,>(xs: readonly T[], n: number): T[] => [...xs].sort(() => Math.random() - 0.5).slice(0, n);

function makeRound(level: Level): { rule: Rule; bins: string[] } {
  const rule: Rule = level === 1 ? 'color' : level === 2 ? 'shape' : Math.random() < 0.5 ? 'color' : 'shape';
  const n = level === 1 ? 2 : level === 2 ? 3 : 4;
  const bins = rule === 'color' ? pickN(COLORS, n).map((c) => c.en) : pickN(SHAPES, n).map((s) => s.id);
  return { rule, bins };
}

function makePiece(rule: Rule, bins: string[]): Piece {
  const bin = bins[Math.floor(Math.random() * bins.length)];
  if (rule === 'color') return { color: COLORS.find((c) => c.en === bin)!, shape: SHAPES[Math.floor(Math.random() * SHAPES.length)].id };
  return { shape: bin as ShapeId, color: COLORS[Math.floor(Math.random() * COLORS.length)] };
}

export function Shapes() {
  const level = shapesLevel.value;
  const [round, setRound] = useState(() => makeRound(level));
  const [piece, setPiece] = useState<Piece>(() => makePiece(round.rule, round.bins));
  const [sorted, setSorted] = useState<Record<string, Piece[]>>({});
  const [count, setCount] = useState(0);
  const [drag, setDrag] = useState<{ x: number; y: number } | null>(null);
  const [back, setBack] = useState(false);
  const [hot, setHot] = useState<string | null>(null);
  const [stars, setStars] = useState(0);
  const hostRef = useRef<HTMLElement>(null);
  const pieceRef = useRef<HTMLButtonElement>(null);
  const start = useRef<{ x: number; y: number; moved: boolean } | null>(null);
  /** True between a correct drop and the next piece (or round), so double taps don't count twice. */
  const busy = useRef(false);
  const timers = useRef<number[]>([]);
  const l = lang.value;

  const later = (fn: () => void, ms: number) => timers.current.push(window.setTimeout(fn, ms));
  const pieceParts = (p: Piece, tail?: { en: string; ne: string }): Part[] => {
    const sh = SHAPES.find((s) => s.id === p.shape)!;
    const ne: Part[] = [
      { text: `${p.color.ne} ${sh.ne}`, lang: 'ne', clips: [`ne/${colorKey(p.color)}`, `ne/${shapeKey(p.shape)}`] },
      ...(tail ? [{ text: tail.ne, lang: 'ne' as const }] : []),
    ];
    const en: Part[] = [
      { text: `${p.color.en} ${sh.en}`, lang: 'en', clips: [`en/${colorKey(p.color)}`, `en/${shapeKey(p.shape)}`] },
      ...(tail ? [{ text: tail.en, lang: 'en' as const }] : []),
    ];
    return l === 'en' ? en : l === 'ne' ? ne : [...ne, ...en];
  };

  const newRound = (lv: Level) => {
    const r = makeRound(lv);
    setRound(r);
    const p = makePiece(r.rule, r.bins);
    setPiece(p);
    setSorted({});
    setCount(0);
    busy.current = false;
    later(() => void say(pieceParts(p, { en: 'Where does it go?', ne: 'कहाँ राख्ने?' })), 400);
  };

  useEffect(() => {
    timers.current.forEach((t) => window.clearTimeout(t));
    timers.current = [];
    newRound(level);
    return () => {
      timers.current.forEach((t) => window.clearTimeout(t));
      stopSpeech();
    };
  }, [level]);

  const binOf = (p: Piece) => (round.rule === 'color' ? p.color.en : p.shape);

  const drop = (bin: string, el?: HTMLElement | null) => {
    unlockAudio();
    setDrag(null);
    setHot(null);
    if (busy.current) return;
    if (bin === binOf(piece)) {
      busy.current = true;
      const n = count + 1;
      sfx('pop');
      mallet(PENTA[n % PENTA.length], 0.3, 0.8);
      setSorted((s) => ({ ...s, [bin]: [...(s[bin] ?? []), piece] }));
      setCount(n);
      if (hostRef.current && el) burst(hostRef.current, el, 10);
      if (n >= PER_ROUND) {
        cheer();
        award(2);
        setStars((x) => x + 1);
        void say(l === 'en' ? [{ text: 'All sorted! Well done!', lang: 'en', clips: ['en/_welldone'] }] : l === 'ne' ? [{ text: 'सबै मिल्यो! स्याबास!', lang: 'ne', clips: ['ne/_welldone'] }] : [{ text: 'सबै मिल्यो! स्याबास!', lang: 'ne', clips: ['ne/_welldone'] }, { text: 'All sorted! Well done!', lang: 'en', clips: ['en/_welldone'] }]);
        later(() => newRound(level), 2400);
        return;
      }
      void say(pieceParts(piece));
      const p = makePiece(round.rule, round.bins);
      later(() => {
        setPiece(p);
        busy.current = false;
      }, 350);
    } else {
      bloop(420, 300, 0.14);
      setBack(true);
      later(() => setBack(false), 450);
      void say(pieceParts(piece, { en: 'Try another basket.', ne: 'अर्को डालो हेर।' }));
    }
  };

  const binAt = (x: number, y: number): HTMLElement | null => {
    for (const el of document.elementsFromPoint(x, y)) {
      const b = (el as HTMLElement).closest?.('[data-bin]') as HTMLElement | null;
      if (b) return b;
    }
    return null;
  };

  const down = (e: PointerEvent) => {
    unlockAudio();
    (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
    start.current = { x: e.clientX, y: e.clientY, moved: false };
    sfx('swish');
  };
  const move = (e: PointerEvent) => {
    const s = start.current;
    if (!s) return;
    const dx = e.clientX - s.x;
    const dy = e.clientY - s.y;
    if (!s.moved && Math.hypot(dx, dy) < 6) return;
    s.moved = true;
    setDrag({ x: dx, y: dy });
    setHot(binAt(e.clientX, e.clientY)?.dataset.bin ?? null);
  };
  const up = (e: PointerEvent) => {
    const s = start.current;
    start.current = null;
    if (!s) return;
    if (!s.moved) {
      void say(pieceParts(piece, { en: 'Where does it go?', ne: 'कहाँ राख्ने?' }));
      return;
    }
    const b = binAt(e.clientX, e.clientY);
    if (b?.dataset.bin) drop(b.dataset.bin, b);
    else {
      setDrag(null);
      setHot(null);
    }
  };

  const binLabel = (bin: string) => {
    if (round.rule === 'color') {
      const c = COLORS.find((x) => x.en === bin)!;
      return { t: { en: c.en, ne: c.ne }, swatch: <span class="bin-swatch" style={{ background: c.hex }} /> };
    }
    const s = SHAPES.find((x) => x.id === bin)!;
    return { t: { en: s.en, ne: s.ne }, swatch: <span class="bin-shape" dangerouslySetInnerHTML={{ __html: shapeSVG(s.id, '#F3E9D2') }} /> };
  };

  return (
    <section class="screen shapes" ref={hostRef} aria-label="Shapes and Colors">
      <div class="sh-top">
        <Buddy class="habre-small" />
        <div class="bubble left">
          <Bi t={round.rule === 'color' ? { en: 'Sort by color!', ne: 'रङ हेरेर छुट्याऊ!' } : { en: 'Sort by shape!', ne: 'आकार हेरेर छुट्याऊ!' }} />
        </div>
        <div class="sh-progress" aria-label={`${count} of ${PER_ROUND}`}>
          {Array.from({ length: PER_ROUND }, (_, i) => (
            <i key={i} class={i < count ? 'on' : ''} />
          ))}
        </div>
        <Stars n={stars} max={5} />
        <div class="kid-tabs shop-levels" role="group" aria-label="Level">
          {([1, 2, 3] as Level[]).map((lv) => (
            <button key={lv} type="button" aria-pressed={level === lv} onClick={() => (shapesLevel.value = lv)}>
              {'★'.repeat(lv)}
            </button>
          ))}
        </div>
      </div>

      <div class="sh-stage">
        <button
          ref={pieceRef}
          type="button"
          class={`sh-piece${drag ? ' dragging' : ''}${back ? ' back' : ''}`}
          style={drag ? { transform: `translate(${drag.x}px, ${drag.y}px) scale(1.08)` } : undefined}
          onPointerDown={down}
          onPointerMove={move}
          onPointerUp={up}
          onPointerCancel={() => ((start.current = null), setDrag(null), setHot(null))}
          aria-label={`${piece.color.en} ${piece.shape}. Drag it to a basket, or tap a basket.`}
          key={`${count}-${piece.shape}-${piece.color.en}`}
          dangerouslySetInnerHTML={{ __html: shapeSVG(piece.shape, piece.color.hex) }}
        />
      </div>

      <div class={`sh-bins n${round.bins.length}`}>
        {round.bins.map((bin) => {
          const lab = binLabel(bin);
          return (
            <button key={bin} type="button" data-bin={bin} class={`sh-bin${hot === bin ? ' hot' : ''}`} onClick={(e) => drop(bin, e.currentTarget as HTMLElement)}>
              <span class="bin-in" aria-hidden="true">
                {(sorted[bin] ?? []).map((p, i) => (
                  <span key={i} class="bin-item" dangerouslySetInnerHTML={{ __html: shapeSVG(p.shape, p.color.hex) }} />
                ))}
              </span>
              <span class="bin-basket" aria-hidden="true" />
              <span class="bin-label">
                {lab.swatch}
                <Bi t={lab.t} />
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
