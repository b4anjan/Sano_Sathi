import { useEffect, useRef } from 'preact/hooks';
import { lang } from '../../core/settings';
import { unlockAudio, mallet } from '../../core/audio';

/** One octave of C major. Nepali labels use sargam (सा रे ग म प ध नि सां). */
const NOTES = [
  { f: 523.25, so: 'Do', sa: 'सा', k: 'A', c: 'red' },
  { f: 587.33, so: 'Re', sa: 'रे', k: 'S', c: 'orange' },
  { f: 659.25, so: 'Mi', sa: 'ग', k: 'D', c: 'yellow' },
  { f: 698.46, so: 'Fa', sa: 'म', k: 'F', c: 'green' },
  { f: 783.99, so: 'Sol', sa: 'प', k: 'G', c: 'sky' },
  { f: 880.0, so: 'La', sa: 'ध', k: 'H', c: 'blue' },
  { f: 987.77, so: 'Ti', sa: 'नि', k: 'J', c: 'purple' },
  { f: 1046.5, so: 'Do', sa: 'सां', k: 'K', c: 'pink' },
];

/**
 * Free-play xylophone. Tap a bar, slide a finger across bars, or use the keyboard
 * (A to K, or 1 to 8; every other key plays something too). No score, no wrong notes.
 */
export function Xylophone() {
  const barsRef = useRef<HTMLDivElement>(null);
  const down = useRef(false);
  const lastBar = useRef(-1);

  const play = (i: number) => {
    const bars = barsRef.current;
    const b = bars?.children[i] as HTMLElement | undefined;
    if (!bars || !b) return;
    mallet(NOTES[i].f, 0.5, 1.6);
    b.classList.remove('hit');
    void b.offsetWidth;
    b.classList.add('hit');
    if (document.documentElement.classList.contains('calm')) return;
    const r = bars.getBoundingClientRect();
    const br = b.getBoundingClientRect();
    const n = document.createElement('div');
    n.className = 'note-float';
    n.textContent = Math.random() < 0.5 ? '♪' : '♫';
    n.style.setProperty('--c', `var(--${NOTES[i].c})`);
    n.style.left = `${br.left - r.left + br.width / 2}px`;
    n.style.top = `${br.top - r.top - 30}px`;
    bars.appendChild(n);
    window.setTimeout(() => n.remove(), 1150);
  };

  const barAt = (x: number, y: number) => {
    const el = document.elementFromPoint(x, y) as HTMLElement | null;
    const b = el?.closest?.('.bar') as HTMLElement | null;
    return b ? Number(b.dataset.i) : -1;
  };

  useEffect(() => {
    const up = () => {
      down.current = false;
      lastBar.current = -1;
    };
    const onKey = (e: KeyboardEvent) => {
      if (document.querySelector('.panel') || e.ctrlKey || e.metaKey || e.altKey || e.repeat) return;
      const K = e.key.toUpperCase();
      let i = NOTES.findIndex((n) => n.k === K);
      if (i < 0 && /^[1-8]$/.test(e.key)) i = Number(e.key) - 1;
      if (i < 0 && e.key.length === 1) i = e.key.charCodeAt(0) % 8;
      if (i >= 0) {
        e.preventDefault();
        unlockAudio();
        play(i);
      }
    };
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', up);
      window.removeEventListener('keydown', onKey);
    };
  }, []);

  const l = lang.value;

  return (
    <section class="screen xylo" aria-label="Xylophone">
      <div class="xylo-wrap">
        <svg class="rails" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
          <line x1="3" y1="19" x2="97" y2="31" vector-effect="non-scaling-stroke" />
          <line x1="3" y1="81" x2="97" y2="69" vector-effect="non-scaling-stroke" />
          <line class="hi" x1="3" y1="18.4" x2="97" y2="30.4" vector-effect="non-scaling-stroke" />
          <line class="hi" x1="3" y1="80.4" x2="97" y2="68.4" vector-effect="non-scaling-stroke" />
        </svg>
        <div
          class="bars"
          ref={barsRef}
          onPointerDown={(e) => {
            e.preventDefault();
            unlockAudio();
            down.current = true;
            lastBar.current = barAt(e.clientX, e.clientY);
            if (lastBar.current >= 0) play(lastBar.current);
          }}
          onPointerMove={(e) => {
            if (!down.current) return;
            const i = barAt(e.clientX, e.clientY);
            if (i >= 0 && i !== lastBar.current) {
              lastBar.current = i;
              play(i);
            }
          }}
        >
          {NOTES.map((n, i) => (
            <button
              type="button"
              key={i}
              class="bar"
              data-i={i}
              tabIndex={-1}
              style={{ '--c': `var(--${n.c})`, '--h': `${100 - (38 * i) / 7}%` }}
              aria-label={`${n.so}, ${n.sa}, key ${n.k}`}
            >
              <span class="nail t" />
              <span class="lbl">
                {l === 'en' && n.so}
                {l === 'ne' && <span lang="ne">{n.sa}</span>}
                {l === 'both' && (
                  <>
                    <span lang="ne">{n.sa}</span>
                    <small>{n.so}</small>
                  </>
                )}
              </span>
              <kbd>{n.k}</kbd>
              <span class="nail b" />
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
