import { useEffect, useRef, useState } from 'preact/hooks';
import { panelOpen, screen, type Screen } from '../core/nav';
import {
  lang, volume, voiceOn, calm, matchLevel, countLevel, hindiFallback, ambient, memoryPairs, memoryKind, memoryPeek,
  type Lang, type Level, type Ambient, type Pairs, type MemoryKind,
} from '../core/settings';
import { voiceInfo, clipCount, stopSpeech } from '../core/voice';
import { localKeys } from '../core/recordings';
import { unlockAudio } from '../core/audio';
import { knownCount } from '../core/progress';
import { ITEMS } from '../content/items';
import { BRAND } from '../brand';
import { Seg } from './common';

/** Settings for grown-ups. Opened by the gate; children never see a way in. */
export function ParentPanel() {
  const closeRef = useRef<HTMLButtonElement>(null);
  const [fsMsg, setFsMsg] = useState('');
  const close = () => (panelOpen.value = false);

  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const go = (s: Screen) => {
    unlockAudio();
    stopSpeech();
    screen.value = s;
    close();
  };

  const fullscreen = async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else {
        if (!document.documentElement.requestFullscreen) throw new Error('unsupported');
        await document.documentElement.requestFullscreen({ navigationUI: 'hide' });
        close();
      }
    } catch {
      setFsMsg('Full screen is blocked in this preview. It works when the site is opened on its own or installed.');
    }
  };

  const v = voiceInfo.value;
  const neStatus = v.ne
    ? `Nepali voice found: ${v.ne}.`
    : hindiFallback.value && v.hi
      ? `No Nepali voice here; using the Hindi voice (${v.hi}) as a stand-in.`
      : 'No Nepali computer voice on this device, so Nepali words are shown but not spoken until they are recorded.';
  const ids = ITEMS.map((i) => i.id);

  return (
    <div class="panel" onPointerDown={(e) => e.target === e.currentTarget && close()}>
      <div class="panel-card" role="dialog" aria-modal="true" aria-labelledby="pTitle">
        <div class="p-head">
          <h2 id="pTitle">Grown-ups · अभिभावक</h2>
          <button ref={closeRef} type="button" class="p-btn" onClick={close}>
            Back to play
          </button>
        </div>
        <p class="p-note">Settings are saved in this browser only. Nothing is sent anywhere.</p>

        <fieldset>
          <legend>Activity</legend>
          <Seg<Screen>
            label="Activity"
            value={screen.value}
            onPick={go}
            options={[
              { v: 'home', label: 'Home' },
              { v: 'match', label: 'Listen & Find' },
              { v: 'memory', label: 'Find the Pair' },
              { v: 'count', label: `Count with ${BRAND.mascot.en}` },
              { v: 'smash', label: 'Smash & See' },
              { v: 'xylo', label: 'Xylophone' },
            ]}
          />
        </fieldset>

        <fieldset>
          <legend>Language</legend>
          <Seg<Lang>
            label="Language"
            value={lang.value}
            onPick={(l) => (lang.value = l)}
            options={[
              { v: 'en', label: 'English' },
              { v: 'ne', label: <span lang="ne">नेपाली</span> },
              { v: 'both', label: <span>Both · <span lang="ne">दुवै</span></span> },
            ]}
          />
        </fieldset>

        <div class="p-sep" />
        <div class="row">
          <label for="vol">Volume</label>
          <input
            type="range"
            id="vol"
            min={0}
            max={100}
            step={5}
            value={Math.round(volume.value * 100)}
            onInput={(e) => (volume.value = Number((e.target as HTMLInputElement).value) / 100)}
          />
          <output for="vol">{Math.round(volume.value * 100)}%</output>
        </div>
        <div class="row">
          <label for="voice">Spoken words</label>
          <input id="voice" type="checkbox" checked={voiceOn.value} onChange={(e) => (voiceOn.value = (e.target as HTMLInputElement).checked)} />
        </div>
        <div class="row">
          <label for="hindi">Use the Hindi voice for Nepali until recordings arrive (approximate)</label>
          <input
            id="hindi"
            type="checkbox"
            checked={hindiFallback.value}
            disabled={!v.hi}
            onChange={(e) => (hindiFallback.value = (e.target as HTMLInputElement).checked)}
          />
        </div>
        <p class="p-small">
          {neStatus} Clips built into the app: {clipCount}. Recorded on this device: {localKeys.value.size}.
        </p>
        <div class="row">
          <button type="button" class="p-btn" onClick={() => go('studio')}>
            Record voices
          </button>
          <span class="p-small">Your own voice, word by word, for proper Nepali (and English) in every game.</span>
        </div>
        <fieldset>
          <legend>Background</legend>
          <Seg<Ambient>
            label="Background motion"
            value={ambient.value}
            onPick={(a) => (ambient.value = a)}
            options={[
              { v: 'lively', label: 'Lively' },
              { v: 'gentle', label: 'Gentle' },
              { v: 'off', label: 'Still' },
            ]}
          />
          <p class="p-small">Learning games always use Gentle or less, so the background never competes with the lesson.</p>
        </fieldset>
        <div class="row">
          <label for="calm">Calm motion</label>
          <input id="calm" type="checkbox" checked={calm.value} onChange={(e) => (calm.value = (e.target as HTMLInputElement).checked)} />
        </div>

        <fieldset>
          <legend>Listen &amp; Find level</legend>
          <Seg<Level>
            label="Listen and Find level"
            value={matchLevel.value}
            onPick={(l) => (matchLevel.value = l)}
            options={[
              { v: 1, label: '1 · 2 pictures' },
              { v: 2, label: '2 · 3 pictures' },
              { v: 3, label: '3 · 4 pictures, names hidden' },
            ]}
          />
        </fieldset>
        <fieldset>
          <legend>Find the Pair</legend>
          <div class="p-stack">
            <Seg<Pairs>
              label="Number of pairs"
              value={memoryPairs.value}
              onPick={(p) => (memoryPairs.value = p)}
              options={[
                { v: 2, label: '2 pairs' },
                { v: 3, label: '3 pairs' },
                { v: 4, label: '4 pairs' },
                { v: 6, label: '6 pairs' },
              ]}
            />
            <Seg<MemoryKind>
              label="Card pairs"
              value={memoryKind.value}
              onPick={(k) => (memoryKind.value = k)}
              options={[
                { v: 'same', label: 'Same picture' },
                { v: 'word', label: 'Picture + word' },
                { v: 'bridge', label: <span><span lang="ne">नेपाली</span> + English</span> },
              ]}
            />
            <div class="row">
              <label for="peek">Show cards first</label>
              <input id="peek" type="checkbox" checked={memoryPeek.value} onChange={(e) => (memoryPeek.value = (e.target as HTMLInputElement).checked)} />
            </div>
          </div>
        </fieldset>
        <fieldset>
          <legend>Counting level</legend>
          <Seg<Level>
            label="Counting level"
            value={countLevel.value}
            onPick={(l) => (countLevel.value = l)}
            options={[
              { v: 1, label: '1 · up to 3, with guides' },
              { v: 2, label: '2 · up to 5' },
              { v: 3, label: '3 · up to 10' },
            ]}
          />
        </fieldset>

        <div class="p-sep" />
        <p class="p-small">
          Words known (right first time twice): English {knownCount(ids, 'en')} of {ids.length} · Nepali {knownCount(ids, 'ne')} of {ids.length}
        </p>
        <div class="row">
          <button type="button" class="p-btn ghost" onClick={fullscreen}>
            {document.fullscreenElement ? 'Leave full screen' : 'Enter full screen'}
          </button>
          <span class="p-small">{fsMsg || 'Full screen keeps little hands away from other tabs.'}</span>
        </div>
        <p class="p-small about">
          {BRAND.appName} ({BRAND.appNameNe}) · {BRAND.stage} {BRAND.version} · by {BRAND.publisher}
        </p>
      </div>
    </div>
  );
}
