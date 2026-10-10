import { useEffect, useRef } from 'preact/hooks';
import { GRID, alphaMask, passed, scoreTrace } from '../core/trace';
import { unlockAudio, mallet, PENTA } from '../core/audio';

/**
 * A chalk-on-felt tracing board for one letter or number.
 * The glyph is drawn as a dotted guide; the child traces it with a finger or mouse in felt
 * colours. After every stroke the trace is scored (core/trace.ts); onPass fires once.
 */

const INKS = ['#F6C232', '#5BB8EC', '#EC6DA6', '#5DB646', '#F28C28', '#8D5CD0', '#E5483D'];
const FONT = '"Baloo 2", "Nirmala UI", "Kohinoor Devanagari", "Noto Sans Devanagari", system-ui, sans-serif';

type Pt = [number, number];

function glyphFont(glyph: string, side: number): string {
  const devanagari = /[ऀ-ॿ]/.test(glyph);
  const k = devanagari ? (glyph.length > 1 ? 0.5 : 0.62) : glyph.length > 1 ? 0.55 : 0.74;
  return `800 ${Math.round(side * k)}px ${FONT}`;
}

/** Draw the glyph centred in a square of `side` at (ox, oy), by its real ink box. */
function placeGlyph(ctx: CanvasRenderingContext2D, glyph: string, side: number, ox: number, oy: number): { x: number; y: number } {
  ctx.font = glyphFont(glyph, side);
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  const m = ctx.measureText(glyph);
  const left = m.actualBoundingBoxLeft ?? 0;
  const right = m.actualBoundingBoxRight ?? m.width;
  const asc = m.actualBoundingBoxAscent ?? side * 0.5;
  const desc = m.actualBoundingBoxDescent ?? 0;
  const x = ox + side / 2 - (right - left) / 2 + left;
  const y = oy + side / 2 + (asc - desc) / 2;
  return { x, y };
}

