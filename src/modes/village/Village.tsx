import { useEffect, useRef, useState } from 'preact/hooks';
import { lang } from '../../core/settings';
import { unlockAudio, sfx, mallet, PENTA, type Sfx } from '../../core/audio';
import { say, stopSpeech, type Part } from '../../core/voice';
import { award } from '../../core/rewards';
import { art } from '../../content/art';
import { itemById } from '../../content/items';
import { SCENE_WORDS } from '../../content/script';
import { Buddy } from '../../ui/Buddy';

/**
 * My Village (मेरो गाउँ): a Nepali hillside to explore by tapping. Everything answers:
 * animals call and wiggle, the kite loops, water splashes, the fish jumps, and tapping
 * the sun turns day into a starry night (and the moon turns it back).
 * Tapping says the word in the current language(s), from recordings when they exist.
 */

interface Obj {
  id: string;
  art?: string;
  x: number;
  y: number;
  s: number;
  anim: 'wiggle' | 'jump' | 'loop' | 'splash' | 'leap' | 'spin';
  sound: Sfx;
  night?: 'sleep' | 'hide';
}

const OBJS: Obj[] = [
  { id: 'laligurans', art: 'laligurans', x: 470, y: 330, s: 210, anim: 'wiggle', sound: 'sparkle' },
  { id: 'yak', art: 'yak', x: 1380, y: 360, s: 110, anim: 'jump', sound: 'moo', night: 'sleep' },
  { id: 'gai', art: 'gai', x: 960, y: 470, s: 170, anim: 'jump', sound: 'moo', night: 'sleep' },
  { id: 'bakhra', art: 'bakhra', x: 1200, y: 520, s: 140, anim: 'jump', sound: 'baa', night: 'sleep' },
  { id: 'dhunge-dhara', art: 'dhunge-dhara', x: 690, y: 560, s: 160, anim: 'splash', sound: 'splash' },
  { id: 'gagri', art: 'gagri', x: 840, y: 650, s: 100, anim: 'wiggle', sound: 'coin' },
  { id: 'kukhura', art: 'kukhura', x: 380, y: 640, s: 120, anim: 'jump', sound: 'cluck', night: 'sleep' },
  { id: 'kukur', art: 'kukur', x: 540, y: 690, s: 130, anim: 'jump', sound: 'bark', night: 'sleep' },
  { id: 'doko', art: 'doko', x: 70, y: 650, s: 120, anim: 'wiggle', sound: 'thump' },
  { id: 'madal', art: 'madal', x: 250, y: 720, s: 100, anim: 'wiggle', sound: 'thump' },
  { id: 'khet', art: 'khet', x: 1420, y: 610, s: 170, anim: 'wiggle', sound: 'swish' },
];

const STARS: Array<[number, number, number]> = [
  [120, 70, 10], [260, 140, 7], [420, 60, 9], [560, 160, 6], [700, 50, 8], [880, 130, 10], [1010, 60, 7], [1120, 170, 6],
  [1460, 90, 9], [1540, 180, 7], [330, 220, 6], [980, 230, 7], [640, 260, 5], [1240, 260, 6], [80, 250, 6],
];

function partsFor(id: string, l: string): Part[] {
  const it = itemById(id);
  const w = it ? { en: it.en, ne: it.ne } : SCENE_WORDS[id as keyof typeof SCENE_WORDS];
  if (!w) return [];
  const key = it ? id : `w-${id}`;
  const ne: Part = { text: w.ne, lang: 'ne', clips: [`ne/${key}`] };
  const en: Part = { text: w.en, lang: 'en', clips: [`en/${key}`] };
  return l === 'en' ? [en] : l === 'ne' ? [ne] : [ne, en];
}

function star(cx: number, cy: number, r: number): string {
  let d = '';
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const rr = i % 2 ? r * 0.45 : r;
    d += `${i ? 'L' : 'M'}${(cx + rr * Math.cos(a)).toFixed(1)} ${(cy + rr * Math.sin(a)).toFixed(1)}`;
  }
  return d + 'Z';
}

