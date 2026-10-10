import { useEffect, useRef, useState } from 'preact/hooks';
import { lang, shopLevel, type Level } from '../../core/settings';
import { unlockAudio, cheer, bloop, sfx, mallet } from '../../core/audio';
import { say, stopSpeech, type Part } from '../../core/voice';
import { award } from '../../core/rewards';
import { itemById, type Item } from '../../content/items';
import { neDigits } from '../../content/numbers';
import { Bi, ItemArt, Stars, burst } from '../../ui/common';
import { Buddy } from '../../ui/Buddy';
import { SpeakerIcon } from '../letters/Letters';

/**
 * Rupee Shop (ages 5–8): the buddy keeps a market stall (हाट बजार). The child pays for what
 * the buddy names with felt coins and notes, exactly. Level 3 adds "how much change?".
 * Money is generic felt, not a copy of real notes.
 */
const GOODS = ['aanp', 'kera', 'suntala', 'golbheda', 'mula', 'makai', 'syau', 'chappal', 'chhata', 'changa', 'doko', 'gagri', 'dhaka-topi', 'madal'];
const MONEY: Record<Level, number[]> = { 1: [1, 2, 5], 2: [1, 2, 5, 10, 20], 3: [1, 2, 5, 10, 20, 50] };
const PRICE: Record<Level, [number, number]> = { 1: [2, 10], 2: [6, 30], 3: [11, 99] };
const LOOK: Record<number, { bg: string; ink: string; note: boolean }> = {
  1: { bg: '#C9CED1', ink: '#3b4446', note: false },
  2: { bg: '#D9B25F', ink: '#5a4210', note: false },
  5: { bg: '#E9C455', ink: '#5a4210', note: false },
  10: { bg: '#C98B4F', ink: '#3B2A22', note: true },
  20: { bg: '#F28C28', ink: '#3B2A22', note: true },
  50: { bg: '#8D5CD0', ink: '#fff', note: true },
  100: { bg: '#5DB646', ink: '#1d2a28', note: true },
};

interface Task {
  goods: string[];
  target: string;
  prices: Record<string, number>;
  kind: 'pay' | 'change';
  paidWith: number;
}

const rint = (lo: number, hi: number) => lo + Math.floor(Math.random() * (hi - lo + 1));

function makeTask(level: Level): Task {
  const pool = [...GOODS].sort(() => Math.random() - 0.5).slice(0, 3);
  const [lo, hi] = PRICE[level];
  const prices: Record<string, number> = {};
  for (const g of pool) prices[g] = rint(lo, hi);
  const target = pool[rint(0, 2)];
  const kind = level === 3 && Math.random() < 0.5 ? 'change' : 'pay';
  let paidWith = 0;
  if (kind === 'change') {
    prices[target] = rint(5, 95);
    paidWith = prices[target] <= 50 ? 50 : 100;
    if (prices[target] === paidWith) prices[target] -= rint(1, 4);
  }
  return { goods: pool, target, prices, kind, paidWith };
}

function Money({ v, onClick, small, label }: { v: number; onClick?: () => void; small?: boolean; label: string }) {
  const look = LOOK[v];
  return (
    <button
      type="button"
      class={`money ${look.note ? 'note' : 'coin'}${v === 5 ? ' big' : ''}${small ? ' small' : ''}`}
      style={{ '--bg': look.bg, '--ink': look.ink }}
      onClick={onClick}
      aria-label={`${v} rupees`}
    >
      <span class="money-rs">रु</span>
      <span class="money-v">{label}</span>
    </button>
  );
}

