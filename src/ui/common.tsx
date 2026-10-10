import type { ComponentChildren } from 'preact';
import { useEffect, useRef, useState } from 'preact/hooks';
import { onPointer, pointer } from '../core/pointer';
import { giggle, unlockAudio } from '../core/audio';
import { lang } from '../core/settings';
import type { Bi as BiText } from '../content/strings';
import { art } from '../content/art';
import { feltPatternUrl } from '../core/felt';

/** Bilingual text: one language, or Nepali with English under it in "Both" mode. */
export function Bi({ t, class: cls = '' }: { t: BiText; class?: string }) {
  const l = lang.value;
  if (l === 'en') return <span class={cls} lang="en">{t.en}</span>;
  if (l === 'ne') return <span class={`${cls} ne`} lang="ne">{t.ne}</span>;
  return (
    <span class={`${cls} bi`}>
      <span class="ne" lang="ne">{t.ne}</span>
      <span class="en-sub" lang="en">{t.en}</span>
    </span>
  );
}

/** A felt illustration from content/art.ts. */
export function ItemArt({ id, class: cls = '', label }: { id: string; class?: string; label?: string }) {
  return (
    <svg
      class={`art ${cls}`}
      viewBox="0 0 120 120"
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : 'true'}
      dangerouslySetInnerHTML={{ __html: art(id) }}
    />
  );
}

/**
 * Habre, the red panda guide. His eyes follow the child's finger or mouse,
 * and a tap makes him bounce and giggle before doing the screen's own action.
 */
export function Habre({ class: cls = '', onTap }: { class?: string; onTap?: () => void }) {
  const ref = useRef<HTMLButtonElement>(null);
  const [boing, setBoing] = useState(false);

  useEffect(() => {
    let raf = 0;
    const off = onPointer(() => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        const el = ref.current;
        const look = el?.querySelector('.look');
        if (!el || !look) return;
        const r = el.getBoundingClientRect();
        const dx = pointer.x - (r.left + r.width / 2);
        const dy = pointer.y - (r.top + r.height / 2);
        const d = Math.hypot(dx, dy) || 1;
        const k = Math.min(1, d / 160) * 3.2;
        look.setAttribute('transform', `translate(${((dx / d) * k).toFixed(2)} ${((dy / d) * k).toFixed(2)})`);
      });
    });
    return () => {
      off();
      cancelAnimationFrame(raf);
    };
  }, []);

  const tap = () => {
    unlockAudio();
    setBoing(false);
    requestAnimationFrame(() => setBoing(true));
    giggle();
    onTap?.();
  };

  return (
    <button
      ref={ref}
      type="button"
      class={`habre ${cls}${boing ? ' boing' : ''}`}
      onClick={tap}
      onAnimationEnd={(e) => e.animationName === 'boing' && setBoing(false)}
      aria-label="Habre"
    >
      <ItemArt id="habre" />
    </button>
  );
}

/** Shared SVG defs: the felt-fibre pattern every illustration overlays. */
export function FeltDefs() {
  return (
    <svg width="0" height="0" style="position:absolute" aria-hidden="true" focusable="false">
      <defs>
        <pattern id="feltPat" patternUnits="userSpaceOnUse" width="40" height="40">
          <image href={feltPatternUrl} width="40" height="40" />
        </pattern>
      </defs>
    </svg>
  );
}

export function Stars({ n, max = 10 }: { n: number; max?: number }) {
  const shown = Math.min(n, max);
  return (
    <span class="stars" aria-label={`${n}`}>
      {Array.from({ length: shown }, (_, i) => (
        <svg key={i} viewBox="0 0 100 100" aria-hidden="true">
          <path
            d="M50 8 L61 38 L94 39 L68 59 L77 91 L50 72 L23 91 L32 59 L6 39 L39 38Z"
            fill="#F6C232"
            stroke="#F6C232"
            stroke-width="8"
            stroke-linejoin="round"
          />
        </svg>
      ))}
      {n > max && <span>+{n - max}</span>}
    </span>
  );
}

export function Seg<T extends string | number>({
  value,
  options,
  onPick,
  label,
}: {
  value: T;
  options: Array<{ v: T; label: ComponentChildren }>;
  onPick: (v: T) => void;
  label: string;
}) {
  return (
    <div class="seg" role="group" aria-label={label}>
      {options.map((o) => (
        <button type="button" key={String(o.v)} aria-pressed={o.v === value} onClick={() => onPick(o.v)}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

/** Confetti made of felt bits, launched from an element. Skipped in calm mode. */
export function burst(host: HTMLElement, from: HTMLElement, count = 20): void {
  if (document.documentElement.classList.contains('calm')) return;
  const hr = host.getBoundingClientRect();
  const fr = from.getBoundingClientRect();
  const ox = fr.left - hr.left + fr.width / 2;
  const oy = fr.top - hr.top + fr.height / 2;
  const colors = ['var(--red)', 'var(--orange)', 'var(--yellow)', 'var(--green)', 'var(--sky)', 'var(--purple)', 'var(--pink)'];
  for (let i = 0; i < count; i++) {
    const b = document.createElement('div');
    b.className = 'bit';
    const a = Math.random() * Math.PI * 2;
    const dist = 70 + Math.random() * 140;
    b.style.left = `${ox}px`;
    b.style.top = `${oy}px`;
    b.style.background = colors[i % colors.length];
    if (Math.random() < 0.5) b.style.borderRadius = '50%';
    b.style.setProperty('--dx', `${Math.cos(a) * dist}px`);
    b.style.setProperty('--dy', `${Math.sin(a) * dist - 40}px`);
    b.style.setProperty('--r', `${Math.round(Math.random() * 540)}deg`);
    host.appendChild(b);
    setTimeout(() => b.remove(), 1150);
  }
}
