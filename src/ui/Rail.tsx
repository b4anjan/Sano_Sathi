import { useEffect, useRef, useState } from 'preact/hooks';
import { screen, panelOpen } from '../core/nav';
import { lang } from '../core/settings';
import { stopSpeech } from '../core/voice';
import { S } from '../content/strings';
import { BRAND } from '../brand';
import { Bi } from './common';

const TITLES = {
  home: { en: BRAND.appName, ne: BRAND.appNameNe },
  match: S.match,
  count: S.count,
  xylo: S.xylo,
  smash: S.smash,
  memory: S.memory,
};

export function openPanel(): void {
  stopSpeech();
  panelOpen.value = true;
}

/**
 * Top rail: the grown-ups gate (press and hold 2 s, or type "parent") and the screen title.
 * There is deliberately no back button for children; leaving an activity is a grown-up action.
 */
export function Rail() {
  const [holding, setHolding] = useState(false);
  const [toast, setToast] = useState(false);
  const timer = useRef<number>();
  const toastTimer = useRef<number>();
  const held = useRef(false);

  const start = (e: PointerEvent) => {
    e.preventDefault();
    held.current = false;
    setHolding(true);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => {
      held.current = true;
      setHolding(false);
      openPanel();
    }, 2000);
  };
  const end = () => {
    window.clearTimeout(timer.current);
    setHolding(false);
  };
  const click = (e: MouseEvent) => {
    e.preventDefault();
    if (held.current) return;
    setToast(true);
    window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(false), 1800);
  };

  useEffect(() => () => window.clearTimeout(timer.current), []);

  const langTag = lang.value === 'en' ? 'EN' : lang.value === 'ne' ? 'ने' : 'ने · EN';

  return (
    <header class="rail">
      <button
        type="button"
        class={`gate${holding ? ' holding' : ''}`}
        onPointerDown={start}
        onPointerUp={end}
        onPointerLeave={end}
        onPointerCancel={end}
        onClick={click}
        onContextMenu={(e) => e.preventDefault()}
        aria-label="Grown-ups: press and hold for 2 seconds, or type the word parent"
      >
        <svg viewBox="0 0 34 34" aria-hidden="true">
          <circle class="track" cx="17" cy="17" r="14" />
          <circle class="prog" cx="17" cy="17" r="14" />
          <circle class="dot" cx="17" cy="17" r="4" />
        </svg>
        <span class="gate-text">
          <b>
            <Bi t={S.grownups} />
          </b>
          <small>{S.hold.en}</small>
        </span>
      </button>
      <div class="rail-title">
        <Bi t={TITLES[screen.value]} />
      </div>
      <div class="rail-right">
        <span class="lang-tag" aria-label="Language">{langTag}</span>
        <span class="rail-hint">
          or type <kbd>parent</kbd>
        </span>
      </div>
      {toast && (
        <div class="toast" role="status">
          <Bi t={S.keepHolding} />
        </div>
      )}
    </header>
  );
}
