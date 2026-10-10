import { signal } from '@preact/signals';
import { voiceOn, volume, hindiFallback, buddy } from './settings';
import { BUDDIES, type VoiceStyle } from '../content/buddies';
import { localUrl } from './recordings';
import { aiClips } from './aiClips';
import { ITEMS } from '../content/items';
import { respellForEnglish } from '../content/pronounce';

/**
 * Voice: recorded clips first, computer speech second.
 *
 * Clips come from two places, checked in this order:
 *   1. Recordings made in the Voice Studio on this device (core/recordings.ts).
 *   2. Files bundled with the app: src/audio/<lang>/<key>.m4a (or .mp3), for example
 *      src/audio/ne/gai.m4a or src/audio/en/_where.m4a, picked up at build time.
 * When every clip a phrase needs exists, the clips play; otherwise the phrase is read by
 * the device's text-to-speech voice; and if there is no voice for that language, whatever
 * clips do exist still play (hearing "गाई" alone beats silence).
 *
 * Nepali: most phones and computers have no Nepali TTS voice. Rather than read Nepali
 * with an English voice (which would teach wrong pronunciation), the app stays quiet and
 * shows the words, unless a grown-up allows the Hindi voice as a stand-in.
 * English: Nepali names are respelled for the English voice (content/pronounce.ts).
 */
const files = import.meta.glob('../audio/{en,ne}/*.{m4a,mp3,ogg,wav}', {
  eager: true,
  query: '?url',
  import: 'default',
}) as Record<string, string>;

const bundled: Record<string, string> = {};
for (const [path, url] of Object.entries(files)) {
  const m = path.match(/audio\/(en|ne)\/(.+)\.(m4a|mp3|ogg|wav)$/);
  if (m) bundled[`${m[1]}/${m[2]}`] = url;
}
/** Clips built into this version of the app. */
export const clipCount = Object.keys(bundled).length;
export const isBundled = (key: string): boolean => key in bundled;

/** Items whose English name is the Nepali name: English reuses the Nepali clip. */
const OWN_NAME = new Set(ITEMS.filter((i) => i.ownName).map((i) => i.id));

/** AI voice clips for the current buddy (see core/aiClips.ts). */
export const aiCount = Object.keys(aiClips).length;
export const isAi = (key: string): boolean => `${buddy.value}/${key}` in aiClips;

/**
 * Where to play a clip from, best first: this device's recording, a human recording built
 * into the app, the current buddy's AI voice; then the same for the Nepali name when the
 * English name is the Nepali word (dhaka topi…).
 */
function findClip(key: string): string | undefined {
  return localUrl(key) ?? bundled[key] ?? aiClips[`${buddy.value}/${key}`];
}
export function clipUrl(key: string): string | undefined {
  const direct = findClip(key);
  if (direct) return direct;
  const m = key.match(/^en\/(.+)$/);
  if (m && OWN_NAME.has(m[1])) return findClip(`ne/${m[1]}`);
  return undefined;
}

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

/** Voices by language and gender, so each buddy can sound like itself. */
type Gendered = { female: SpeechSynthesisVoice | null; male: SpeechSynthesisVoice | null };
let enKid: SpeechSynthesisVoice | null = null;
const byGender: Record<'en' | 'ne' | 'hi', Gendered> = {
  en: { female: null, male: null },
  ne: { female: null, male: null },
  hi: { female: null, male: null },
};
// Voice names don't carry a gender field, so we recognise common ones by name.
const FEMALE = /\b(female|samantha|karen|moira|tessa|victoria|fiona|zira|aria|jenny|hazel|susan|libby|sonia|michelle|emma|ava|allison|kathy|serena|catherine|natasha|clara|hemkala|swara|kalpana|heera|lekha|neerja|veena)\b|google us english/i;
const MALE = /\b(male|alex|daniel|fred|david|mark|guy|ryan|george|christopher|eric|roger|steffan|sagar|aaron|arthur|rishi|tom|oliver|thomas|james|andrew|brian|william|liam|madhur|hemant|prabhat|ravi)\b/i;

