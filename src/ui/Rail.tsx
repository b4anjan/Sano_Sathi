import { useEffect, useRef, useState } from 'preact/hooks';
import { screen, panelOpen, type Screen } from '../core/nav';
import { lang, homeButton } from '../core/settings';
import { stopSpeech } from '../core/voice';
import { unlockAudio, bloop } from '../core/audio';
import { S, type Bi as BiText } from '../content/strings';
import { activityById } from '../content/activities';
import { BRAND } from '../brand';
import { Bi } from './common';

function titleFor(s: Screen): BiText {
  if (s === 'home') return { en: BRAND.appName, ne: BRAND.appNameNe };
  if (s === 'studio') return { en: 'Voice studio', ne: 'आवाज स्टुडियो' };
  if (s === 'stickers') return S.stickers;
  return activityById(s)?.title ?? { en: BRAND.appName, ne: BRAND.appNameNe };
}

/**
 * "Hold to go home" for children: hold for one second (a ring fills). A quick tap only shows
 * a hint, so a toddler mashing the screen doesn't leave the game by accident.
 */
function HomeHold() {
  const [holding, setHolding] = useState(false);
  const [hint, setHint] = useState(false);
  const timer = useRef<number>();
  const hintTimer = useRef<number>();
  const done = useRef(false);
  const start = (e: PointerEvent) => {
    e.preventDefault();
    done.current = false;
    setHolding(true);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => {
      done.current = true;
      setHolding(false);
      unlockAudio();
      bloop(660, 330, 0.18);
      stopSpeech();
      screen.value = 'home';
    }, 1000);
  };
  const end = () => {
    window.clearTimeout(timer.current);
    setHolding(false);
  };
  useEffect(() => () => (window.clearTimeout(timer.current), window.clearTimeout(hintTimer.current)), []);
  return (
    <span class="home-hold-wrap">
      <button
        type="button"
        class={`home-hold${holding ? ' holding' : ''}`}
        onPointerDown={start}
        onPointerUp={end}
        onPointerLeave={end}
        onPointerCancel={end}
        onContextMenu={(e) => e.preventDefault()}
        onClick={(e) => {
          e.preventDefault();
          if (done.current) return;
          setHint(true);
          window.clearTimeout(hintTimer.current);
          hintTimer.current = window.setTimeout(() => setHint(false), 1600);
        }}
        aria-label="Home: press and hold for 1 second"
      >
        <svg viewBox="0 0 34 34" aria-hidden="true">
          <circle class="track" cx="17" cy="17" r="15" />
          <circle class="prog" cx="17" cy="17" r="15" />
          <path class="house" d="M9 17.5 L17 10 L25 17.5 M11.5 15.5 V24 H22.5 V15.5" />
        </svg>
      </button>
      {hint && (
        <span class="home-hint" role="status">
          <Bi t={S.holdHome} />
        </span>
      )}
    </span>
  );
}

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
        <Bi t={titleFor(screen.value)} />
      </div>
      <div class="rail-right">
        {homeButton.value && screen.value !== 'home' && screen.value !== 'studio' && <HomeHold />}
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
