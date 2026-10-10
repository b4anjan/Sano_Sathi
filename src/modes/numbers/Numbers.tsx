import { useEffect, useRef, useState } from 'preact/hooks';
import { lang } from '../../core/settings';
import { unlockAudio, cheer, mallet, PENTA } from '../../core/audio';
import { say, stopSpeech, type Part } from '../../core/voice';
import { award } from '../../core/rewards';
import { EN_NUM, NE_NUM, neDigits } from '../../content/numbers';
import { Bi, ItemArt, burst } from '../../ui/common';
import { TraceBoard } from '../../ui/TraceBoard';
import { EyeIcon, PencilIcon, SpeakerIcon, TraceMeter } from '../letters/Letters';

type Mode = 'look' | 'trace';
type Range = 'low' | 'high';
const THINGS = ['suntala', 'syau', 'tara', 'machha', 'kukhura', 'makai', 'kera'];

function numParts(n: number, l: string): Part[] {
  const ne: Part = { text: NE_NUM[n], lang: 'ne', clips: [`ne/num${n}`] };
  const en: Part = { text: EN_NUM[n], lang: 'en', clips: [`en/num${n}`] };
  return l === 'en' ? [en] : l === 'ne' ? [ne] : [ne, en];
}

/** Numbers: see 0 to 20 as felt objects in ten-frames and count them aloud, or trace digits. */
export function Numbers() {
  const [mode, setMode] = useState<Mode>('look');
  const [range, setRange] = useState<Range>('low');
  const [n, setN] = useState(3);
  const [shown, setShown] = useState(3);
  const [thing, setThing] = useState('suntala');
  const [script, setScript] = useState<'en' | 'ne'>(lang.value === 'ne' ? 'ne' : 'en');
  const [digit, setDigit] = useState(1);
  const [done, setDone] = useState(false);
  const [clearKey, setClearKey] = useState(0);
  const [cov, setCov] = useState(0);
  const hostRef = useRef<HTMLElement>(null);
  const boardRef = useRef<HTMLDivElement>(null);
  const timers = useRef<number[]>([]);

  const clear = () => {
    timers.current.forEach((t) => window.clearTimeout(t));
    timers.current = [];
  };
  useEffect(() => () => (clear(), stopSpeech()), []);
  useEffect(() => {
    if (lang.value === 'ne') setScript('ne');
    if (lang.value === 'en') setScript('en');
  }, [lang.value]);

  /** Show the objects one by one, counting along, then say the number. */
  const countUp = (k: number) => {
    clear();
    stopSpeech();
    setShown(0);
    const solo = lang.value === 'en' ? 'en' : 'ne';
    const step = k > 12 ? 520 : 680;
    for (let i = 1; i <= k; i++) {
      timers.current.push(
        window.setTimeout(() => {
          setShown(i);
          mallet(PENTA[(i - 1) % PENTA.length], 0.3, 0.7);
          void say(numParts(i, solo));
        }, 300 + (i - 1) * step),
      );
    }
    timers.current.push(
      window.setTimeout(() => {
        setShown(k);
        void say(numParts(k, lang.value));
      }, 300 + k * step + 500),
    );
  };

  const choose = (k: number) => {
    unlockAudio();
    setN(k);
    setThing(THINGS[Math.floor(Math.random() * THINGS.length)]);
    countUp(k);
  };

  const digitGlyph = (d: number) => (script === 'ne' ? neDigits(d) : String(d));
  const goDigit = (dd: number) => {
    clear();
    const d = (digit + dd + 10) % 10;
    setDigit(d);
    setDone(false);
    void say(numParts(d, lang.value));
  };
  const pass = () => {
    setDone(true);
    cheer();
    award(1);
    if (hostRef.current && boardRef.current) burst(hostRef.current, boardRef.current, 24);
    window.setTimeout(() => void say(numParts(digit, lang.value)), 300);
    timers.current.push(window.setTimeout(() => goDigit(1), 3200));
  };

  const l = lang.value;
  const list = range === 'low' ? Array.from({ length: 11 }, (_, i) => i) : Array.from({ length: 10 }, (_, i) => i + 11);
  const frames = n > 10 ? 2 : 1;

  return (
    <section class="screen numbers" ref={hostRef} aria-label="Numbers">
      <div class="lt-top">
        <div class="kid-tabs" role="group" aria-label="Mode">
          <button type="button" aria-pressed={mode === 'look'} onClick={() => (unlockAudio(), clear(), setMode('look'))}>
            <EyeIcon /> <Bi t={{ en: 'Count', ne: 'गन' }} />
          </button>
          <button type="button" aria-pressed={mode === 'trace'} onClick={() => (unlockAudio(), clear(), setMode('trace'), setDone(false))}>
            <PencilIcon /> <Bi t={{ en: 'Trace', ne: 'लेख' }} />
          </button>
        </div>
        {mode === 'look' ? (
          <div class="kid-tabs" role="group" aria-label="Numbers">
            <button type="button" aria-pressed={range === 'low'} onClick={() => setRange('low')}>
              {l === 'ne' ? '० – १०' : '0 – 10'}
            </button>
            <button type="button" aria-pressed={range === 'high'} onClick={() => setRange('high')}>
              {l === 'ne' ? '११ – २०' : '11 – 20'}
            </button>
          </div>
        ) : (
          <div class="kid-tabs" role="group" aria-label="Digits">
            <button type="button" aria-pressed={script === 'en'} onClick={() => (setScript('en'), setDone(false))}>
              1 2 3
            </button>
            <button type="button" aria-pressed={script === 'ne'} class="ne" onClick={() => (setScript('ne'), setDone(false))}>
              १ २ ३
            </button>
          </div>
        )}
      </div>

      {mode === 'look' ? (
        <div class="lt-look">
          <div class="lt-card nb-card">
            <button type="button" class="nb-big" onClick={() => countUp(n)} aria-label={`Count ${n} again`}>
              {l !== 'ne' && <span>{n}</span>}
              {l !== 'en' && <span class="ne">{neDigits(n)}</span>}
            </button>
            <div class="nb-word">
              <Bi t={{ en: EN_NUM[n], ne: NE_NUM[n] }} />
            </div>
            <div class={`nb-frames f${frames}`} aria-hidden="true">
              {Array.from({ length: frames }, (_, f) => (
                <div class="nb-frame" key={f}>
                  {Array.from({ length: 10 }, (_, c) => {
                    const i = f * 10 + c;
                    return <span key={c} class={`nb-cell${i < n ? ' used' : ''}`}>{i < shown && <ItemArt id={thing} />}</span>;
                  })}
                </div>
              ))}
            </div>
            <div class="lt-actions">
              <button type="button" class="pill-btn" onClick={() => countUp(n)}>
                <SpeakerIcon /> <Bi t={{ en: 'Count again', ne: 'फेरि गन' }} />
              </button>
            </div>
          </div>
          <div class="lt-grid">
            <div class="lt-row nb-row">
              {list.map((k) => (
                <button
                  key={k}
                  type="button"
                  class={`lt-key${k === n ? ' here' : ''}${l === 'ne' ? ' ne' : ''}`}
                  style={{ '--c': ['var(--red)', 'var(--orange)', 'var(--yellow)', 'var(--green)', 'var(--sky)', 'var(--purple)', 'var(--pink)'][k % 7] }}
                  onClick={() => choose(k)}
                >
                  {l === 'ne' ? neDigits(k) : k}
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div class="lt-trace">
          <button type="button" class="st-nav big" onClick={() => goDigit(-1)} aria-label="Previous number">
            ‹
          </button>
          <div class="lt-board" ref={boardRef}>
            <TraceBoard glyph={digitGlyph(digit)} done={done} clearKey={clearKey} onPass={pass} onProgress={setCov} />
          </div>
          <button type="button" class="st-nav big" onClick={() => goDigit(1)} aria-label="Next number">
            ›
          </button>
          <div class="lt-trace-bar">
            <button type="button" class="round-btn" onClick={() => void say(numParts(digit, lang.value))} aria-label="Hear it">
              <SpeakerIcon />
            </button>
            <TraceMeter value={done ? 1 : cov} />
            <button type="button" class="pill-btn" onClick={() => (setClearKey((k) => k + 1), setDone(false))}>
              <Bi t={{ en: 'Clear', ne: 'मेटाऊ' }} />
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
