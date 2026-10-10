import { useEffect, useRef, useState } from 'preact/hooks';
import { lang } from '../../core/settings';
import { unlockAudio, cheer, mallet, PENTA } from '../../core/audio';
import { say, stopSpeech } from '../../core/voice';
import { award } from '../../core/rewards';
import { EN_LETTERS, NE_VOWELS, NE_CONSONANT_ROWS, NE_CONSONANTS, type Letter } from '../../content/letters';
import { Bi, ItemArt, burst } from '../../ui/common';
import { TraceBoard } from '../../ui/TraceBoard';
import { letterParts } from './letterParts';

type SetId = 'abc' | 'vowels' | 'cons';
type Mode = 'look' | 'trace';

const SETS: Record<SetId, { letters: Letter[]; rows: Letter[][]; script: 'en' | 'ne'; label: string }> = {
  abc: { letters: EN_LETTERS, rows: [EN_LETTERS], script: 'en', label: 'A B C' },
  vowels: { letters: NE_VOWELS, rows: [NE_VOWELS], script: 'ne', label: 'अ आ इ' },
  cons: { letters: NE_CONSONANTS, rows: NE_CONSONANT_ROWS, script: 'ne', label: 'क ख ग' },
};

export const EyeIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true" class="ico">
    <path d="M2 12s3.6-6.5 10-6.5S22 12 22 12s-3.6 6.5-10 6.5S2 12 2 12Z" />
    <circle cx="12" cy="12" r="3.2" />
  </svg>
);
export const PencilIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true" class="ico">
    <path d="M4 20l1-5L16 4l4 4L9 19l-5 1Z" />
    <path d="M14 6l4 4" />
  </svg>
);
export const SpeakerIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true" class="ico">
    <path d="M4 9h4l5-4v14l-5-4H4Z" />
    <path d="M16.5 8.5a5 5 0 0 1 0 7M19 6a8.5 8.5 0 0 1 0 12" />
  </svg>
);

/** Trace progress as a row of felt dots. */
export function TraceMeter({ value }: { value: number }) {
  const n = Math.round(Math.min(1, value / 0.7) * 10);
  return (
    <span class="trace-meter" aria-label={`${Math.round(value * 100)}%`}>
      {Array.from({ length: 10 }, (_, i) => (
        <i key={i} class={i < n ? 'on' : ''} />
      ))}
    </span>
  );
}

