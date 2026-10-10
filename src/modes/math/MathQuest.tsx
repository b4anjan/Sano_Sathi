import { useEffect, useRef, useState } from 'preact/hooks';
import { lang, mathLevel, type Level } from '../../core/settings';
import { unlockAudio, cheer, bloop, mallet, sfx } from '../../core/audio';
import { say, stopSpeech, type Part } from '../../core/voice';
import { award } from '../../core/rewards';
import { neDigits } from '../../content/numbers';
import { S } from '../../content/strings';
import { Bi, Stars, burst } from '../../ui/common';
import { Buddy } from '../../ui/Buddy';
import { SpeakerIcon } from '../letters/Letters';
import { makeProblem, isRight, type Op, type Problem, type Sign } from './gen';

const ROUND = 10;
const OPS: Array<{ op: Op; sym: string; name: { en: string; ne: string }; color: string }> = [
  { op: 'add', sym: '+', name: { en: 'Add', ne: 'जोड' }, color: 'var(--green)' },
  { op: 'sub', sym: '−', name: { en: 'Take away', ne: 'घटाउ' }, color: 'var(--orange)' },
  { op: 'mul', sym: '×', name: { en: 'Times', ne: 'गुणन' }, color: 'var(--purple)' },
  { op: 'missing', sym: '?', name: { en: 'Missing', ne: 'हराएको' }, color: 'var(--sky)' },
  { op: 'compare', sym: '<>', name: { en: 'Compare', ne: 'तुलना' }, color: 'var(--pink)' },
];
const SIGNS: Array<{ s: Sign; name: { en: string; ne: string } }> = [
  { s: '<', name: { en: 'smaller', ne: 'सानो' } },
  { s: '=', name: { en: 'same', ne: 'बराबर' } },
  { s: '>', name: { en: 'bigger', ne: 'ठूलो' } },
];

function biParts(t: { en: string; ne: string }, l: string, key?: string): Part[] {
  const ne: Part = { text: t.ne, lang: 'ne', clips: key ? [`ne/${key}`] : undefined };
  const en: Part = { text: t.en, lang: 'en', clips: key ? [`en/${key}`] : undefined };
  return l === 'en' ? [en] : l === 'ne' ? [ne] : [ne, en];
}

/** "Show me": a picture of the problem — dots, tens and ones, an array, or two bars. */
function Model({ p }: { p: Problem }) {
  const dots = (n: number, cls: string, crossFrom = Infinity) =>
    Array.from({ length: n }, (_, i) => <i key={`${cls}${i}`} class={`${cls}${i >= crossFrom ? ' gone' : ''}`} />);
  if (p.op === 'compare') {
    const max = Math.max(p.a, p.b, 1);
    return (
      <div class="mq-model bars">
        <span style={{ '--w': `${(p.a / max) * 100}%` }} class="bar-a">
          {p.a}
        </span>
        <span style={{ '--w': `${(p.b / max) * 100}%` }} class="bar-b">
          {p.b}
        </span>
      </div>
    );
  }
  if (p.op === 'mul' || (p.op === 'missing' && p.show[1] === '×')) {
    const rows = p.op === 'mul' ? p.a : p.a;
    const cols = p.b;
    return (
      <div class="mq-model array" style={{ '--cols': cols }}>
        {Array.from({ length: rows * cols }, (_, i) => (
          <i key={i} class={Math.floor(i / cols) % 2 ? 'b' : 'a'} />
        ))}
      </div>
    );
  }
  const big = Math.max(p.a, p.b, p.c) > 20;
  if (big) {
    const blocks = (n: number, cls: string) => (
      <span class={`tens ${cls}`}>
        {Array.from({ length: Math.floor(n / 10) }, (_, i) => (
          <b key={`t${i}`} />
        ))}
        {Array.from({ length: n % 10 }, (_, i) => (
          <i key={`o${i}`} />
        ))}
      </span>
    );
    if (p.show[1] === '−') return <div class="mq-model blocks">{blocks(p.a, 'a')}<span class="mq-op">−</span>{blocks(p.b, 'b')}</div>;
    return <div class="mq-model blocks">{blocks(p.a, 'a')}<span class="mq-op">+</span>{blocks(p.b, 'b')}</div>;
  }
  if (p.show[1] === '−') return <div class="mq-model dots">{dots(p.a, 'a', p.a - p.b)}</div>;
  return (
    <div class="mq-model dots">
      {dots(p.a, 'a')}
      {dots(p.b, 'b')}
    </div>
  );
}

