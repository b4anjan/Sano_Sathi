import type { JSX } from 'preact';
import { screen, type Screen } from '../core/nav';
import { lang, buddy, type Lang } from '../core/settings';
import { unlockAudio, sfx } from '../core/audio';
import { say, stopSpeech, type Part } from '../core/voice';
import { stickers, totalStars, starsToNext } from '../core/rewards';
import { S, type Bi as BiText } from '../content/strings';
import { ACTIVITIES, SECTIONS, type ActivityId } from '../content/activities';
import { BUDDIES, BUDDY_IDS, GREETINGS, greetingKey, type BuddyId } from '../content/buddies';
import { ITEMS } from '../content/items';
import { shapeSVG } from '../content/shapes';
import { BRAND } from '../brand';
import { Bi, ItemArt } from './common';
import { Buddy, buddyParts } from './Buddy';
import { dhakaTile } from '../content/art';

const FELT_COLORS = ['var(--red)', 'var(--yellow)', 'var(--green)', 'var(--sky)', 'var(--orange)', 'var(--pink)', 'var(--purple)', 'var(--blue)'];

/** The app name in felt letters. Built from BRAND, so a rename needs no change here. */
function FeltName() {
  let n = 0;
  return (
    <h1 class="felt-name" aria-label={`${BRAND.appName}, ${BRAND.appNameNe}`}>
      <span aria-hidden="true">
        {BRAND.appName.split('').map((ch, i) => {
          if (ch === ' ') return <span key={i}> </span>;
          const c = FELT_COLORS[n++ % FELT_COLORS.length];
          const r = ((i * 37) % 9) - 4;
          return (
            <span key={i} class="fl" style={{ '--c': c, '--r': `${r}deg` }}>
              {ch}
            </span>
          );
        })}
        <span class="rest" lang="ne">{BRAND.appNameNe}</span>
      </span>
    </h1>
  );
}

/** Say a sentence in the current language(s); `key` names its recording (ne/<key>, en/<key>). */
function sayBi(t: BiText, key: string) {
  const l = lang.value;
  const parts: Part[] = [];
  if (l !== 'en') parts.push({ text: t.ne, lang: 'ne', clips: [`ne/${key}`] });
  if (l !== 'ne') parts.push({ text: t.en, lang: 'en', clips: [`en/${key}`] });
  void say(parts);
}

const big = (ch: string, c: string, ne = false) => (
  <span class={`fl-big${ne ? ' ne' : ''}`} style={{ '--c': c }}>
    {ch}
  </span>
);