/** Letters: look at every letter of ABC and the Nepali वर्णमाला, or trace them with a finger. */
export function Letters() {
  const [set, setSet] = useState<SetId>(lang.value === 'en' ? 'abc' : 'cons');
  const [mode, setMode] = useState<Mode>('look');
  const [idx, setIdx] = useState(0);
  const [done, setDone] = useState(false);
  const [clearKey, setClearKey] = useState(0);
  const [cov, setCov] = useState(0);
  const hostRef = useRef<HTMLElement>(null);
  const boardRef = useRef<HTMLDivElement>(null);
  const timer = useRef<number>();

  const S = SETS[set];
  const L = S.letters[Math.min(idx, S.letters.length - 1)];

  useEffect(() => () => (window.clearTimeout(timer.current), stopSpeech()), []);

  const speak = (x: Letter) => void say(letterParts(x, S.script, lang.value));

  const choose = (i: number) => {
    unlockAudio();
    window.clearTimeout(timer.current);
    setIdx(i);
    setDone(false);
    mallet(PENTA[i % PENTA.length], 0.3, 0.8);
    speak(S.letters[i]);
  };

  const go = (d: number) => {
    window.clearTimeout(timer.current);
    const n = S.letters.length;
    const i = (idx + d + n) % n;
    setIdx(i);
    setDone(false);
    if (mode === 'trace') speak(S.letters[i]);
  };

  const pass = () => {
    setDone(true);
    cheer();
    award(1);
    if (hostRef.current && boardRef.current) burst(hostRef.current, boardRef.current, 24);
    window.setTimeout(() => speak(L), 300);
    timer.current = window.setTimeout(() => go(1), 3400);
  };

  const pickSet = (s: SetId) => {
    unlockAudio();
    window.clearTimeout(timer.current);
    setSet(s);
    setIdx(0);
    setDone(false);
  };
  const pickMode = (m: Mode) => {
    unlockAudio();
    window.clearTimeout(timer.current);
    setMode(m);
    setDone(false);
    if (m === 'trace') speak(L);
  };

  const l = lang.value;
  const wordShown = L.word ? (S.script === 'en' ? { en: L.word, ne: L.gloss ?? '' } : { ne: L.word, en: L.gloss ?? '' }) : null;

  return (
    <section class="screen letters" ref={hostRef} aria-label="Letters">
      <div class="lt-top">
        <div class="kid-tabs" role="group" aria-label="Letters">
          {(Object.keys(SETS) as SetId[]).map((k) => (
            <button key={k} type="button" aria-pressed={set === k} class={SETS[k].script === 'ne' ? 'ne' : ''} onClick={() => pickSet(k)}>
              {SETS[k].label}
            </button>
          ))}
        </div>
        <div class="kid-tabs" role="group" aria-label="Mode">
          <button type="button" aria-pressed={mode === 'look'} onClick={() => pickMode('look')}>
            <EyeIcon /> <Bi t={{ en: 'Look', ne: 'हेर' }} />
          </button>
          <button type="button" aria-pressed={mode === 'trace'} onClick={() => pickMode('trace')}>
            <PencilIcon /> <Bi t={{ en: 'Trace', ne: 'लेख' }} />
          </button>
        </div>
      </div>

      {mode === 'look' ? (
        <div class="lt-look">
          <div class="lt-card">
            <button type="button" class={`lt-glyph${S.script === 'ne' ? ' ne' : ''}`} onClick={() => speak(L)} aria-label={`Hear ${L.ch}`}>
              {L.ch}
            </button>
            <div class="lt-word">
              {L.art ? <ItemArt id={L.art} /> : null}
              {wordShown && (
                <span class="lt-words">
                  <b lang={S.script}>{S.script === 'en' ? wordShown.en : wordShown.ne}</b>
                  {l === 'both' && wordShown[S.script === 'en' ? 'ne' : 'en'] && (
                    <span lang={S.script === 'en' ? 'ne' : 'en'}>{S.script === 'en' ? wordShown.ne : wordShown.en}</span>
                  )}
                </span>
              )}
            </div>
            <div class="lt-actions">
              <button type="button" class="round-btn" onClick={() => speak(L)} aria-label="Hear it">
                <SpeakerIcon />
              </button>
              <button type="button" class="round-btn" onClick={() => pickMode('trace')} aria-label="Trace it">
                <PencilIcon />
              </button>
            </div>
          </div>
          <div class="lt-grid">
            {S.rows.map((row, r) => (
              <div class="lt-row" key={r}>
                {row.map((x) => {
                  const i = S.letters.indexOf(x);
                  return (
                    <button
                      key={x.ch}
                      type="button"
                      class={`lt-key${S.script === 'ne' ? ' ne' : ''}${i === idx ? ' here' : ''}`}
                      style={{ '--c': ['var(--red)', 'var(--orange)', 'var(--yellow)', 'var(--green)', 'var(--sky)', 'var(--purple)', 'var(--pink)'][i % 7] }}
                      onClick={() => choose(i)}
                    >
                      {x.ch}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div class="lt-trace">
          <button type="button" class="st-nav big" onClick={() => go(-1)} aria-label="Previous letter">
            ‹
          </button>
          <div class="lt-board" ref={boardRef}>
            <TraceBoard glyph={L.ch} done={done} clearKey={clearKey} onPass={pass} onProgress={setCov} />
          </div>
          <button type="button" class="st-nav big" onClick={() => go(1)} aria-label="Next letter">
            ›
          </button>
          <div class="lt-trace-bar">
            <button type="button" class="round-btn" onClick={() => speak(L)} aria-label="Hear it">
              <SpeakerIcon />
            </button>
            <TraceMeter value={done ? 1 : cov} />
            <button type="button" class="pill-btn" onClick={() => (setClearKey((k) => k + 1), setDone(false))}>
              <Bi t={{ en: 'Clear', ne: 'मेटाऊ' }} />
            </button>
            {L.art && <ItemArt id={L.art} class="lt-mini" />}
          </div>
        </div>
      )}
    </section>
  );
}
