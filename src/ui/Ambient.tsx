import { useEffect, useRef } from 'preact/hooks';
import { onPointer } from '../core/pointer';
import { PENTA, mallet } from '../core/audio';

export type AmbientLevel = 'lively' | 'gentle' | 'off';

/**
 * The living felt board: stars, laligurans petals and felt dots drift down the board,
 * scatter away from a finger, and a finger or mouse leaves a trail of felt sparks.
 * Tapping an empty patch of felt makes a small burst (and, when lively, a soft note).
 *
 * One canvas, one animation loop, a hard cap on pieces, paused when the tab is hidden.
 * "Gentle" (used during learning games) keeps a few slow pieces and the trail, because a
 * busy background measurably pulls young children's attention away from the task.
 */
interface Piece {
  x: number; y: number; vx: number; vy: number; r: number; rot: number; vr: number;
  kind: 'star' | 'petal' | 'dot'; color: string; sway: number; phase: number; fall: number;
  life?: number; max?: number;
}

const COLORS = ['#E5483D', '#F28C28', '#F6C232', '#5DB646', '#5BB8EC', '#8D5CD0', '#EC6DA6', '#F4F1E6'];
const PETAL = ['#D7263D', '#E5483D', '#F05D6C'];

function starPath(ctx: CanvasRenderingContext2D, r: number) {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const rr = i % 2 ? r * 0.45 : r;
    ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
  }
  ctx.closePath();
}