export function TraceBoard({
  glyph,
  done,
  clearKey,
  onPass,
  onProgress,
}: {
  glyph: string;
  /** When true the glyph is shown filled in, as a reward. */
  done: boolean;
  /** Change it to wipe the board. */
  clearKey: number;
  onPass: () => void;
  onProgress?: (coverage: number) => void;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const guideRef = useRef<HTMLCanvasElement>(null);
  const inkRef = useRef<HTMLCanvasElement>(null);
  const strokes = useRef<Array<{ c: string; pts: Pt[] }>>([]);
  const mask = useRef<Uint8Array | null>(null);
  const geo = useRef({ side: 0, ox: 0, oy: 0, dpr: 1 });
  const drawing = useRef<{ c: string; pts: Pt[] } | null>(null);
  const passedRef = useRef(false);
  const inkIdx = useRef(0);
  const doneRef = useRef(done);
  doneRef.current = done;

  const drawGuide = () => {
    const cv = guideRef.current;
    if (!cv) return;
    const ctx = cv.getContext('2d');
    if (!ctx) return;
    const { side, ox, oy, dpr } = geo.current;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, cv.width, cv.height);
    // A softer felt square behind the letter.
    ctx.fillStyle = 'rgba(0,0,0,0.12)';
    const r = side * 0.06;
    if (typeof ctx.roundRect === 'function') {
      ctx.beginPath();
      ctx.roundRect(ox + 4, oy + 4, side - 8, side - 8, r);
      ctx.fill();
    }
    const { x, y } = placeGlyph(ctx, glyph, side, ox, oy);
    if (doneRef.current) {
      ctx.fillStyle = INKS[(inkIdx.current + 3) % INKS.length];
      ctx.fillText(glyph, x, y);
      ctx.lineWidth = side * 0.012;
      ctx.setLineDash([side * 0.02, side * 0.016]);
      ctx.strokeStyle = 'rgba(255,255,255,0.8)';
      ctx.strokeText(glyph, x, y);
      return;
    }
    ctx.fillStyle = 'rgba(255,255,255,0.14)';
    ctx.fillText(glyph, x, y);
    ctx.lineWidth = Math.max(2, side * 0.009);
    ctx.setLineDash([side * 0.022, side * 0.02]);
    ctx.lineCap = 'round';
    ctx.strokeStyle = 'rgba(255,255,255,0.7)';
    ctx.strokeText(glyph, x, y);
    ctx.setLineDash([]);
  };

  const drawInk = () => {
    const cv = inkRef.current;
    if (!cv) return;
    const ctx = cv.getContext('2d');
    if (!ctx) return;
    const { side, ox, oy, dpr } = geo.current;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, cv.width, cv.height);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = side * 0.07;
    for (const s of strokes.current) {
      ctx.strokeStyle = s.c;
      ctx.beginPath();
      s.pts.forEach(([px, py], i) => (i ? ctx.lineTo(ox + px * side, oy + py * side) : ctx.moveTo(ox + px * side, oy + py * side)));
      if (s.pts.length === 1) ctx.lineTo(ox + s.pts[0][0] * side + 0.1, oy + s.pts[0][1] * side);
      ctx.stroke();
    }
  };

  const buildMask = () => {
    const c = document.createElement('canvas');
    c.width = c.height = GRID;
    const ctx = c.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;
    const { x, y } = placeGlyph(ctx, glyph, GRID, 0, 0);
    ctx.fillStyle = '#000';
    ctx.fillText(glyph, x, y);
    mask.current = alphaMask(ctx.getImageData(0, 0, GRID, GRID).data);
  };

  const score = () => {
    if (!mask.current) buildMask();
    if (!mask.current) return;
    const c = document.createElement('canvas');
    c.width = c.height = GRID;
    const ctx = c.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = GRID * 0.13;
    ctx.strokeStyle = '#000';
    for (const s of strokes.current) {
      ctx.beginPath();
      s.pts.forEach(([px, py], i) => (i ? ctx.lineTo(px * GRID, py * GRID) : ctx.moveTo(px * GRID, py * GRID)));
      if (s.pts.length === 1) ctx.lineTo(s.pts[0][0] * GRID + 0.1, s.pts[0][1] * GRID);
      ctx.stroke();
    }
    const sc = scoreTrace(mask.current, alphaMask(ctx.getImageData(0, 0, GRID, GRID).data));
    onProgress?.(sc.coverage);
    if (!passedRef.current && passed(sc)) {
      passedRef.current = true;
      onPass();
    }
  };

  const layout = () => {
    const wrap = wrapRef.current;
    if (!wrap) return;
    const w = wrap.clientWidth;
    const h = wrap.clientHeight;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const side = Math.max(120, Math.min(w, h) - 8);
    geo.current = { side, ox: (w - side) / 2, oy: (h - side) / 2, dpr };
    for (const cv of [guideRef.current, inkRef.current]) {
      if (!cv) continue;
      cv.width = Math.round(w * dpr);
      cv.height = Math.round(h * dpr);
      cv.style.width = `${w}px`;
      cv.style.height = `${h}px`;
    }
    drawGuide();
    drawInk();
  };

  // New glyph or wipe: reset strokes, rebuild the mask once fonts are ready.
  useEffect(() => {
    strokes.current = [];
    passedRef.current = false;
    mask.current = null;
    onProgress?.(0);
    layout();
    const fonts = (document as Document & { fonts?: FontFaceSet }).fonts;
    let alive = true;
    const redo = () => {
      if (!alive) return;
      mask.current = null;
      layout();
    };
    fonts?.load?.(glyphFont(glyph, 100), glyph).then(redo, redo);
    return () => {
      alive = false;
    };
  }, [glyph, clearKey]);

  useEffect(() => {
    drawGuide();
  }, [done]);

  useEffect(() => {
    const ro = new ResizeObserver(() => layout());
    if (wrapRef.current) ro.observe(wrapRef.current);
    return () => ro.disconnect();
  }, [glyph]);

  const toPt = (e: PointerEvent): Pt => {
    const r = inkRef.current!.getBoundingClientRect();
    const { side, ox, oy } = geo.current;
    return [(e.clientX - r.left - ox) / side, (e.clientY - r.top - oy) / side];
  };

  const down = (e: PointerEvent) => {
    if (doneRef.current) return;
    e.preventDefault();
    unlockAudio();
    (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
    const c = INKS[inkIdx.current++ % INKS.length];
    drawing.current = { c, pts: [toPt(e)] };
    strokes.current.push(drawing.current);
    mallet(PENTA[inkIdx.current % PENTA.length], 0.12, 0.4);
    drawInk();
  };
  const move = (e: PointerEvent) => {
    const s = drawing.current;
    if (!s) return;
    const p = toPt(e);
    const last = s.pts[s.pts.length - 1];
    if (Math.hypot(p[0] - last[0], p[1] - last[1]) < 0.006) return;
    s.pts.push(p);
    drawInk();
  };
  const up = () => {
    if (!drawing.current) return;
    drawing.current = null;
    score();
  };

  return (
    <div class="trace" ref={wrapRef}>
      <canvas ref={guideRef} class="trace-guide" aria-hidden="true" />
      <canvas
        ref={inkRef}
        class="trace-ink"
        role="img"
        aria-label={`Trace ${glyph}`}
        onPointerDown={down}
        onPointerMove={move}
        onPointerUp={up}
        onPointerCancel={up}
      />
    </div>
  );
}
