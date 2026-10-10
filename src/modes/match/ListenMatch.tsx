import { useEffect, useRef, useState } from 'preact/hooks';
import { lang, matchLevel } from '../../core/settings';
import { unlockAudio, cheer, bloop, chime } from '../../core/audio';
import { say, stopSpeech, type Part } from '../../core/voice';
import { record, type ProgressLang } from '../../core/progress';
import { CATEGORIES, ITEMS, categoryOf, type CategoryId, type Item } from '../../content/items';
import { S } from '../../content/strings';
import { Bi, ItemArt, Stars, burst } from '../../ui/common';
import { Buddy } from '../../ui/Buddy';
import { award } from '../../core/rewards';
import { buildRound, type Round } from './round';

type Mark = 'right' | 'wrong' | undefined;

const langsFor = (l: string): ProgressLang[] => (l === 'en' ? ['en'] : l === 'ne' ? ['ne'] : ['ne', 'en']);

function askParts(item: Item, l: string): Part[] {
  const ne: Part = { text: `${item.ne} कहाँ छ?`, lang: 'ne', clips: [`ne/${item.id}`, 'ne/_where'] };
  const en: Part = { text: `Where is the ${item.en}?`, lang: 'en', clips: ['en/_where', `en/${item.id}`] };
  return l === 'en' ? [en] : l === 'ne' ? [ne] : [ne, en];
}
function nameParts(item: Item, l: string): Part[] {
  const ne: Part = { text: item.ne, lang: 'ne', clips: [`ne/${item.id}`] };
  const en: Part = { text: item.en, lang: 'en', clips: [`en/${item.id}`] };
  return l === 'en' ? [en] : l === 'ne' ? [ne] : [ne, en];
}
function praiseParts(item: Item, l: string): Part[] {
  const ne: Part = { text: `स्याबास! ${item.ne}!`, lang: 'ne', clips: ['ne/_welldone', `ne/${item.id}`] };
  const en: Part = { text: `Well done! ${item.en}!`, lang: 'en', clips: ['en/_welldone', `en/${item.id}`] };
  return l === 'en' ? [en] : l === 'ne' ? [ne] : [ne, en];
}

/**
 * Listen & Find: hear a word, tap its picture.
 * No buzzer and no lives: a wrong picture says its own name (still learning), and after two
 * misses the right card glows. Level sets the number of cards; level 3 hides names until found.
 */
export function ListenMatch() {
  const [cat, setCat] = useState<CategoryId | 'all'>('all');
  const [round, setRound] = useState<Round | null>(null);
  const [marks, setMarks] = useState<Record<string, Mark>>({});
  const [misses, setMisses] = useState(0);
  const [done, setDone] = useState(false);
  const [found, setFound] = useState(0);
  const hostRef = useRef<HTMLElement>(null);
  const timers = useRef<number[]>([]);
  const lastId = useRef<string>();
  // Refs mirror state for callbacks that resolve later (speech ends, timers fire),
  // so a late callback never re-asks a round that is already solved or replaced.
  const doneRef = useRef(false);
  const roundRef = useRef<Round | null>(null);

  const l = lang.value;
  const level = matchLevel.value;
  const n = level + 1;

  const clearTimers = () => {
    timers.current.forEach((t) => window.clearTimeout(t));
    timers.current = [];
  };

  const ask = async (item: Item) => {
    const heard = await say(askParts(item, lang.value));
    if (!heard) chime(); // no voice for this language yet: a chime still tells the child to look
  };

  const next = () => {
    clearTimers();
    const pool = cat === 'all' ? ITEMS : ITEMS.filter((i) => i.cat === cat);
    const r = buildRound(pool, n, langsFor(lang.value), lastId.current);
    lastId.current = r.target.id;
    roundRef.current = r;
    doneRef.current = false;
    setRound(r);
    setMarks({});
    setMisses(0);
    setDone(false);
    void ask(r.target);
  };

  useEffect(() => {
    next();
    return () => {
      clearTimers();
      stopSpeech();
    };
  }, [cat, level, l]);

  const pick = (item: Item, el: HTMLElement) => {
    if (!round || doneRef.current) return;
    unlockAudio();
    if (item.id === round.target.id) {
      doneRef.current = true;
      setDone(true);
      setMarks((m) => ({ ...m, [item.id]: 'right' }));
      record(item.id, langsFor(lang.value), misses === 0);
      setFound((f) => f + 1);
      award(1);
      cheer();
      if (hostRef.current) burst(hostRef.current, el);
      void say(praiseParts(item, lang.value));
      timers.current.push(window.setTimeout(next, 2600));
    } else {
      bloop(420, 300, 0.14);
      setMarks((m) => ({ ...m, [item.id]: 'wrong' }));
      setMisses((x) => x + 1);
      timers.current.push(window.setTimeout(() => setMarks((m) => ({ ...m, [item.id]: undefined })), 700));
      const r = round;
      void say(nameParts(item, lang.value)).then(() => {
        timers.current.push(
          window.setTimeout(() => {
            if (!doneRef.current && roundRef.current === r) void ask(r.target);
          }, 500),
        );
      });
    }
  };

  if (!round) return null;
  const t = round.target;
  const showNames = level < 3 || done;
  const hint = misses >= 2 && !done;
  const tint = cat === 'all' ? undefined : CATEGORIES.find((c) => c.id === cat)?.tint;

  return (
    <section class="screen match" ref={hostRef} aria-label="Listen and Find">
      <div class="match-top">
        <Buddy class="habre-small" react={false} onTap={() => void ask(t)} />
        <button type="button" class="bubble left ask" onClick={() => void ask(t)} aria-label="Hear it again">
          <span class="ear" aria-hidden="true">
            <svg viewBox="0 0 24 24"><path d="M4 9v6h4l5 4V5L8 9H4zm12.5 3a4.5 4.5 0 0 0-2.5-4v8a4.5 4.5 0 0 0 2.5-4zM14 3.2v2.1a7 7 0 0 1 0 13.4v2.1a9 9 0 0 0 0-17.6z" /></svg>
          </span>
          <Bi t={{ en: `Where is the ${t.en}?`, ne: `${t.ne} कहाँ छ?` }} />
        </button>
      </div>

      <div class="cats" role="group" aria-label="Topics">
        <button type="button" aria-pressed={cat === 'all'} onClick={() => setCat('all')}>
          <Bi t={S.all} />
        </button>
        {CATEGORIES.map((c) => (
          <button type="button" key={c.id} aria-pressed={cat === c.id} onClick={() => setCat(c.id)}>
            <ItemArt id={c.icon} class="cat-icon" />
            <Bi t={c} />
          </button>
        ))}
      </div>

      <div class={`cards n${round.cards.length}`} key={round.key}>
        {round.cards.map((item) => {
          const mark = marks[item.id];
          const isHint = hint && item.id === t.id;
          return (
            <button
              type="button"
              key={item.id}
              class={`card${mark ? ` ${mark}` : ''}${isHint ? ' hint' : ''}${done && item.id !== t.id ? ' fade' : ''}`}
              style={{ '--tint': tint ?? categoryOf(item).tint }}
              onClick={(e) => pick(item, e.currentTarget as HTMLElement)}
              aria-label={showNames ? `${item.en}, ${item.ne}` : 'picture card'}
            >
              <ItemArt id={item.id} />
              <span class={`card-name${showNames ? '' : ' hidden'}`}>
                <Bi t={item} />
              </span>
            </button>
          );
        })}
      </div>

      <div class="match-foot">
        <Bi t={S.found} /> <Stars n={found} />
      </div>
    </section>
  );
}
