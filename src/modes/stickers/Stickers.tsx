import { useEffect, useState } from 'preact/hooks';
import { lang } from '../../core/settings';
import { unlockAudio, sfx, bloop } from '../../core/audio';
import { say, stopSpeech, type Part } from '../../core/voice';
import { stickers, totalStars, starsToNext, STARS_PER_STICKER } from '../../core/rewards';
import { ITEMS, CATEGORIES } from '../../content/items';
import { S } from '../../content/strings';
import { SpeakerIcon } from '../letters/Letters';
import { Bi, ItemArt } from '../../ui/common';
import { Buddy } from '../../ui/Buddy';

/**
 * Sticker book: every word in the app is a sticker to collect. Stars from any game add up;
 * every five stars unlock a new sticker. Collected stickers say their name when tapped;
 * the rest wait as felt silhouettes.
 */
export function Stickers() {
  const owned = new Set(stickers.value);
  const [pop, setPop] = useState<string | null>(null);
  useEffect(() => () => stopSpeech(), []);

  const tap = (id: string) => {
    unlockAudio();
    if (!owned.has(id)) {
      bloop(330, 260, 0.12);
      return;
    }
    sfx('pop');
    setPop(id);
    window.setTimeout(() => setPop(null), 600);
    const it = ITEMS.find((i) => i.id === id)!;
    const l = lang.value;
    const ne: Part = { text: it.ne, lang: 'ne', clips: [`ne/${id}`] };
    const en: Part = { text: it.en, lang: 'en', clips: [`en/${id}`] };
    void say(l === 'en' ? [en] : l === 'ne' ? [ne] : [ne, en]);
  };

  const left = starsToNext();
  const have = totalStars.value % STARS_PER_STICKER;
  return (
    <section class="screen stickers" aria-label="Sticker book">
      <div class="sk-head">
        <Buddy class="habre-small" />
        <div class="bubble left">
          <Bi t={{ en: `${owned.size} of ${ITEMS.length} stickers`, ne: `${ITEMS.length} मध्ये ${owned.size} स्टिकर` }} />
          <span class="sk-next">
            {Array.from({ length: STARS_PER_STICKER }, (_, i) => (
              <i key={i} class={i < have ? 'on' : ''}>★</i>
            ))}
            <small>
              <Bi t={{ en: `${left} more ★ for the next one`, ne: `अर्कोका लागि अझै ${left} ★` }} />
            </small>
          </span>
        </div>
      </div>
      <button
        type="button"
        class="sk-how"
        onClick={() => {
          unlockAudio();
          const l = lang.value;
          const ne: Part = { text: S.stickerHow.ne, lang: 'ne', clips: ['ne/s-stickerHow'] };
          const en: Part = { text: S.stickerHow.en, lang: 'en', clips: ['en/s-stickerHow'] };
          void say(l === 'en' ? [en] : l === 'ne' ? [ne] : [ne, en]);
        }}
      >
        <SpeakerIcon />
        <Bi t={S.stickerHow} />
      </button>
      <div class="sk-pages">
        {CATEGORIES.map((c) => (
          <section key={c.id} class="sk-page" style={{ '--tint': c.tint }}>
            <h2>
              <Bi t={c} />
            </h2>
            <div class="sk-grid">
              {ITEMS.filter((i) => i.cat === c.id).map((it, k) => {
                const got = owned.has(it.id);
                return (
                  <button
                    key={it.id}
                    type="button"
                    class={`sk-slot${got ? ' got' : ''}${pop === it.id ? ' pop' : ''}`}
                    style={{ '--r': `${((k * 47) % 13) - 6}deg` }}
                    onClick={() => tap(it.id)}
                    aria-label={got ? `${it.en}, ${it.ne}` : 'Not collected yet'}
                  >
                    <ItemArt id={it.id} />
                    {got ? (
                      <span class="sk-name">
                        <Bi t={it} />
                      </span>
                    ) : (
                      <span class="sk-q" aria-hidden="true">?</span>
                    )}
                  </button>
                );
              })}
            </div>
          </section>
        ))}
      </div>
    </section>
  );
}
