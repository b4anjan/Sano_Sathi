import { signal } from '@preact/signals';
import { voiceOn, volume, hindiFallback } from './settings';

/**
 * Voice: recorded clips first, computer speech second.
 *
 * Recordings: drop files into src/audio/<lang>/<key>.m4a (or .mp3), for example
 * src/audio/ne/gai.m4a or src/audio/en/_where.m4a. They are picked up at build time,
 * with no code change. When every clip a phrase needs exists, the clips play; otherwise
 * the phrase falls back to the device's text-to-speech voice.
 *
 * Nepali: most phones and computers have no Nepali TTS voice. Rather than read Nepali
 * with an English voice (which would teach wrong pronunciation), the app stays quiet and
 * shows the words, unless a grown-up allows the Hindi voice as a stand-in.
 */
const files = import.meta.glob('../audio/**/*.{m4a,mp3,ogg,wav}', {
  eager: true,
  query: '?url',
  import: 'default',
}) as Record<string, string>;

export const clips: Record<string, string> = {};
for (const [path, url] of Object.entries(files)) {
  const m = path.match(/audio\/(en|ne)\/(.+)\.(m4a|mp3|ogg|wav)$/);
  if (m) clips[`${m[1]}/${m[2]}`] = url;
}
export const clipCount = Object.keys(clips).length;

export type SpeechLang = 'en' | 'ne';
export interface Part {
  text: string;
  lang: SpeechLang;
  /** Clip keys, played in order, e.g. ['ne/gai', 'ne/_where']. */
  clips?: string[];
}

const synth: SpeechSynthesis | null =
  typeof window !== 'undefined' && 'speechSynthesis' in window ? window.speechSynthesis : null;

export const voiceInfo = signal<{ en: string | null; ne: string | null; hi: string | null }>({
  en: null,
  ne: null,
  hi: null,
});

let enV: SpeechSynthesisVoice | null = null;
let neV: SpeechSynthesisVoice | null = null;
let hiV: SpeechSynthesisVoice | null = null;

function pickVoices(): void {
  if (!synth) return;
  let all: SpeechSynthesisVoice[] = [];
  try {
    all = synth.getVoices() || [];
  } catch {
    all = [];
  }
  const byLang = (re: RegExp) => all.filter((v) => re.test(v.lang));
  const en = byLang(/^en([-_]|$)/i);
  const prefer = ['Google US English', 'Samantha', 'Microsoft Aria', 'Microsoft Jenny', 'Microsoft Zira', 'Karen'];
  enV = prefer.map((p) => en.find((v) => v.name.includes(p))).find(Boolean) || en.find((v) => v.localService) || en[0] || null;
  neV = byLang(/^ne([-_]|$)/i)[0] || null;
  hiV = byLang(/^hi([-_]|$)/i)[0] || null;
  voiceInfo.value = { en: enV?.name ?? null, ne: neV?.name ?? null, hi: hiV?.name ?? null };
}
if (synth) {
  pickVoices();
  try {
    synth.addEventListener('voiceschanged', pickVoices);
  } catch {
    synth.onvoiceschanged = pickVoices;
  }
}

let seq = 0;
let current: HTMLAudioElement | null = null;

export function stopSpeech(): void {
  seq++;
  try {
    synth?.cancel();
  } catch {
    /* ignore */
  }
  if (current) {
    current.pause();
    current = null;
  }
}

function playClip(url: string): Promise<void> {
  return new Promise((resolve) => {
    const a = new Audio(url);
    current = a;
    a.volume = Math.min(1, volume.value + 0.2);
    const done = () => resolve();
    a.onended = done;
    a.onerror = done;
    a.play().catch(done);
  });
}

function utter(text: string, v: SpeechSynthesisVoice | null, code: string): Promise<void> {
  return new Promise((resolve) => {
    if (!synth) return resolve();
    let finished = false;
    const fin = () => {
      if (!finished) {
        finished = true;
        resolve();
      }
    };
    try {
      const u = new SpeechSynthesisUtterance(text);
      if (v) {
        u.voice = v;
        u.lang = v.lang;
      } else u.lang = code;
      u.rate = 0.9;
      u.pitch = 1.1;
      u.volume = Math.min(1, volume.value + 0.25);
      u.onend = fin;
      u.onerror = fin;
      synth.speak(u);
      setTimeout(fin, 900 + text.length * 120); // safety net: some engines never fire onend
    } catch {
      fin();
    }
  });
}

/** True when this language can be heard on this device (recordings or a voice). */
export function canSpeak(l: SpeechLang): boolean {
  if (l === 'en') return !!synth;
  return !!neV || (hindiFallback.value && !!hiV);
}

/**
 * Speak a sequence of parts, cancelling anything already playing.
 * Resolves true if anything was audible (so callers can add a chime when nothing was).
 */
export async function say(parts: Part[]): Promise<boolean> {
  stopSpeech();
  const my = seq;
  if (!voiceOn.value || volume.value <= 0) return false;
  let audible = false;
  for (const p of parts) {
    if (my !== seq) return audible;
    const keys = p.clips ?? [];
    if (keys.length && keys.every((k) => clips[k])) {
      for (const k of keys) {
        if (my !== seq) return audible;
        await playClip(clips[k]);
      }
      audible = true;
    } else if (synth) {
      const v = p.lang === 'en' ? enV : neV ?? (hindiFallback.value ? hiV : null);
      if (p.lang === 'ne' && !v) continue;
      await utter(p.text, v, p.lang === 'en' ? 'en-US' : 'ne-NP');
      audible = true;
    }
    await new Promise((r) => setTimeout(r, 140));
  }
  return audible;
}
