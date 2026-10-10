import { useEffect } from 'preact/hooks';
import { screen, panelOpen } from './core/nav';
import { ambient, calmActive } from './core/settings';
import { activityById } from './content/activities';
import { Ambient, type AmbientLevel } from './ui/Ambient';
import { FeltDefs } from './ui/common';
import { Rail, openPanel } from './ui/Rail';
import { ParentPanel } from './ui/ParentPanel';
import { StickerToast } from './ui/StickerToast';
import { Home } from './ui/Home';
import { ListenMatch } from './modes/match/ListenMatch';
import { Memory } from './modes/memory/Memory';
import { CountHabre } from './modes/count/CountHabre';
import { Smash } from './modes/smash/Smash';
import { Xylophone } from './modes/xylo/Xylophone';
import { Studio } from './modes/studio/Studio';
import { Letters } from './modes/letters/Letters';
import { Numbers } from './modes/numbers/Numbers';
import { MathQuest } from './modes/math/MathQuest';
import { Shop } from './modes/shop/Shop';
import { Shapes } from './modes/shapes/Shapes';
import { Bubbles } from './modes/bubbles/Bubbles';
import { Paint } from './modes/paint/Paint';
import { Village } from './modes/village/Village';
import { Stickers } from './modes/stickers/Stickers';
import { CopyMe } from './modes/copy/CopyMe';

export function App() {
  // Typing the word "parent" anywhere opens the grown-ups panel.
  useEffect(() => {
    let typed = '';
    const onKey = (e: KeyboardEvent) => {
      if (panelOpen.value || e.key.length !== 1) return;
      typed = (typed + e.key.toLowerCase()).slice(-6);
      if (typed === 'parent') {
        typed = '';
        openPanel();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const s = screen.value;
  // Learning games cap the background at "gentle": a busy backdrop pulls young children's
  // attention off the task. Screens with their own full picture or canvas switch it off.
  const act = activityById(s);
  const base: AmbientLevel = calmActive.value ? 'off' : ambient.value;
  const level: AmbientLevel =
    s === 'studio' || act?.still ? 'off' : (act?.focus || s === 'stickers') && base === 'lively' ? 'gentle' : base;
  return (
    <>
      <FeltDefs />
      <div class="frame">
        <div class="board">
          <Ambient level={level} />
          <Rail />
          <main class="stage">
            {s === 'home' && <Home />}
            {s === 'match' && <ListenMatch />}
            {s === 'memory' && <Memory />}
            {s === 'letters' && <Letters />}
            {s === 'numbers' && <Numbers />}
            {s === 'count' && <CountHabre />}
            {s === 'shapes' && <Shapes />}
            {s === 'smash' && <Smash />}
            {s === 'bubbles' && <Bubbles />}
            {s === 'xylo' && <Xylophone />}
            {s === 'paint' && <Paint />}
            {s === 'village' && <Village />}
            {s === 'copy' && <CopyMe />}
            {s === 'math' && <MathQuest />}
            {s === 'shop' && <Shop />}
            {s === 'stickers' && <Stickers />}
            {s === 'studio' && <Studio />}
          </main>
        </div>
      </div>
      <StickerToast />
      {panelOpen.value && <ParentPanel />}
    </>
  );
}
