import { useEffect, useRef, useState } from 'preact/hooks';
import { unlockAudio, sfx, mallet, PENTA } from '../../core/audio';
import { stopSpeech } from '../../core/voice';
import { award } from '../../core/rewards';
import { art } from '../../content/art';
import { BRAND } from '../../brand';
import { Bi, ItemArt } from '../../ui/common';

/**
 * Felt Paint: free drawing with felt colours, a rainbow brush, sticker stamps from the
 * app's pictures, a mirror mode (both halves draw at once) and undo. Nothing is scored.
 */
type Tool = 'brush' | 'rainbow' | 'stamp' | 'eraser';
const COLORS = ['#2B2420', '#E5483D', '#F28C28', '#F6C232', '#5DB646', '#5BB8EC', '#3E6FD8', '#8D5CD0', '#EC6DA6', '#8A5A33'];
const SIZES = [8, 18, 34];
const STAMPS = ['tara', 'gham', 'jun', 'laligurans', 'biralo', 'kukur', 'habre', 'gai', 'machha', 'suntala', 'changa', 'dhaka-topi'];
const PAPER = '#FBF8F1';

const stampCache = new Map<string, HTMLImageElement>();
function stampImage(id: string): HTMLImageElement {
  let img = stampCache.get(id);
  if (!img) {
    // The felt-fibre overlay references a pattern on the page; drop it for a standalone image.
    const body = art(id).replace(/<(ellipse|rect|path)[^>]*fill="url\(#feltPat\)"[^>]*\/>/g, '');
    img = new Image();
    img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" width="240" height="240">${body}</svg>`)}`;
    stampCache.set(id, img);
  }
  return img;
}

