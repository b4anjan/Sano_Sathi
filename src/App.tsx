import { useEffect } from 'preact/hooks';
import { screen, panelOpen } from './core/nav';
import { ambient, calmActive } from './core/settings';
import { Ambient, type AmbientLevel } from './ui/Ambient';
import { Smash } from './modes/smash/Smash';
import { Memory } from './modes/memory/Memory';
import { FeltDefs } from './ui/common';
import { Rail, openPanel } from './ui/Rail';
import { ParentPanel } from './ui/ParentPanel';
import { Home } from './ui/Home';
import { ListenMatch } from './modes/match/ListenMatch';
import { CountHabre } from './modes/count/CountHabre';
import { Xylophone } from './modes/xylo/Xylophone';

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
  // attention off the task. Play screens get the full lively board.
  const base: AmbientLevel = calmActive.value ? 'off' : ambient.value;
  const focused = s === 'match' || s === 'count' || s === 'memory';
  const level: AmbientLevel = focused && base === 'lively' ? 'gentle' : base;
  return (
    <>
      <FeltDefs />
      <div class="frame">
        <div class="board">
          <Ambient level={level} tapSound={s === 'home'} />
          <Rail />
          <main class="stage">
            {s === 'home' && <Home />}
            {s === 'match' && <ListenMatch />}
            {s === 'count' && <CountHabre />}
            {s === 'xylo' && <Xylophone />}
            {s === 'smash' && <Smash />}
            {s === 'memory' && <Memory />}
          </main>
        </div>
      </div>
      {panelOpen.value && <ParentPanel />}
    </>
  );
}
