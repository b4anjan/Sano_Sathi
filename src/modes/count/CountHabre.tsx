import { useEffect, useRef, useState } from 'preact/hooks';
import { lang, countLevel } from '../../core/settings';
import { unlockAudio, mallet, bloop, cheer, PENTA } from '../../core/audio';
import { say, stopSpeech, type Part } from '../../core/voice';
import { EN_NUM, NE_NUM, neDigits } from '../../content/numbers';
import { S, wantText, type Bi as BiText } from '../../content/strings';
import { COUNT_LINES } from '../../content/spoken';
import { Bi, ItemArt, Stars, burst } from '../../ui/common';
import { Buddy } from '../../ui/Buddy';
import { award } from '../../core/rewards';

/** One sentence per language; `keys` are its recorded pieces, played back to back. */
function parts(t: BiText, keys?: string | string[]): Part[] {
  const ks = keys === undefined ? [] : Array.isArray(keys) ? keys : [keys];
  const ne: Part = { text: t.ne, lang: 'ne', clips: ks.length ? ks.map((k) => `ne/${k}`) : undefined };
  const en: Part = { text: t.en, lang: 'en', clips: ks.length ? ks.map((k) => `en/${k}`) : undefined };
  return lang.value === 'en' ? [en] : lang.value === 'ne' ? [ne] : [ne, en];
}
const numText = (n: number): BiText => ({ en: EN_NUM[n], ne: NE_NUM[n] });

/**
 * Count with me: put oranges from the doko onto a brass thali laid out as a five- or
 * ten-frame, then tap the buddy to share. A wrong count never fails: the buddy counts along with
 * the child, then says how many to add or take away.
 */