/** Math Quest (ages 6–8): ten questions a round, tap the answer on a felt keypad. */
export function MathQuest() {
  const [op, setOp] = useState<Op>('add');
  const level = mathLevel.value;
  const [p, setP] = useState<Problem>(() => makeProblem('add', level));
  const [input, setInput] = useState('');
  const [tries, setTries] = useState(0);
  const [state, setState] = useState<'ask' | 'right' | 'shown'>('ask');
  const [hint, setHint] = useState(false);
  const [n, setN] = useState(0);
  const [firstTry, setFirstTry] = useState(0);
  const firstRef = useRef(0);
  const [over, setOver] = useState(false);
  const [shake, setShake] = useState(false);
  const hostRef = useRef<HTMLElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const timers = useRef<number[]>([]);

  const later = (fn: () => void, ms: number) => timers.current.push(window.setTimeout(fn, ms));
  const clear = () => {
    timers.current.forEach((t) => window.clearTimeout(t));
    timers.current = [];
  };
  useEffect(() => () => (clear(), stopSpeech()), []);

  const ask = (q: Problem) => void say(biParts(q.say, lang.value));

  const fresh = (o: Op, lv: Level, restart = false) => {
    clear();
    const q = makeProblem(o, lv);
    setP(q);
    setInput('');
    setTries(0);
    setState('ask');
    setHint(false);
    if (restart) {
      setN(0);
      setFirstTry(0);
      firstRef.current = 0;
      setOver(false);
    }
    later(() => ask(q), 250);
  };

  useEffect(() => fresh(op, level, true), [op, level]);

  const next = () => {
    if (n + 1 >= ROUND) {
      setOver(true);
      cheer();
      award(2);
      const f = firstRef.current;
      void say(biParts({ en: `Great work! You got ${f} right first time.`, ne: `स्याबास! तिमीले ${neDigits(f)} वटा पहिलो पटकमै मिलायौ।` }, lang.value));
      return;
    }
    setN((x) => x + 1);
    fresh(op, level);
  };

  const submit = (given: string) => {
    if (state !== 'ask' || given === '') return;
    unlockAudio();
    if (isRight(p, given)) {
      setState('right');
      setInput(given);
      cheer();
      if (tries === 0) {
        firstRef.current += 1;
        setFirstTry(firstRef.current);
        award(1);
      }
      if (hostRef.current && cardRef.current) burst(hostRef.current, cardRef.current, 16);
      void say(biParts({ en: 'Yes! Well done!', ne: 'स्याबास! मिल्यो!' }, lang.value, '_welldone'));
      later(next, 1700);
    } else if (tries === 0) {
      setTries(1);
      setShake(true);
      later(() => setShake(false), 500);
      bloop(420, 300, 0.16);
      setInput('');
      void say(biParts(S.tryAgain, lang.value, 's-tryAgain'));
    } else {
      setState('shown');
      setHint(true);
      setInput(String(p.answer));
      bloop(500, 380, 0.2);
      const ans = typeof p.answer === 'number' ? p.answer : p.answer;
      void say(biParts({ en: `The answer is ${ans === '<' ? 'smaller' : ans === '>' ? 'bigger' : ans === '=' ? 'the same' : ans}.`, ne: `उत्तर ${ans === '<' ? 'सानो' : ans === '>' ? 'ठूलो' : ans === '=' ? 'बराबर' : neDigits(ans as number)} हो।` }, lang.value));
    }
  };

  const key = (k: string) => {
    if (state !== 'ask') return;
    unlockAudio();
    mallet(523.25 + (Number(k) || 0) * 40, 0.15, 0.3);
    if (k === 'back') setInput((v) => v.slice(0, -1));
    else if (k === 'ok') submit(input);
    else setInput((v) => (v.length >= 3 ? v : v === '0' ? k : v + k));
  };

  // Keyboard: digits, Backspace, Enter; < = > for compare. The listener is added once and
  // calls the latest handler through a ref, so a fast typist never hits a stale one.
  const onKey = (e: KeyboardEvent) => {
    if (document.querySelector('.panel') || over) return;
    if (state === 'shown' && (e.key === 'Enter' || e.key === ' ')) return next();
    if (p.op === 'compare') {
      if (e.key === '<' || e.key === '>' || e.key === '=') submit(e.key);
      return;
    }
    if (/^[0-9]$/.test(e.key)) key(e.key);
    else if (e.key === 'Backspace') key('back');
    else if (e.key === 'Enter') key('ok');
  };
  const keyRef = useRef(onKey);
  keyRef.current = onKey;
  useEffect(() => {
    const h = (e: KeyboardEvent) => keyRef.current(e);
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, []);

  const l = lang.value;
  const digits = (s: string) => (l === 'ne' ? s.replace(/\d+/g, (d) => neDigits(Number(d))) : s);
  const shownAnswer = input === '' ? '' : digits(input);

  return (
    <section class="screen mathq" ref={hostRef} aria-label="Math Quest">
      <div class="mq-top">
        <div class="mq-ops" role="group" aria-label="Kind of problem">
          {OPS.map((o) => (
            <button key={o.op} type="button" class="mq-op-btn" style={{ '--c': o.color }} aria-pressed={op === o.op} onClick={() => (unlockAudio(), sfx('pop'), setOp(o.op))}>
              <b>{o.sym}</b>
              <Bi t={o.name} />
            </button>
          ))}
        </div>
        <div class="kid-tabs mq-levels" role="group" aria-label="Level">
          {([1, 2, 3] as Level[]).map((lv) => (
            <button key={lv} type="button" aria-pressed={level === lv} onClick={() => (mathLevel.value = lv)}>
              {'★'.repeat(lv)}
            </button>
          ))}
        </div>
      </div>

      <div class="mq-main">
        <div class="mq-side">
          <Buddy class="habre-small" />
          <div class="mq-progress" aria-label={`Question ${n + 1} of ${ROUND}`}>
            {Array.from({ length: ROUND }, (_, i) => (
              <i key={i} class={i < n ? 'done' : i === n ? 'now' : ''} />
            ))}
          </div>
          <Stars n={firstTry} />
        </div>

        <div class="mq-center">
          <div ref={cardRef} class={`mq-card ${state}${shake ? ' shake' : ''}`}>
            <button type="button" class="mq-hear" onClick={() => ask(p)} aria-label="Hear the question">
              <SpeakerIcon />
            </button>
            <div class="mq-eq" aria-live="polite">
              {p.show.map((t, i) =>
                t === '?' ? (
                  <span key={i} class={`mq-blank${input ? ' filled' : ''}`}>
                    {p.op === 'compare' ? input || '?' : shownAnswer || '?'}
                  </span>
                ) : (
                  <span key={i} class={/^[+−×=]$/.test(t) ? 'mq-sym' : 'mq-num'}>
                    {digits(t)}
                  </span>
                ),
              )}
            </div>
            {hint && <Model p={p} />}
          </div>

          {p.op === 'compare' ? (
            <div class="mq-signs">
              {SIGNS.map((s) => (
                <button key={s.s} type="button" class="mq-sign" disabled={state !== 'ask'} onClick={() => submit(s.s)}>
                  <b>{s.s}</b>
                  <Bi t={s.name} />
                </button>
              ))}
            </div>
          ) : (
            <div class="mq-pad">
              {['7', '8', '9', '4', '5', '6', '1', '2', '3', 'back', '0', 'ok'].map((k) => (
                <button
                  key={k}
                  type="button"
                  class={`mq-key${k === 'ok' ? ' ok' : k === 'back' ? ' back' : ''}`}
                  disabled={state !== 'ask' || (k === 'ok' && input === '')}
                  onClick={() => key(k)}
                  aria-label={k === 'ok' ? 'Check' : k === 'back' ? 'Delete' : k}
                >
                  {k === 'ok' ? '✓' : k === 'back' ? '⌫' : l === 'ne' ? neDigits(Number(k)) : k}
                </button>
              ))}
            </div>
          )}

          <div class="mq-actions">
            {state === 'shown' ? (
              <button type="button" class="pill-btn go" onClick={next}>
                <Bi t={{ en: 'Next', ne: 'अर्को' }} /> ›
              </button>
            ) : (
              <button type="button" class="pill-btn" onClick={() => (unlockAudio(), setHint((h) => !h))} aria-pressed={hint}>
                💡 <Bi t={{ en: 'Show me', ne: 'देखाऊ' }} />
              </button>
            )}
          </div>
        </div>
      </div>

      {over && (
        <div class="mq-over">
          <div class="mq-over-card">
            <Buddy class="habre-home" />
            <h2>
              <Bi t={{ en: 'Quest complete!', ne: 'यात्रा पूरा भयो!' }} />
            </h2>
            <p>
              <Bi t={{ en: `${firstTry} of ${ROUND} right first time`, ne: `${ROUND} मध्ये ${neDigits(firstTry)} पहिलो पटकमै` }} />
            </p>
            <Stars n={firstTry} />
            <button type="button" class="pill-btn go" onClick={() => fresh(op, level, true)}>
              <Bi t={{ en: 'Play again', ne: 'फेरि खेलौँ' }} />
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