export function Village() {
  const [night, setNight] = useState(false);
  const [tapped, setTapped] = useState<Record<string, number>>({});
  const [petals, setPetals] = useState(0);
  const wrapRef = useRef<HTMLDivElement>(null);
  const taps = useRef(0);
  const l = lang.value;

  useEffect(() => {
    const w = wrapRef.current;
    if (w) w.scrollLeft = (w.scrollWidth - w.clientWidth) / 2;
    return () => stopSpeech();
  }, []);

  const hit = (id: string, sound: Sfx, speak = true) => {
    unlockAudio();
    sfx(sound);
    setTapped((t) => ({ ...t, [id]: (t[id] ?? 0) + 1 }));
    window.setTimeout(() => setTapped((t) => ({ ...t, [id]: 0 })), 1000);
    if (speak) void say(partsFor(id, lang.value));
    taps.current++;
    if (taps.current % 15 === 0) award(1);
  };

  const flip = () => {
    unlockAudio();
    sfx(night ? 'chime' : 'sparkle');
    setNight((n) => !n);
    const t = night ? { en: 'Good morning!', ne: 'शुभ प्रभात!' } : { en: 'Good night!', ne: 'शुभ रात्रि!' };
    const ne: Part = { text: t.ne, lang: 'ne', clips: [night ? 'ne/_morning' : 'ne/_night'] };
    const en: Part = { text: t.en, lang: 'en', clips: [night ? 'en/_morning' : 'en/_night'] };
    void say(l === 'en' ? [en] : l === 'ne' ? [ne] : [ne, en]);
  };

  const cls = (id: string, anim: string) => `vg-obj${tapped[id] ? ` t-${anim}` : ''}`;
  const place = (o: Obj) => (
    <g
      key={o.id}
      class={`${cls(o.id, o.anim)}${night && o.night === 'sleep' ? ' asleep' : ''}`}
      onClick={() => {
        hit(o.id, o.sound);
        if (o.id === 'laligurans') setPetals((p) => p + 1);
      }}
      role="button"
      aria-label={itemById(o.id)?.en ?? o.id}
    >
      <svg x={o.x} y={o.y} width={o.s} height={o.s} viewBox="0 0 120 120" dangerouslySetInnerHTML={{ __html: art(o.art ?? o.id) }} />
      {night && o.night === 'sleep' && (
        <text x={o.x + o.s * 0.75} y={o.y + 10} class="vg-zzz">
          z z
        </text>
      )}
    </g>
  );

  return (
    <section class={`screen village${night ? ' night' : ''}`} aria-label="My Village">
      <div class="vg-wrap" ref={wrapRef}>
        <svg class="vg-scene" viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice">
          <defs>
            <linearGradient id="vgSky" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stop-color={night ? '#0E1A3A' : '#7CC6EE'} />
              <stop offset="1" stop-color={night ? '#2B3D6B' : '#CFEFFC'} />
            </linearGradient>
          </defs>
          <rect width="1600" height="900" fill="url(#vgSky)" />

          {night &&
            STARS.map(([x, y, r], i) => (
              <path
                key={i}
                d={star(x, y, r * 1.6)}
                class={`vg-star${tapped[`star${i}`] ? ' t-spin' : ''}`}
                style={{ animationDelay: `${(i * 0.37) % 3}s` }}
                onClick={() => {
                  hit(`star${i}`, 'sparkle', false);
                  mallet(PENTA[i % PENTA.length] * 2, 0.25, 1.2);
                  if (i % 4 === 0) void say(partsFor('star', lang.value));
                }}
              />
            ))}

          {/* Sun or moon: tap to change day and night */}
          <g class={`vg-obj vg-sky-body${tapped.sky ? ' t-spin' : ''}`} onClick={flip} role="button" aria-label={night ? 'Moon: make it day' : 'Sun: make it night'}>
            <svg x="1290" y="40" width="190" height="190" viewBox="0 0 120 120" dangerouslySetInnerHTML={{ __html: art(night ? 'jun' : 'gham') }} />
          </g>

          {!night &&
            [
              [180, 110, 1],
              [820, 70, 1.3],
              [1120, 160, 0.9],
            ].map(([x, y, k], i) => (
              <g key={i} class={`vg-cloud c${i}${tapped[`cloud${i}`] ? ' t-puff' : ''}`} onClick={() => {
                  hit(`cloud${i}`, 'swish', false);
                  void say(partsFor('cloud', lang.value));
                }}
              >
                <g transform={`translate(${x} ${y}) scale(${k})`}>
                  <ellipse cx="60" cy="40" rx="60" ry="26" fill="#fff" />
                  <ellipse cx="35" cy="30" rx="32" ry="24" fill="#fff" />
                  <ellipse cx="85" cy="24" rx="38" ry="28" fill="#fff" />
                  <ellipse cx="60" cy="40" rx="60" ry="26" fill="url(#feltPat)" opacity=".3" />
                </g>
              </g>
            ))}

          {/* Kite on a string */}
          <g class={`vg-kite${tapped.changa ? ' t-loop' : ''}`} onClick={() => hit('changa', 'whee')} role="button" aria-label="Kite">
            <path d="M800 230 Q760 420 700 560" fill="none" stroke="#fff" stroke-width="2" opacity=".8" />
            <svg x="740" y="110" width="120" height="120" viewBox="0 0 120 120" dangerouslySetInnerHTML={{ __html: art('changa') }} />
          </g>

          {/* Himalaya */}
          <g class={`vg-obj vg-himal${tapped.himal ? ' t-wiggle' : ''}`} onClick={() => hit('himal', 'chime')}>
            <path d="M0 440 L150 270 L240 330 L420 170 L560 320 L700 220 L860 350 L1010 190 L1160 330 L1300 240 L1450 340 L1600 260 L1600 470 L0 470Z" fill={night ? '#3D4E73' : '#8FA7C0'} />
            <path d="M420 170 L470 230 L445 222 L425 240 L400 225 L380 214Z M1010 190 L1062 252 L1035 244 L1012 262 L990 246 L966 238Z M700 220 L736 262 L716 258 L700 270 L684 260 L668 254Z M150 270 L185 310 L162 306 L148 318 L132 308 L118 306Z M1300 240 L1336 282 L1316 276 L1300 290 L1284 280 L1266 276Z" fill="#fff" opacity={night ? 0.7 : 1} />
          </g>

          {/* Hills and ground */}
          <path d="M0 470 Q300 380 620 450 Q900 510 1200 420 Q1420 360 1600 430 L1600 900 L0 900Z" fill={night ? '#2E5A35' : '#7BBF5A'} />
          <path d="M1240 470 Q1420 420 1600 470 M1200 520 Q1400 470 1600 520 M1180 570 Q1390 520 1600 570" stroke={night ? '#24482A' : '#5E9E42'} stroke-width="10" fill="none" />
          <path d="M0 600 Q400 540 800 610 Q1200 680 1600 600 L1600 900 L0 900Z" fill={night ? '#285030' : '#6FAE4B'} />

          {/* House */}
          <g class={`vg-obj${tapped.house ? ' t-wiggle' : ''}`} onClick={() => hit('house', 'thump')} role="button" aria-label="House">
            <path d="M60 420 L190 330 L320 420Z" fill="#8A5A33" />
            <path d="M60 420 L190 330 L320 420" fill="none" stroke="#5E3B1F" stroke-width="6" />
            <rect x="80" y="418" width="220" height="70" fill="#F3E9D2" />
            <rect x="80" y="486" width="220" height="110" fill="#B5532B" />
            <rect x="80" y="486" width="220" height="110" fill="url(#feltPat)" opacity=".35" />
            {[110, 230].map((x) => (
              <g key={x}>
                <rect x={x} y="430" width="40" height="44" rx="3" fill={night ? '#F6D365' : '#5E3B1F'} />
                <path d={`M${x} 452 H${x + 40} M${x + 20} 430 V474`} stroke="#3B2A22" stroke-width="3" />
              </g>
            ))}
            <rect x="170" y="516" width="44" height="80" rx="4" fill="#5E3B1F" />
            <rect x="110" y="520" width="34" height="34" rx="3" fill={night ? '#F6D365' : '#3B2A22'} />
            <rect x="240" y="520" width="34" height="34" rx="3" fill={night ? '#F6D365' : '#3B2A22'} />
          </g>
          {/* Cat on the roof */}
          <g class={`vg-obj${tapped.biralo ? ' t-jump' : ''}${night ? ' asleep' : ''}`} onClick={() => hit('biralo', 'meow')} role="button" aria-label="Cat">
            <svg x="210" y="302" width="80" height="80" viewBox="0 0 120 120" dangerouslySetInnerHTML={{ __html: art('biralo') }} />
          </g>

          {/* Pond with a fish */}
          <g class={`vg-obj${tapped.pond ? ' t-wiggle' : ''}`} onClick={() => hit('pond', 'splash')} role="button" aria-label="Pond">
            <ellipse cx="1150" cy="790" rx="190" ry="60" fill={night ? '#2B5A86' : '#7FC8EE'} />
            <ellipse cx="1150" cy="790" rx="190" ry="60" fill="none" stroke={night ? '#1d3c5c' : '#5BB8EC'} stroke-width="8" />
          </g>
          <g class={`vg-fish${tapped.machha ? ' t-leap' : ''}`} onClick={() => hit('machha', 'splash')} role="button" aria-label="Fish">
            <svg x="1090" y="730" width="110" height="110" viewBox="0 0 120 120" dangerouslySetInnerHTML={{ __html: art('machha') }} />
          </g>

          {OBJS.map(place)}

          {petals > 0 &&
            Array.from({ length: 10 }, (_, i) => (
              <ellipse key={`${petals}-${i}`} class="vg-petal" cx={500 + ((i * 37) % 150)} cy={360 + ((i * 23) % 60)} rx="7" ry="5" fill="#D7263D" style={{ animationDelay: `${i * 0.08}s`, '--dx': `${((i * 53) % 90) - 45}px` }} />
            ))}
        </svg>
      </div>
      <div class="vg-buddy">
        <Buddy class="habre-small" />
      </div>
    </section>
  );
}