/** Tile pictures, one per activity. */
const TILE_ART: Record<ActivityId, () => JSX.Element> = {
  match: () => (
    <>
      <ItemArt id="gai" />
      <ItemArt id="suntala" />
      <ItemArt id="dhaka-topi" />
    </>
  ),
  memory: () => (
    <>
      <span class="mini-card back" style={{ backgroundImage: dhakaTile() }} aria-hidden="true" />
      <span class="mini-card">
        <ItemArt id="yak" />
      </span>
      <span class="mini-card">
        <ItemArt id="yak" />
      </span>
    </>
  ),
  letters: () => (
    <>
      {big('A', 'var(--red)')}
      {big('क', 'var(--yellow)', true)}
      <ItemArt id="syau" class="small" />
    </>
  ),
  numbers: () => (
    <>
      {big('1', 'var(--green)')}
      {big('२', 'var(--pink)', true)}
      {big('3', 'var(--blue)')}
    </>
  ),
  count: () => (
    <>
      <ItemArt id={BUDDIES[buddy.value].art} />
      <ItemArt id="suntala" class="small" />
      <ItemArt id="suntala" class="small" />
    </>
  ),
  shapes: () => (
    <span class="tile-shapes" aria-hidden="true">
      <span dangerouslySetInnerHTML={{ __html: shapeSVG('star', '#F6C232') }} />
      <span dangerouslySetInnerHTML={{ __html: shapeSVG('circle', '#E5483D') }} />
      <span dangerouslySetInnerHTML={{ __html: shapeSVG('triangle', '#5DB646') }} />
    </span>
  ),
  smash: () => (
    <>
      {big('A', 'var(--red)')}
      {big('क', 'var(--blue)', true)}
      <ItemArt id="tara" class="small" />
    </>
  ),
  bubbles: () => (
    <span class="tile-bubbles" aria-hidden="true">
      <i style={{ '--s': '64px', '--n': 64 }}>B</i>
      <i style={{ '--s': '50px', '--n': 50 }} class="ne">ख</i>
      <i style={{ '--s': '40px', '--n': 40 }}>4</i>
    </span>
  ),
  xylo: () => (
    <>
      <div class="mini-bars" aria-hidden="true">
        {['red', 'orange', 'yellow', 'green', 'sky', 'blue', 'purple', 'pink'].map((c, i) => (
          <i key={c} style={{ '--c': `var(--${c})`, height: `${100 - (40 * i) / 7}%` }} />
        ))}
      </div>
      <ItemArt id="madal" />
    </>
  ),
  paint: () => (
    <span class="tile-paint" aria-hidden="true">
      <svg viewBox="0 0 120 80">
        {['#E5483D', '#F28C28', '#F6C232', '#5DB646', '#5BB8EC', '#8D5CD0'].map((c, i) => (
          <path key={c} d={`M10 ${70 - i * 2} Q60 ${-10 + i * 8} 110 ${70 - i * 2}`} fill="none" stroke={c} stroke-width="7" stroke-linecap="round" />
        ))}
      </svg>
    </span>
  ),
  village: () => (
    <>
      <ItemArt id="khet" />
      <ItemArt id="gai" class="small" />
      <ItemArt id="laligurans" class="small" />
    </>
  ),
  copy: () => (
    <span class="tile-copy" aria-hidden="true">
      {['var(--red)', 'var(--yellow)', 'var(--green)', 'var(--blue)'].map((c, i) => (
        <i key={c} class={i === 1 ? 'on' : ''} style={{ '--c': c }} />
      ))}
    </span>
  ),
  math: () => (
    <>
      {big('7', 'var(--yellow)')}
      {big('+', 'var(--chalk)')}
      {big('5', 'var(--green)')}
    </>
  ),
  shop: () => (
    <>
      <span class="tile-coin" aria-hidden="true">रु</span>
      <ItemArt id="aanp" class="small" />
      <ItemArt id="kera" class="small" />
    </>
  ),
};

function BuddyPicker() {
  const pick = (id: BuddyId) => {
    unlockAudio();
    buddy.value = id;
    sfx(id === 'cat' ? 'meow' : id === 'puppy' ? 'bark' : 'chime');
    window.setTimeout(() => void say(buddyParts(id, 'hello', BUDDIES[id].hello)), 250);
  };
  return (
    <div class="buddy-pick" role="group" aria-label={`${S.chooseBuddy.en} · ${S.chooseBuddy.ne}`}>
      <span class="buddy-pick-label">
        <Bi t={S.chooseBuddy} />
      </span>
      {BUDDY_IDS.map((id) => (
        <button
          key={id}
          type="button"
          class="buddy-chip"
          style={{ '--t': BUDDIES[id].tint }}
          aria-pressed={buddy.value === id}
          aria-label={`${BUDDIES[id].name.en}, ${BUDDIES[id].name.ne}`}
          onClick={() => pick(id)}
        >
          <ItemArt id={BUDDIES[id].art} />
          <Bi t={BUDDIES[id].name} class="bc-name" />
        </button>
      ))}
    </div>
  );
}