export function Ambient({ level, tapSound }: { level: AmbientLevel; tapSound: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const cfg = useRef({ level, tapSound });
  cfg.current = { level, tapSound };

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    let w = 0, h = 0, dpr = 1, raf = 0, last = performance.now();
    const drift: Piece[] = [];
    const sparks: Piece[] = [];
    let lastTrail = 0;

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      dpr = Math.min(2, window.devicePixelRatio || 1);
      w = rect.width;
      h = rect.height;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
    };
    const makeDrift = (top: boolean): Piece => {
      const kind: Piece['kind'] = Math.random() < 0.35 ? 'star' : Math.random() < 0.55 ? 'petal' : 'dot';
      return {
        x: Math.random() * w, y: top ? -20 - Math.random() * 40 : Math.random() * h,
        vx: 0, vy: 0, fall: 14 + Math.random() * 24, r: kind === 'dot' ? 3 + Math.random() * 4 : 6 + Math.random() * 6,
        rot: Math.random() * Math.PI * 2, vr: (Math.random() - 0.5) * 1.2, kind,
        color: kind === 'petal' ? PETAL[(Math.random() * PETAL.length) | 0] : kind === 'star' ? (Math.random() < 0.5 ? '#F6C232' : '#F4F1E6') : COLORS[(Math.random() * COLORS.length) | 0],
        sway: 6 + Math.random() * 14, phase: Math.random() * Math.PI * 2,
      };
    };
    const target = () => (cfg.current.level === 'lively' ? 34 : cfg.current.level === 'gentle' ? 10 : 0);

    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    resize();
    for (let i = 0; i < target(); i++) drift.push(makeDrift(false));

    const local = (e: PointerEvent) => {
      const r = canvas.getBoundingClientRect();
      return { x: e.clientX - r.left, y: e.clientY - r.top, inside: e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom };
    };
    const spark = (x: number, y: number, speed: number, big = false) => {
      if (sparks.length > 140) sparks.shift();
      const a = Math.random() * Math.PI * 2;
      sparks.push({
        x, y, vx: Math.cos(a) * speed, vy: Math.sin(a) * speed - (big ? 30 : 0), r: big ? 4 + Math.random() * 5 : 2.5 + Math.random() * 3,
        rot: Math.random() * 6, vr: (Math.random() - 0.5) * 4, kind: big && Math.random() < 0.4 ? 'star' : 'dot',
        color: COLORS[(Math.random() * COLORS.length) | 0], sway: 0, phase: 0, fall: 0, life: 0, max: big ? 0.9 : 0.6,
      });
    };

    const off = onPointer((e, kind) => {
      if (cfg.current.level === 'off') return;
      const p = local(e);
      if (!p.inside) return;
      if (kind === 'move') {
        const now = performance.now();
        if (now - lastTrail < 28) return;
        lastTrail = now;
        spark(p.x, p.y, 18);
      } else {
        // Only a tap on bare felt bursts; taps on buttons and cards belong to the game.
        const el = e.target as HTMLElement | null;
        const bare = !el || !el.closest || !el.closest('button, a, input, .card, .bar, .thali, .panel-card, .kb, .item');
        if (!bare) return;
        const n = cfg.current.level === 'lively' ? 16 : 7;
        for (let i = 0; i < n; i++) spark(p.x, p.y, 60 + Math.random() * 90, true);
        if (cfg.current.tapSound && cfg.current.level === 'lively') mallet(PENTA[5 + ((Math.random() * 5) | 0)], 0.18, 0.9);
      }
      // push drifting pieces away from the finger
      for (const d of drift) {
        const dx = d.x - p.x, dy = d.y - p.y;
        const dist2 = dx * dx + dy * dy;
        if (dist2 < 110 * 110 && dist2 > 1) {
          const dist = Math.sqrt(dist2), f = (kind === 'down' ? 260 : 90) * (1 - dist / 110);
          d.vx += (dx / dist) * f;
          d.vy += (dy / dist) * f * 0.6;
          d.vr += (Math.random() - 0.5) * 3;
        }
      }
    });

    const draw = (p: Piece, alpha: number) => {
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.fillStyle = p.color;
      ctx.shadowColor = 'rgba(0,0,0,.25)';
      ctx.shadowOffsetY = 2;
      if (p.kind === 'star') {
        starPath(ctx, p.r);
        ctx.fill();
      } else if (p.kind === 'petal') {
        ctx.beginPath();
        ctx.ellipse(0, 0, p.r * 0.55, p.r, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowColor = 'transparent';
        ctx.strokeStyle = 'rgba(255,255,255,.35)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, -p.r * 0.7);
        ctx.lineTo(0, p.r * 0.7);
        ctx.stroke();
      } else {
        ctx.beginPath();
        ctx.arc(0, 0, p.r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    };

    const tick = (now: number) => {
      raf = requestAnimationFrame(tick);
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      if (cfg.current.level === 'off') {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        drift.length = 0;
        sparks.length = 0;
        return;
      }
      const want = target();
      while (drift.length < want) drift.push(makeDrift(true));
      if (drift.length > want) drift.length = want;
      const speed = cfg.current.level === 'lively' ? 1 : 0.55;

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);
      for (const d of drift) {
        d.phase += dt * 0.9;
        const damp = 1 - Math.min(1, dt * 2.2);
        d.vx *= damp;
        d.vy *= damp;
        d.x += (d.vx + Math.sin(d.phase) * d.sway * 0.6) * dt;
        d.y += (d.fall * speed + d.vy) * dt;
        d.rot += d.vr * dt;
        d.vr *= 1 - Math.min(1, dt * 0.8);
        if (d.y > h + 20) Object.assign(d, makeDrift(true));
        if (d.x < -30) d.x = w + 20;
        if (d.x > w + 30) d.x = -20;
        draw(d, d.kind === 'dot' ? 0.55 : 0.8);
      }
      for (let i = sparks.length - 1; i >= 0; i--) {
        const s = sparks[i];
        s.life! += dt;
        if (s.life! >= s.max!) {
          sparks.splice(i, 1);
          continue;
        }
        s.vx *= 1 - Math.min(1, dt * 3);
        s.vy = s.vy * (1 - Math.min(1, dt * 3)) + 80 * dt;
        s.x += s.vx * dt;
        s.y += s.vy * dt;
        s.rot += s.vr * dt;
        draw(s, 1 - s.life! / s.max!);
      }
    };
    raf = requestAnimationFrame(tick);

    const vis = () => {
      if (document.hidden) cancelAnimationFrame(raf);
      else {
        last = performance.now();
        raf = requestAnimationFrame(tick);
      }
    };
    document.addEventListener('visibilitychange', vis);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      off();
      document.removeEventListener('visibilitychange', vis);
    };
  }, []);

  return <canvas ref={ref} class="ambient" aria-hidden="true" />;
}
