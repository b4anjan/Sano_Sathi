import { useEffect } from 'preact/hooks';
import { newSticker } from '../core/rewards';
import { cheer } from '../core/audio';
import { itemById } from '../content/items';
import { S } from '../content/strings';
import { Bi, ItemArt } from './common';

/**
 * "New sticker!" card. It slides in at the corner without stopping the game and leaves by
 * itself (or on tap).
 */
export function StickerToast() {
  const id = newSticker.value;

  useEffect(() => {
    if (!id) return;
    cheer();
    // No speech here on purpose: it would cut off whatever the game is saying.
    const close = window.setTimeout(() => (newSticker.value = null), 4200);
    return () => window.clearTimeout(close);
  }, [id]);

  if (!id) return null;
  const it = itemById(id);
  return (
    <button type="button" class="sticker-toast" onClick={() => (newSticker.value = null)} aria-live="polite">
      <span class="sticker-toast-art">
        <ItemArt id={id} />
      </span>
      <span class="sticker-toast-text">
        <b>
          <Bi t={S.newSticker} />
        </b>
        {it && <Bi t={it} />}
      </span>
    </button>
  );
}
