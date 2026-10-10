import { screen, type Screen } from '../core/nav';
import { lang, type Lang } from '../core/settings';
import { unlockAudio } from '../core/audio';
import { say } from '../core/voice';
import { S, type Bi as BiText } from '../content/strings';
import { BRAND } from '../brand';
import { Bi, Habre, ItemArt } from './common';
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

function sayBi(t: BiText) {
  const l = lang.value;
  const parts = [];
  if (l !== 'en') parts.push({ text: t.ne, lang: 'ne' as const });
  if (l !== 'ne') parts.push({ text: t.en, lang: 'en' as const });
  void say(parts);
}

export function Home() {
  const open = (s: Screen, t: BiText) => {
    unlockAudio();
    screen.value = s;
    sayBi(t);
  };
  const pickLang = (l: Lang) => {
    unlockAudio();
    lang.value = l;
  };

  return (
    <section class="screen home" aria-labelledby="homeName">
      <div class="home-head">
        <div id="homeName">
          <FeltName />
        </div>
        <div class="greet">
          <Habre class="habre-home" onTap={() => (unlockAudio(), sayBi(S.hello))} />
          <div class="bubble left">
            <Bi t={S.hello} />
          </div>
        </div>
      </div>

      <div class="lang-pick" role="group" aria-label="Language">
        {(
          [
            ['en', 'English', 'en'],
            ['ne', 'नेपाली', 'ne'],
            ['both', 'दुवै · Both', ''],
          ] as Array<[Lang, string, string]>
        ).map(([v, label, l]) => (
          <button key={v} type="button" aria-pressed={lang.value === v} onClick={() => pickLang(v)} lang={l || undefined}>
            {label}
          </button>
        ))}
      </div>

      <div class="tiles">
        <button type="button" class="tile" style={{ '--c': 'var(--yellow)' }} onClick={() => open('match', S.match)}>
          <div class="tile-art">
            <ItemArt id="gai" />
            <ItemArt id="suntala" />
            <ItemArt id="dhaka-topi" />
          </div>
          <h2><Bi t={S.match} /></h2>
          <p><Bi t={S.matchSub} /></p>
          <span class="age">Ages 2–8</span>
        </button>
        <button type="button" class="tile" style={{ '--c': 'var(--green)' }} onClick={() => open('memory', S.memory)}>
          <div class="tile-art">
            <span class="mini-card back" style={{ backgroundImage: dhakaTile() }} aria-hidden="true" />
            <span class="mini-card"><ItemArt id="yak" /></span>
            <span class="mini-card"><ItemArt id="yak" /></span>
          </div>
          <h2><Bi t={S.memory} /></h2>
          <p><Bi t={S.memorySub} /></p>
          <span class="age">Ages 3–8</span>
        </button>
        <button type="button" class="tile" style={{ '--c': 'var(--sky)' }} onClick={() => open('count', S.count)}>
          <div class="tile-art">
            <ItemArt id="habre" />
            <ItemArt id="suntala" class="small" />
            <ItemArt id="suntala" class="small" />
          </div>
          <h2><Bi t={S.count} /></h2>
          <p><Bi t={S.countSub} /></p>
          <span class="age">Ages 3–6</span>
        </button>
        <button type="button" class="tile" style={{ '--c': 'var(--orange)' }} onClick={() => open('smash', S.smash)}>
          <div class="tile-art smash-art" aria-hidden="true">
            <span class="fl-big" style={{ '--c': 'var(--red)' }}>A</span>
            <span class="fl-big ne" style={{ '--c': 'var(--blue)' }}>क</span>
            <ItemArt id="tara" class="small" />
          </div>
          <h2><Bi t={S.smash} /></h2>
          <p><Bi t={S.smashSub} /></p>
          <span class="age">Ages 1–6</span>
        </button>
        <button type="button" class="tile" style={{ '--c': 'var(--pink)' }} onClick={() => open('xylo', S.xylo)}>
          <div class="tile-art">
            <div class="mini-bars" aria-hidden="true">
              {['red', 'orange', 'yellow', 'green', 'sky', 'blue', 'purple', 'pink'].map((c, i) => (
                <i key={c} style={{ '--c': `var(--${c})`, height: `${100 - (40 * i) / 7}%` }} />
              ))}
            </div>
            <ItemArt id="madal" />
          </div>
          <h2><Bi t={S.xylo} /></h2>
          <p><Bi t={S.xyloSub} /></p>
          <span class="age">Ages 2–8</span>
        </button>
      </div>

      <p class="parent-note">
        Grown-ups: there is no exit button for little hands. Hold <b>Grown-ups</b> in the top-left corner for 2 seconds, or
        type <kbd>parent</kbd>, to switch activities, change the language or sound, or pick a level.
      </p>
      <p class="foot">
        {BRAND.appName} · {BRAND.stage} · by {BRAND.publisher}
      </p>
    </section>
  );
}
