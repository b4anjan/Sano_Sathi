import { useEffect, useRef, useState } from 'preact/hooks';
import { lang, memoryPairs, memoryKind, memoryPeek } from '../../core/settings';
import { unlockAudio, mallet, bloop, cheer } from '../../core/audio';
import { say, stopSpeech, type Part } from '../../core/voice';
import { dhakaTile } from '../../content/art';
import { categoryOf } from '../../content/items';
import { neDigits } from '../../content/numbers';
import { Bi, Habre, ItemArt, burst } from '../../ui/common';
import { buildDeck, columnsFor, type MCard } from './deck';

const BACK = dhakaTile();

function cardParts(c: MCard, l: string): Part[] {
  const ne: Part = { text: c.item.ne, lang: 'ne', clips: [`ne/${c.item.id}`] };
  const en: Part = { text: c.item.en, lang: 'en', clips: [`en/${c.item.id}`] };
  if (c.face === 'ne') return [ne];
  if (c.face === 'en') return [en];
  return l === 'en' ? [en] : l === 'ne' ? [ne] : [ne, en];
}

/**
 * Find the Pair: turn two cards; matching cards stay up. No timer and no penalty.
 * Optional first peek at all cards. Arrow keys move between cards; Enter or Space turns one.
 */
export function Memory() {
  const pairs = memoryPairs.value;
  const kind = memoryKind.value;
  const peekOn = memoryPeek.value;

  const [deck, setDeck] = useState<MCard[]>(() => buildDeck(pairs, kind));
  const [up, setUp] = useState<number[]>([]);
  const [matched, setMatched] = useState<Set<number>>(new Set());
  const [peeking, setPeeking] = useState(peekOn);
  const [turns, setTurns] = useState(0);
  const [won, setWon] = useState(false);
  const [jiggle, setJiggle] = useState<number[]>([]);
  const hostRef = useRef<HTMLElement>(null);
  const cardRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const timers = useRef<number[]>([]);
  const busy = useRef(false);

  const later = (fn: () => void, ms: number) => timers.current.push(window.setTimeout(fn, ms));
  const clear = () => {
    timers.current.forEach((t) => window.clearTimeout(t));
    timers.current = [];
  };

  const start = () => {
    clear();
    stopSpeech();
    busy.current = false;
    const d = buildDeck(memoryPairs.value, memoryKind.value);
    setDeck(d);
    setUp([]);
    setMatched(new Set());
    setTurns(0);
    setWon(false);
    if (memoryPeek.value) {
      setPeeking(true);
      void say(lang.value === 'en' ? [{ text: 'Look!', lang: 'en' }] : lang.value === 'ne' ? [{ text: 'हेर त!', lang: 'ne' }] : [{ text: 'हेर त!', lang: 'ne' }, { text: 'Look!', lang: 'en' }]);
      later(() => setPeeking(false), 2600 + d.length * 120);
    } else setPeeking(false);
  };

  useEffect(() => {
    start();
    return () => {
      clear();
      stopSpeech();
    };
  }, [pairs, kind, peekOn]);

  const flip = (i: number) => {
    if (peeking || won || busy.current || matched.has(i) || up.includes(i)) return;
    unlockAudio();
    const c = deck[i];
    mallet(659.25 + up.length * 130, 0.25, 0.5);
    void say(cardParts(c, lang.value));
    const nowUp = [...up, i];
    setUp(nowUp);
    if (nowUp.length < 2) return;
    setTurns((t) => t + 1);
    const [a, b] = nowUp;
    if (deck[a].item.id === deck[b].item.id) {
      const m = new Set(matched);
      m.add(a);
      m.add(b);
      setMatched(m);
      setUp([]);
      setJiggle([a, b]);
      later(() => setJiggle([]), 700);
      [784, 988, 1175].forEach((f, k) => mallet(f, 0.3, 0.7, 0.25 + k * 0.08));
      const el = cardRefs.current[b];
      if (hostRef.current && el) burst(hostRef.current, el, 12);
      if (m.size === deck.length) {
        later(() => {
          setWon(true);
          cheer();
          if (hostRef.current && el) burst(hostRef.current, el, 26);
          const l = lang.value;
          void say(l === 'en' ? [{ text: 'Well done! You found them all!', lang: 'en', clips: ['en/_welldone'] }] : l === 'ne' ? [{ text: 'स्याबास! सबै जोडी भेट्यौ!', lang: 'ne', clips: ['ne/_welldone'] }] : [{ text: 'स्याबास! सबै जोडी भेट्यौ!', lang: 'ne', clips: ['ne/_welldone'] }, { text: 'Well done! You found them all!', lang: 'en', clips: ['en/_welldone'] }]);
        }, 900);
      }
    } else {
      busy.current = true;
      later(() => {
        bloop(440, 330, 0.12, 'sine', 0.2);
        setUp([]);
        busy.current = false;
      }, 1300);
    }
  };

  const cols = columnsFor(deck.length);
  const rows = Math.ceil(deck.length / cols);
  const onGridKey = (e: KeyboardEvent) => {
    const i = cardRefs.current.findIndex((el) => el === document.activeElement);
    if (i < 0) return;
    const step = { ArrowRight: 1, ArrowLeft: -1, ArrowDown: cols, ArrowUp: -cols }[e.key];
    if (!step) return;
    e.preventDefault();
    const j = Math.min(deck.length - 1, Math.max(0, i + step));
    cardRefs.current[j]?.focus();
  };

  const l = lang.value;
  return (
    <section class="screen memory" ref={hostRef} aria-label="Find the Pair">
      <div class="mem-top">
        <Habre class="habre-small" onTap={() => void 0} />
        <div class="bubble left">
          {peeking ? (
            <Bi t={{ en: 'Look closely… remember!', ne: 'राम्ररी हेर… सम्झ!' }} />
          ) : won ? (
            <Bi t={{ en: 'You found them all!', ne: 'सबै जोडी भेट्यौ!' }} />
          ) : (
            <Bi t={{ en: 'Find two that match.', ne: 'मिल्ने दुईवटा खोज।' }} />
          )}
        </div>
        <span class="mem-turns" aria-label="Turns">
          <Bi t={{ en: 'Turns', ne: 'पालो' }} /> <b>{l === 'en' ? turns : neDigits(turns)}</b>
        </span>
      </div>

      <div class="mwrap">
        <div class="mgrid" style={{ '--cols': cols, '--rows': rows }} onKeyDown={onGridKey}>
          {deck.map((c, i) => {
            const shown = peeking || up.includes(i) || matched.has(i);
            const tint = categoryOf(c.item).tint;
            return (
              <button
                type="button"
                key={c.uid}
                ref={(el) => {
                  cardRefs.current[i] = el;
                }}
                class={`mcard${shown ? ' shown' : ''}${matched.has(i) ? ' matched' : ''}${jiggle.includes(i) ? ' jiggle' : ''}`}
                aria-label={shown ? `${c.item.en}, ${c.item.ne}` : `Card ${i + 1}, face down`}
                onClick={() => flip(i)}
              >
                <span class="mcard-inner">
                  <span class="mback" style={{ backgroundImage: BACK }} aria-hidden="true" />
                  <span class="mface" style={{ '--tint': tint }}>
                    {c.face === 'pic' && <ItemArt id={c.item.id} />}
                    {c.face === 'word' && (
                      <span class="mword">
                        <Bi t={c.item} />
                      </span>
                    )}
                    {c.face === 'ne' && (
                      <span class="mword ne" lang="ne">
                        {c.item.ne}
                      </span>
                    )}
                    {c.face === 'en' && <span class="mword">{c.item.en}</span>}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {won && (
        <div class="mem-won">
          <button type="button" class="again" onClick={start}>
            <Bi t={{ en: 'Play again', ne: 'फेरि खेलौँ' }} />
          </button>
        </div>
      )}
    </section>
  );
}