export function CountHabre() {
  const level = countLevel.value;
  const cells = level === 3 ? 10 : 5;
  const max = level === 1 ? 3 : level === 2 ? 5 : 10;

  const [target, setTarget] = useState(0);
  const [placed, setPlaced] = useState(0);
  const [locked, setLocked] = useState(false);
  const [badges, setBadges] = useState(0);
  const [msg, setMsg] = useState<BiText>({ en: '', ne: '' });
  const [stars, setStars] = useState(0);
  const [nudge, setNudge] = useState<'doko' | 'plate' | null>(null);
  const [eating, setEating] = useState(false);
  const [fresh, setFresh] = useState(-1);

  const hostRef = useRef<HTMLElement>(null);
  const habreRef = useRef<HTMLDivElement>(null);
  const timers = useRef<number[]>([]);
  const last = useRef(0);
  const st = useRef({ target: 0, placed: 0, locked: false });
  st.current = { target, placed, locked };

  const clearTimers = () => {
    timers.current.forEach((t) => window.clearTimeout(t));
    timers.current = [];
  };
  const later = (fn: () => void, ms: number) => timers.current.push(window.setTimeout(fn, ms));
  const tell = (t: BiText, clipKeys?: string | string[]) => {
    setMsg(t);
    void say(parts(t, clipKeys));
  };

  const newRound = () => {
    clearTimers();
    let t: number;
    do t = 1 + Math.floor(Math.random() * max);
    while (t === last.current && max > 1);
    last.current = t;
    setTarget(t);
    setPlaced(0);
    setLocked(false);
    setBadges(0);
    setNudge(null);
    setEating(false);
    tell(wantText(t), `want-${t}`);
  };

  useEffect(() => {
    newRound();
    return () => {
      clearTimers();
      stopSpeech();
    };
  }, [level]);

  // Re-say the current request when the language changes.
  useEffect(() => {
    if (st.current.target) tell(wantText(st.current.target), `want-${st.current.target}`);
  }, [lang.value]);

  const add = () => {
    const { placed: p, locked: lk } = st.current;
    if (lk) return;
    unlockAudio();
    setBadges(0);
    setNudge(null);
    if (p >= cells) {
      tell(S.plateFull, 's-plateFull');
      setNudge('plate');
      return;
    }
    const np = p + 1;
    setPlaced(np);
    setFresh(np - 1);
    mallet(PENTA[(np - 1) % PENTA.length], 0.4, 1);
    void say(parts(numText(np), `num${np}`));
  };

  const remove = () => {
    const { placed: p, locked: lk } = st.current;
    if (lk || p === 0) return;
    setBadges(0);
    setNudge(null);
    const np = p - 1;
    setPlaced(np);
    setFresh(-1);
    bloop(520, 260, 0.14);
    void say(parts(numText(np), `num${np}`));
  };

  const serve = () => {
    const { placed: p, target: t, locked: lk } = st.current;
    if (lk) return;
    unlockAudio();
    if (p === 0) {
      tell(S.tapBasket, 's-tapBasket');
      setNudge('doko');
      return;
    }
    if (p === t) {
      setLocked(true);
      setEating(true);
      cheer();
      if (hostRef.current && habreRef.current) burst(hostRef.current, habreRef.current, 22);
      tell(COUNT_LINES.yum(t), `yum-${t}`);
      setStars((s) => s + 1);
      award(1);
      later(newRound, 3000);
      return;
    }
    // Count together, one orange at a time, then a gentle hint.
    setLocked(true);
    setBadges(0);
    tell(S.countTogether, 's-countTogether');
    const step = lang.value === 'both' ? 1300 : 850;
    for (let i = 1; i <= p; i++) {
      later(() => {
        setBadges(i);
        mallet(PENTA[(i - 1) % PENTA.length], 0.35, 0.9);
        void say(parts(numText(i), `num${i}`));
      }, 1300 + (i - 1) * step);
    }
    later(() => {
      const d = Math.abs(t - p);
      const more = p < t;
      // Three recorded sentences: "That's two." "I want five oranges." "Let's add three more."
      const have = COUNT_LINES.have(p);
      const want = wantText(t);
      const next = more ? COUNT_LINES.addMore(d) : COUNT_LINES.takeAway(d);
      tell(
        { en: `${have.en} ${want.en} ${next.en}`, ne: `${have.ne} ${want.ne} ${next.ne}` },
        [`have-${p}`, `want-${t}`, `${more ? 'addmore' : 'takeaway'}-${d}`],
      );
      setNudge(more ? 'doko' : 'plate');
      setLocked(false);
    }, 1300 + p * step + 200);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (document.querySelector('.panel')) return;
      if (['+', '=', 'ArrowUp', 'ArrowRight', ' '].includes(e.key)) {
        e.preventDefault();
        add();
      } else if (['-', '_', 'Backspace', 'Delete', 'ArrowDown', 'ArrowLeft'].includes(e.key)) {
        e.preventDefault();
        remove();
      } else if (e.key === 'Enter') {
        e.preventDefault();
        serve();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [cells]);

  const l = lang.value;
  const big = l === 'en' ? String(target) : neDigits(target);

  return (
    <section class="screen count" ref={hostRef} aria-label="Count with me">
      <div class="count-wrap">
        <div class="pip-col" ref={habreRef}>
          <div class="bubble down want-bubble" aria-live="polite">
            <span class="want-num" lang={l === 'en' ? 'en' : 'ne'}>{big}</span>
            {l === 'both' && <span class="want-sub">{target}</span>}
            {level < 3 && (
              <span class="dots" aria-hidden="true">
                {Array.from({ length: target }, (_, i) => (
                  <i key={i} />
                ))}
              </span>
            )}
          </div>
          <Buddy class={`habre-count${placed > 0 && !locked ? ' ready' : ''}${eating ? ' yum' : ''}`} react={false} onTap={serve} />
          <span class="cta">
            <Bi t={S.tapMe} />
          </span>
        </div>

        <div class="plate-col">
          <div
            class={`thali${nudge === 'plate' ? ' nudge' : ''}`}
            role="group"
            aria-label="Plate. Tap to add an orange."
            onClick={add}
          >
            <div class={`tframe f${cells}`}>
              {Array.from({ length: cells }, (_, i) => (
                <div class={`cell${level === 1 && i < target ? ' ghost' : ''}`} key={i}>
                  {i < placed && (
                    <button
                      type="button"
                      class={`fruit${i === fresh ? ' new' : ''}${eating ? ' eaten' : ''}`}
                      style={{ animationDelay: eating ? `${i * 70}ms` : undefined }}
                      aria-label="Orange. Tap to take it off the plate."
                      onClick={(e) => {
                        e.stopPropagation();
                        remove();
                      }}
                    >
                      <ItemArt id="suntala" />
                    </button>
                  )}
                  {badges > i && i < placed && <span class="badge">{l === 'en' ? i + 1 : neDigits(i + 1)}</span>}
                </div>
              ))}
            </div>
          </div>
          {level < 3 && (
            <div class="plate-count">
              {l === 'en' ? placed : neDigits(placed)} <Bi t={S.onPlate} />
            </div>
          )}
        </div>

        <button type="button" class={`doko-btn${nudge === 'doko' ? ' nudge' : ''}`} onClick={add} aria-label="Doko of oranges. Tap to put one on the plate.">
          <span class="doko-pile" aria-hidden="true">
            <ItemArt id="suntala" class="o1" />
            <ItemArt id="suntala" class="o2" />
            <ItemArt id="suntala" class="o3" />
            <ItemArt id="doko" class="dk" />
          </span>
          <span class="cta">
            <Bi t={S.tapDoko} />
          </span>
        </button>
      </div>

      <div class="count-foot">
        <p class="count-msg" aria-live="polite">
          <Bi t={msg} />
        </p>
        <div class="count-sub">
          <span>
            Keys: <b>+</b> add · <b>−</b> take away · <b>Enter</b> share
          </span>
          {stars > 0 && (
            <span>
              <Bi t={S.stars} /> <Stars n={stars} />
            </span>
          )}
        </div>
      </div>
    </section>
  );
}