export function Paint() {
  const [tool, setTool] = useState<Tool>('brush');
  const [color, setColor] = useState(COLORS[1]);
  const [size, setSize] = useState(1);
  const [stamp, setStamp] = useState(STAMPS[0]);
  const [mirror, setMirror] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);
  const [canUndo, setCanUndo] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const cvRef = useRef<HTMLCanvasElement>(null);
  const undo = useRef<ImageData[]>([]);
  const pen = useRef<{ x: number; y: number; hue: number } | null>(null);
  const finger = useRef<number | null>(null);
  const strokes = useRef(0);
  const dpr = Math.min(2, window.devicePixelRatio || 1);

  const ctx = () => cvRef.current?.getContext('2d') ?? null;

  const fillPaper = (c: CanvasRenderingContext2D, w: number, h: number) => {
    c.save();
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.fillStyle = PAPER;
    c.fillRect(0, 0, w, h);
    c.restore();
  };

  // Size the canvas to its box, keeping the drawing when the window resizes.
  useEffect(() => {
    const resize = () => {
      const cv = cvRef.current;
      const wrap = wrapRef.current;
      if (!cv || !wrap) return;
      const w = Math.round(wrap.clientWidth * dpr);
      const h = Math.round(wrap.clientHeight * dpr);
      if (cv.width === w && cv.height === h) return;
      // Keep the picture when the window or tablet rotates: copy it, then draw it back scaled.
      let copy: HTMLCanvasElement | null = null;
      if (cv.dataset.ready && cv.width && cv.height) {
        copy = document.createElement('canvas');
        copy.width = cv.width;
        copy.height = cv.height;
        copy.getContext('2d')?.drawImage(cv, 0, 0);
      }
      cv.dataset.ready = '1';
      cv.width = w;
      cv.height = h;
      const c = cv.getContext('2d');
      if (!c) return;
      fillPaper(c, w, h);
      if (copy) {
        const k = Math.min(w / copy.width, h / copy.height);
        c.drawImage(copy, (w - copy.width * k) / 2, (h - copy.height * k) / 2, copy.width * k, copy.height * k);
      }
      undo.current = [];
      setCanUndo(false);
    };
    resize();
    const ro = new ResizeObserver(resize);
    if (wrapRef.current) ro.observe(wrapRef.current);
    STAMPS.forEach(stampImage);
    return () => (ro.disconnect(), stopSpeech());
  }, []);

  const snapshot = () => {
    const c = ctx();
    const cv = cvRef.current;
    if (!c || !cv) return;
    undo.current.push(c.getImageData(0, 0, cv.width, cv.height));
    if (undo.current.length > 6) undo.current.shift();
    setCanUndo(true);
  };

  const pos = (e: PointerEvent) => {
    const r = cvRef.current!.getBoundingClientRect();
    return { x: (e.clientX - r.left) * dpr, y: (e.clientY - r.top) * dpr };
  };

  const line = (x0: number, y0: number, x1: number, y1: number, hue: number) => {
    const c = ctx();
    const cv = cvRef.current;
    if (!c || !cv) return;
    c.lineCap = 'round';
    c.lineJoin = 'round';
    c.lineWidth = SIZES[size] * dpr * (tool === 'eraser' ? 1.6 : 1);
    c.strokeStyle = tool === 'eraser' ? PAPER : tool === 'rainbow' ? `hsl(${hue % 360} 85% 55%)` : color;
    const seg = (a: number, b: number, cc: number, d: number) => {
      c.beginPath();
      c.moveTo(a, b);
      c.lineTo(cc, d);
      c.stroke();
    };
    seg(x0, y0, x1, y1);
    if (mirror) seg(cv.width - x0, y0, cv.width - x1, y1);
  };

  const place = (x: number, y: number) => {
    const c = ctx();
    const cv = cvRef.current;
    if (!c || !cv) return;
    const img = stampImage(stamp);
    const s = [70, 120, 180][size] * dpr;
    const draw = (px: number) => c.drawImage(img, px - s / 2, y - s / 2, s, s);
    if (img.complete) {
      draw(x);
      if (mirror) draw(cv.width - x);
    } else img.onload = () => (draw(x), mirror && draw(cv.width - x));
    sfx('pop');
  };

  const down = (e: PointerEvent) => {
    e.preventDefault();
    if (finger.current !== null) return;
    unlockAudio();
    setConfirmClear(false);
    (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
    snapshot();
    const p = pos(e);
    if (tool === 'stamp') {
      place(p.x, p.y);
      return;
    }
    finger.current = e.pointerId;
    pen.current = { ...p, hue: Math.random() * 360 };
    line(p.x, p.y, p.x + 0.1, p.y, pen.current.hue);
    mallet(PENTA[Math.floor(Math.random() * PENTA.length)], 0.08, 0.3);
  };
  const move = (e: PointerEvent) => {
    const pn = pen.current;
    if (!pn || e.pointerId !== finger.current) return;
    const p = pos(e);
    const d = Math.hypot(p.x - pn.x, p.y - pn.y);
    if (d < 1.5) return;
    pn.hue += d * 0.35;
    line(pn.x, pn.y, p.x, p.y, pn.hue);
    pn.x = p.x;
    pn.y = p.y;
  };
  const up = (e: PointerEvent) => {
    if (e.pointerId !== finger.current) return;
    finger.current = null;
    if (!pen.current) return;
    pen.current = null;
    strokes.current++;
    if (strokes.current % 25 === 0) award(1);
  };

  const doUndo = () => {
    const c = ctx();
    const last = undo.current.pop();
    if (c && last) c.putImageData(last, 0, 0);
    setCanUndo(undo.current.length > 0);
    sfx('swish');
  };
  const doClear = () => {
    if (!confirmClear) {
      setConfirmClear(true);
      return;
    }
    snapshot();
    const c = ctx();
    const cv = cvRef.current;
    if (c && cv) fillPaper(c, cv.width, cv.height);
    setConfirmClear(false);
    sfx('swish');
  };
  const save = () => {
    const cv = cvRef.current;
    if (!cv) return;
    try {
      const a = document.createElement('a');
      a.download = `${BRAND.appName.toLowerCase().replace(/\s+/g, '-')}-drawing.png`;
      a.href = cv.toDataURL('image/png');
      a.click();
      sfx('sparkle');
    } catch {
      /* saving blocked in this browser */
    }
  };

  const toolBtn = (t: Tool, label: { en: string; ne: string }, icon: string) => (
    <button type="button" class={`pt-tool${tool === t ? ' on' : ''}`} aria-pressed={tool === t} onClick={() => (unlockAudio(), setTool(t), sfx('pop'))}>
      <span class="pt-ico" aria-hidden="true">{icon}</span>
      <Bi t={label} />
    </button>
  );

  return (
    <section class="screen paint" aria-label="Felt Paint">
      <div class="pt-bar">
        <div class="pt-group">
          {toolBtn('brush', { en: 'Brush', ne: 'कुची' }, '🖌')}
          {toolBtn('rainbow', { en: 'Rainbow', ne: 'इन्द्रेणी' }, '🌈')}
          {toolBtn('stamp', { en: 'Stickers', ne: 'छाप' }, '⭐')}
          {toolBtn('eraser', { en: 'Eraser', ne: 'मेटाउने' }, '🧽')}
        </div>
        {tool === 'stamp' ? (
          <div class="pt-group pt-stamps">
            {STAMPS.map((s) => (
              <button key={s} type="button" class={`pt-stamp${stamp === s ? ' on' : ''}`} aria-pressed={stamp === s} onClick={() => (setStamp(s), sfx('pop'))} aria-label={s}>
                <ItemArt id={s} />
              </button>
            ))}
          </div>
        ) : (
          <div class="pt-group pt-colors">
            {COLORS.map((c) => (
              <button
                key={c}
                type="button"
                class={`pt-color${color === c && tool === 'brush' ? ' on' : ''}`}
                style={{ '--c': c }}
                aria-label={`Colour ${c}`}
                aria-pressed={color === c}
                onClick={() => (unlockAudio(), setColor(c), tool !== 'brush' && setTool('brush'), mallet(PENTA[COLORS.indexOf(c) % PENTA.length], 0.15, 0.4))}
              />
            ))}
          </div>
        )}
        <div class="pt-group">
          {SIZES.map((s, i) => (
            <button key={s} type="button" class={`pt-size${size === i ? ' on' : ''}`} aria-pressed={size === i} aria-label={['Small', 'Medium', 'Big'][i]} onClick={() => setSize(i)}>
              <i style={{ width: `${8 + i * 9}px`, height: `${8 + i * 9}px` }} />
            </button>
          ))}
          <button type="button" class={`pt-tool${mirror ? ' on' : ''}`} aria-pressed={mirror} onClick={() => (setMirror((m) => !m), sfx('sparkle'))}>
            <span class="pt-ico" aria-hidden="true">🦋</span>
            <Bi t={{ en: 'Mirror', ne: 'ऐना' }} />
          </button>
          <button type="button" class="pt-tool" disabled={!canUndo} onClick={doUndo}>
            <span class="pt-ico" aria-hidden="true">↶</span>
            <Bi t={{ en: 'Undo', ne: 'फर्काऊ' }} />
          </button>
          <button type="button" class={`pt-tool${confirmClear ? ' warn' : ''}`} onClick={doClear}>
            <span class="pt-ico" aria-hidden="true">🗑</span>
            <Bi t={confirmClear ? { en: 'Tap again', ne: 'फेरि थिच' } : { en: 'New', ne: 'नयाँ' }} />
          </button>
          <button type="button" class="pt-tool" onClick={save}>
            <span class="pt-ico" aria-hidden="true">💾</span>
            <Bi t={{ en: 'Save', ne: 'राख' }} />
          </button>
        </div>
      </div>
      <div class={`pt-canvas${mirror ? ' mirror' : ''}`} ref={wrapRef}>
        <canvas ref={cvRef} onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up} aria-label="Drawing paper" role="img" />
      </div>
    </section>
  );
}