export function Home() {
  const b = BUDDIES[buddy.value];
  const gk = greetingKey(new Date().getHours());
  const greeting = GREETINGS[gk];

  const open = (s: Screen, t: BiText) => {
    unlockAudio();
    stopSpeech();
    screen.value = s;
    sayBi(t, `s-${s}`);
  };
  const pickLang = (l: Lang) => {
    unlockAudio();
    lang.value = l;
  };
  const hello = () => {
    unlockAudio();
    const l = lang.value;
    const parts: Part[] = [];
    if (l !== 'en') parts.push({ text: greeting.ne, lang: 'ne', clips: [`ne/_${gk}`] });
    if (l !== 'ne') parts.push({ text: greeting.en, lang: 'en', clips: [`en/_${gk}`] });
    void say([...parts, ...buddyParts(b.id, 'hello', b.hello)]);
  };

  const owned = stickers.value.length;
  return (
    <section class="screen home" aria-labelledby="homeName">
      <div class="home-top">
        <div id="homeName" class="home-name">
          <FeltName />
        </div>
        <div class="greet">
          <Buddy class="habre-home" />
          <button type="button" class="bubble left hello" onClick={hello}>
            <span class="hello-time">
              <Bi t={greeting} />
            </span>
            <Bi t={b.hello} />
          </button>
        </div>
        <div class="home-bar">
          <div class="lang-pick" role="group" aria-label="Language">
            {(
              [
                ['en', 'English', 'EN', 'en'],
                ['ne', 'नेपाली', 'ने', 'ne'],
                ['both', 'दुवै · Both', 'दुवै', ''],
              ] as Array<[Lang, string, string, string]>
            ).map(([v, label, short, l]) => (
              <button
                key={v}
                type="button"
                aria-pressed={lang.value === v}
                aria-label={v === 'both' ? 'Both languages' : v === 'en' ? 'English' : 'Nepali'}
                onClick={() => pickLang(v)}
                lang={l || undefined}
              >
                <span class="long">{label}</span>
                <span class="short" aria-hidden="true">
                  {short}
                </span>
              </button>
            ))}
          </div>
          <BuddyPicker />
        </div>
        <button type="button" class="sticker-btn" onClick={() => open('stickers', S.stickers)} aria-label={`${S.stickers.en}: ${owned} of ${ITEMS.length}`}>
          <span class="sticker-btn-art" aria-hidden="true">
            <ItemArt id={stickers.value[owned - 1] ?? 'tara'} />
          </span>
          <span class="sb-text">
            <Bi t={S.stickers} />
            <small>
              {owned}/{ITEMS.length} · ★ {totalStars.value % 5}/5
            </small>
          </span>
          <span class="sb-count" aria-hidden="true">
            {owned}
            <small>/{ITEMS.length}</small>
          </span>
        </button>
      </div>

      {SECTIONS.map((sec) => (
        <section key={sec.id} class="home-sec" aria-label={sec.title.en}>
          <h2 class="sec-title">
            <Bi t={sec.title} />
          </h2>
          <div class="tiles">
            {ACTIVITIES.filter((a) => a.section === sec.id).map((a) => (
              <button key={a.id} type="button" class="tile" style={{ '--c': a.color }} onClick={() => open(a.id, a.title)}>
                <div class="tile-art">{TILE_ART[a.id]()}</div>
                <h3>
                  <Bi t={a.title} />
                </h3>
                <p>
                  <Bi t={a.sub} />
                </p>
                <span class="age">Ages {a.age}</span>
              </button>
            ))}
          </div>
        </section>
      ))}

      <p class="parent-note">
        Grown-ups: hold <b>Grown-ups</b> in the top-left corner for 2 seconds, or type <kbd>parent</kbd>, to change the
        language, sound, levels or buddy, or to record your own voice. Children can hold the house button for a second to come
        back here; you can turn that off.
      </p>
      <p class="foot">
        {BRAND.appName} · {BRAND.stage} · by {BRAND.publisher} · {starsToNext()} more ★ to the next sticker
      </p>
    </section>
  );
}