export function Shop() {
  const level = shopLevel.value;
  const [task, setTask] = useState<Task>(() => makeTask(level));
  const [tray, setTray] = useState<number[]>([]);
  const [input, setInput] = useState('');
  const [msg, setMsg] = useState<{ en: string; ne: string } | null>(null);
  const [done, setDone] = useState(false);
  const [stars, setStars] = useState(0);
  const [tries, setTries] = useState(0);
  const hostRef = useRef<HTMLElement>(null);
  const trayRef = useRef<HTMLDivElement>(null);
  const timers = useRef<number[]>([]);

  const l = lang.value;
  const dg = (n: number) => (l === 'ne' ? neDigits(n) : String(n));
  const it = itemById(task.target) as Item;
  const price = task.prices[task.target];
  const total = tray.reduce((a, b) => a + b, 0);

  const later = (fn: () => void, ms: number) => timers.current.push(window.setTimeout(fn, ms));
  const parts = (t: { en: string; ne: string }): Part[] => {
    const ne: Part = { text: t.ne, lang: 'ne' };
    const en: Part = { text: t.en, lang: 'en' };
    return l === 'en' ? [en] : l === 'ne' ? [ne] : [ne, en];
  };
  const prompt = (t: Task): { en: string; ne: string } => {
    const g = itemById(t.target)!;
    const p = t.prices[t.target];
    return t.kind === 'pay'
      ? { en: `The ${g.en} costs ${p} rupees. Can you pay?`, ne: `${g.ne}को मूल्य ${neDigits(p)} रुपैयाँ। तिर्न सक्छौ?` }
      : { en: `The ${g.en} costs ${p} rupees. You give ${t.paidWith}. How much change?`, ne: `${g.ne} ${neDigits(p)} रुपैयाँको। तिमीले ${neDigits(t.paidWith)} दियौ। कति फिर्ता?` };
  };

  const start = (lv: Level) => {
    timers.current.forEach((t) => window.clearTimeout(t));
    timers.current = [];
    const t = makeTask(lv);
    setTask(t);
    setTray(t.kind === 'change' ? [t.paidWith] : []);
    setInput('');
    setMsg(null);
    setDone(false);
    setTries(0);
    later(() => void say(parts(prompt(t))), 300);
  };

  useEffect(() => {
    start(level);
    return () => {
      timers.current.forEach((t) => window.clearTimeout(t));
      stopSpeech();
    };
  }, [level]);

  const win = () => {
    setDone(true);
    cheer();
    sfx('coin');
    award(1);
    setStars((s) => s + 1);
    if (hostRef.current && trayRef.current) burst(hostRef.current, trayRef.current, 20);
    setMsg({ en: 'Thank you! Here you go.', ne: 'धन्यवाद! लेऊ।' });
    void say(parts({ en: `Thank you! Here is your ${it.en}.`, ne: `धन्यवाद! यो लेऊ तिम्रो ${it.ne}।` }));
    later(() => start(level), 2800);
  };

  const add = (v: number) => {
    if (done || task.kind !== 'pay') return;
    unlockAudio();
    sfx('coin');
    const next = [...tray, v];
    setTray(next);
    const t = next.reduce((a, b) => a + b, 0);
    if (t === price) win();
    else if (t > price) {
      bloop(420, 300, 0.16);
      setMsg({ en: 'Too much! Tap money in the tray to take it back.', ne: 'धेरै भयो! फिर्ता लिन थालमा पैसा थिच।' });
      void say(parts({ en: 'Oops, too much! Take some back.', ne: 'ओहो, धेरै भयो! अलिकति फिर्ता लेऊ।' }));
    } else setMsg(null);
  };

  const remove = (i: number) => {
    if (done || task.kind !== 'pay') return;
    unlockAudio();
    mallet(392, 0.15, 0.3);
    const next = tray.filter((_, k) => k !== i);
    setTray(next);
    const t = next.reduce((a, b) => a + b, 0);
    if (t === price) win();
    else setMsg(null);
  };

  const key = (k: string) => {
    if (done || task.kind !== 'change') return;
    unlockAudio();
    mallet(523.25, 0.12, 0.25);
    if (k === 'back') return setInput((v) => v.slice(0, -1));
    if (k === 'ok') {
      if (!input) return;
      if (Number(input) === task.paidWith - price) win();
      else if (tries === 0) {
        setTries(1);
        bloop(420, 300, 0.16);
        setInput('');
        setMsg({ en: `Almost! Count up from ${price} to ${task.paidWith}.`, ne: `झन्डै! ${neDigits(price)} देखि ${neDigits(task.paidWith)} सम्म गन।` });
        void say(parts({ en: `Almost! Count up from ${price} to ${task.paidWith}.`, ne: `झन्डै! ${neDigits(price)} देखि ${neDigits(task.paidWith)} सम्म गन।` }));
      } else {
        setInput(String(task.paidWith - price));
        setMsg({ en: `The change is ${task.paidWith - price} rupees.`, ne: `फिर्ता ${neDigits(task.paidWith - price)} रुपैयाँ।` });
        void say(parts({ en: `The change is ${task.paidWith - price} rupees.`, ne: `फिर्ता ${neDigits(task.paidWith - price)} रुपैयाँ।` }));
        setDone(true);
        later(() => start(level), 3600);
      }
      return;
    }
    setInput((v) => (v.length >= 3 ? v : v === '0' ? k : v + k));
  };

  const p = prompt(task);
  return (
    <section class="screen shop" ref={hostRef} aria-label="Rupee Shop">
      <div class="shop-stall">
        <div class="awning" aria-hidden="true" />
        <div class="shelf">
          {task.goods.map((g) => {
            const gi = itemById(g)!;
            return (
              <div key={g} class={`goods${g === task.target ? ' want' : ''}`}>
                <ItemArt id={g} />
                <span class="tag">
                  रु {dg(task.prices[g])}
                </span>
                <span class="goods-name">
                  <Bi t={gi} />
                </span>
              </div>
            );
          })}
        </div>
      </div>

      <div class="shop-talk">
        <Buddy class="habre-small" />
        <button type="button" class="bubble left shop-ask" onClick={() => void say(parts(p))}>
          <SpeakerIcon />
          <span>
            <Bi t={msg ?? p} />
          </span>
        </button>
        <div class="kid-tabs shop-levels" role="group" aria-label="Level">
          {([1, 2, 3] as Level[]).map((lv) => (
            <button key={lv} type="button" aria-pressed={level === lv} onClick={() => (shopLevel.value = lv)}>
              {'★'.repeat(lv)}
            </button>
          ))}
          <Stars n={stars} max={5} />
        </div>
      </div>

      <div class="shop-pay">
        <div class={`tray${done ? ' paid' : ''}`} ref={trayRef}>
          <span class="tray-label">
            <Bi t={task.kind === 'pay' ? { en: 'You pay', ne: 'तिमीले तिरेको' } : { en: 'You gave', ne: 'तिमीले दिएको' }} />
            <b>रु {dg(total)}</b>
            {task.kind === 'pay' && (
              <small>
                / {dg(price)}
              </small>
            )}
          </span>
          <div class="tray-money">
            {tray.map((v, i) => (
              <Money key={`${i}-${v}`} v={v} small label={dg(v)} onClick={() => remove(i)} />
            ))}
          </div>
        </div>

        {task.kind === 'pay' ? (
          <div class="wallet" role="group" aria-label="Your money">
            {MONEY[level].map((v) => (
              <Money key={v} v={v} label={dg(v)} onClick={() => add(v)} />
            ))}
          </div>
        ) : (
          <div class="change-box">
            <span class="change-q">
              <Bi t={{ en: 'Change:', ne: 'फिर्ता:' }} /> <b class="mq-blank">{input ? dg(Number(input)) : '?'}</b>
            </span>
            <div class="mq-pad small">
              {['7', '8', '9', '4', '5', '6', '1', '2', '3', 'back', '0', 'ok'].map((k) => (
                <button key={k} type="button" class={`mq-key${k === 'ok' ? ' ok' : k === 'back' ? ' back' : ''}`} disabled={done} onClick={() => key(k)} aria-label={k}>
                  {k === 'ok' ? '✓' : k === 'back' ? '⌫' : l === 'ne' ? neDigits(Number(k)) : k}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
