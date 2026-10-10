import { useEffect, useRef, useState } from 'preact/hooks';
import { onPointer, pointer } from '../core/pointer';
import { giggle, sfx, unlockAudio } from '../core/audio';
import { buddy as buddySignal, lang } from '../core/settings';
import { say, type Part } from '../core/voice';
import { BUDDIES, type BuddyId, type Reaction } from '../content/buddies';
import type { Bi as BiText } from '../content/strings';
import { ItemArt } from './common';

/** Parts for a buddy line in the current language(s); recordings use key m-<buddy>-<line>. */
export function buddyParts(id: BuddyId, line: string, t: BiText): Part[] {
  const l = lang.value;
  const ne: Part = { text: t.ne, lang: 'ne', clips: [`ne/m-${id}-${line}`] };
  const en: Part = { text: t.en, lang: 'en', clips: [`en/m-${id}-${line}`] };
  return l === 'en' ? [en] : l === 'ne' ? [ne] : [ne, en];
}

// Reactions cycle in a shuffled order, so all four play before any repeats.
const queue: Partial<Record<BuddyId, number[]>> = {};
function nextReaction(id: BuddyId): Reaction {
  const list = BUDDIES[id].reactions;
  let q = queue[id];
  if (!q || !q.length) {
    q = list.map((_, i) => i).sort(() => Math.random() - 0.5);
    queue[id] = q;
  }
  return list[q.shift()!];
}

let lastSpoke = 0;

/**
 * The child's buddy (Cat, Puppy or Panda). Eyes follow the finger or mouse.
 *
 * react (default): a tap plays one of four funny reactions; four quick taps make it giggle.
 * react={false}: the buddy is a button in a game (share the oranges, hear the word again):
 *   a tap does a small bounce and then the game's own action.
 */
export function Buddy({
  class: cls = '',
  onTap,
  react = true,
  id,
  label,
}: {
  class?: string;
  onTap?: () => void;
  react?: boolean;
  /** Show a particular buddy (pickers); defaults to the child's chosen one. */
  id?: BuddyId;
  label?: string;
}) {
  const ref = useRef<HTMLButtonElement>(null);
  const bodyRef = useRef<HTMLSpanElement>(null);
  const [anim, setAnim] = useState('');
  const [animKey, setAnimKey] = useState(0);
  const [fx, setFx] = useState('');
  const taps = useRef<number[]>([]);
  const fxTimer = useRef<number>();
  const who: BuddyId = id ?? buddySignal.value;
  const b = BUDDIES[who];

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
      window.clearTimeout(fxTimer.current);
    };
  }, []);

  const play = (name: string, word: string) => {
    // A new key remounts the body, so the animation restarts even when it is the same one.
    setAnim(name);
    setAnimKey((k) => k + 1);
    setFx(word);
    window.clearTimeout(fxTimer.current);
    fxTimer.current = window.setTimeout(() => setFx(''), 1500);
  };

  const tap = () => {
    unlockAudio();
    if (!react) {
      play('boing', '');
      giggle();
      onTap?.();
      return;
    }
    const now = performance.now();
    taps.current = [...taps.current.filter((t) => now - t < 1600), now];
    const tickle = taps.current.length >= 4;
    if (tickle) taps.current = [];
    const r = tickle ? b.tickle : nextReaction(who);
    play(r.anim, r.fx);
    sfx(r.sound);
    if (tickle || now - lastSpoke > 900) {
      lastSpoke = now;
      void say(buddyParts(who, r.id, r.say));
    }
    onTap?.();
  };

  return (
    <button
      ref={ref}
      type="button"
      class={`habre buddy buddy-${who} ${cls}`}
      onClick={tap}
      aria-label={label ?? `${b.name.en}, ${b.name.ne}`}
    >
      <span key={animKey} ref={bodyRef} class={`buddy-body${anim ? ` react-${anim}` : ''}`} onAnimationEnd={(e) => e.currentTarget === e.target && setAnim('')}>
        <ItemArt id={b.art} />
      </span>
      {fx && (
        <span class="buddy-fx" aria-hidden="true">
          {fx}
        </span>
      )}
    </button>
  );
}
