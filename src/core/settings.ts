import { signal, computed, effect } from '@preact/signals';

export type Lang = 'en' | 'ne' | 'both';
export type Level = 1 | 2 | 3;
export type Ambient = 'lively' | 'gentle' | 'off';
export type MemoryKind = 'same' | 'word' | 'bridge';
export type Pairs = 2 | 3 | 4 | 6;

interface Saved {
  lang: Lang;
  volume: number;
  voiceOn: boolean;
  calm: boolean;
  matchLevel: Level;
  countLevel: Level;
  hindiFallback: boolean;
  ambient: Ambient;
  memoryPairs: Pairs;
  memoryKind: MemoryKind;
  memoryPeek: boolean;
}

const KEY = 'sanosathi.settings.v1';
const DEFAULTS: Saved = {
  lang: 'both',
  volume: 0.7,
  voiceOn: true,
  calm: false,
  matchLevel: 1,
  countLevel: 1,
  hindiFallback: false,
  ambient: 'lively',
  memoryPairs: 3,
  memoryKind: 'same',
  memoryPeek: true,
};

function load(): Saved {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return DEFAULTS;
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? { ...DEFAULTS, ...parsed } : DEFAULTS;
  } catch {
    return DEFAULTS; // private mode or blocked storage: run with defaults
  }
}

const saved = load();

export const lang = signal<Lang>(saved.lang);
export const volume = signal(saved.volume);
export const voiceOn = signal(saved.voiceOn);
export const calm = signal(saved.calm);
export const matchLevel = signal<Level>(saved.matchLevel);
export const countLevel = signal<Level>(saved.countLevel);
/** Nepali text-to-speech is missing on most devices. A Hindi voice can stand in, but it is
 *  only an approximation, so it is off unless a grown-up turns it on. Recordings replace it. */
export const hindiFallback = signal(saved.hindiFallback);
/** Background motion. Learning games cap it at "gentle" whatever this says. */
export const ambient = signal<Ambient>(saved.ambient);
export const memoryPairs = signal<Pairs>(saved.memoryPairs);
export const memoryKind = signal<MemoryKind>(saved.memoryKind);
export const memoryPeek = signal(saved.memoryPeek);

const reducedMQ = typeof matchMedia === 'function' ? matchMedia('(prefers-reduced-motion: reduce)') : null;
const prefersReduced = signal(!!reducedMQ?.matches);
reducedMQ?.addEventListener?.('change', (e) => (prefersReduced.value = e.matches));
export const calmActive = computed(() => calm.value || prefersReduced.value);

effect(() => {
  const data: Saved = {
    lang: lang.value,
    volume: volume.value,
    voiceOn: voiceOn.value,
    calm: calm.value,
    matchLevel: matchLevel.value,
    countLevel: countLevel.value,
    hindiFallback: hindiFallback.value,
    ambient: ambient.value,
    memoryPairs: memoryPairs.value,
    memoryKind: memoryKind.value,
    memoryPeek: memoryPeek.value,
  };
  try {
    localStorage.setItem(KEY, JSON.stringify(data));
  } catch {
    /* storage unavailable: settings last for this visit only */
  }
});

effect(() => {
  document.documentElement.classList.toggle('calm', calmActive.value);
  document.documentElement.lang = lang.value === 'ne' ? 'ne' : 'en';
});