function gendered(list: SpeechSynthesisVoice[]): Gendered {
  const female = list.find((v) => FEMALE.test(v.name) && !/\bmale/i.test(v.name.replace(/female/i, ''))) ?? null;
  const male = list.find((v) => MALE.test(v.name) && !/female/i.test(v.name)) ?? null;
  return { female, male };
}

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
  const ne = byLang(/^ne([-_]|$)/i);
  neV = ne.find((v) => /hemkala/i.test(v.name)) || ne[0] || null;
  hiV = byLang(/^hi([-_]|$)/i)[0] || null;
  const enLocalFirst = [...en].sort((a, b) => Number(b.localService) - Number(a.localService));
  byGender.en = gendered(enLocalFirst);
  enKid = en.find((v) => /\bana\b|child|kid|junior/i.test(v.name)) ?? null;
  byGender.ne = gendered(ne);
  byGender.hi = gendered(byLang(/^hi([-_]|$)/i));
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

function playClip(url: string, vol = Math.min(1, volume.value + 0.2)): Promise<void> {
  return new Promise((resolve) => {
    const a = new Audio(url);
    current = a;
    a.volume = vol;
    const done = () => resolve();
    a.onended = done;
    a.onerror = done;
    a.play().catch(done);
  });
}

/** The current buddy's voice for a language, falling back to whatever voice exists. */
function voiceFor(l: 'en' | 'ne'): { v: SpeechSynthesisVoice | null; style: VoiceStyle } {
  const style = BUDDIES[buddy.value].voice;
  if (l === 'en' && style.kid && enKid) return { v: enKid, style: { ...style, pitch: 1.1 } };
  if (l === 'en') return { v: byGender.en[style.gender] ?? enV, style };
  if (neV) return { v: byGender.ne[style.gender] ?? neV, style };
  if (hindiFallback.value && hiV) return { v: byGender.hi[style.gender] ?? hiV, style };
  return { v: null, style };
}

function utter(text: string, v: SpeechSynthesisVoice | null, code: string, style?: VoiceStyle): Promise<void> {
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
      const u = new SpeechSynthesisUtterance(code.startsWith('en') ? respellForEnglish(text) : text);
      if (v) {
        u.voice = v;
        u.lang = v.lang;
      } else u.lang = code;
      // When the device has no voice of the buddy's gender, shift the pitch further so
      // the panda still sounds deeper and the puppy still sounds little.
      const g = style?.gender ?? 'female';
      const sameGender = !!v && (v === enKid || byGender.en[g] === v || byGender.ne[g] === v || byGender.hi[g] === v);
      const pitch = style ? (sameGender ? style.pitch : style.gender === 'male' ? style.pitch - 0.2 : style.pitch) : 1.1;
      u.rate = style?.rate ?? 0.9;
      u.pitch = Math.max(0.1, Math.min(2, pitch));
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
    const urls = (p.clips ?? []).map(clipUrl);
    const { v, style } = voiceFor(p.lang);
    const canTts = !!synth && (p.lang === 'en' || !!v);
    if (urls.length && urls.every(Boolean)) {
      for (const u of urls) {
        if (my !== seq) return audible;
        await playClip(u!);
      }
      audible = true;
    } else if (canTts) {
      await utter(p.text, v, p.lang === 'en' ? 'en-US' : 'ne-NP', style);
      audible = true;
    } else if (urls.some(Boolean)) {
      for (const u of urls) {
        if (!u) continue;
        if (my !== seq) return audible;
        await playClip(u);
      }
      audible = true;
    } else continue;
    await new Promise((r) => setTimeout(r, 140));
  }
  return audible;
}

/** Play one clip at full volume, ignoring the "spoken words" switch (used by the Voice Studio). */
export function playKey(key: string): Promise<boolean> {
  stopSpeech();
  const u = clipUrl(key);
  if (!u) return Promise.resolve(false);
  return playClip(u, 1).then(() => true);
}
