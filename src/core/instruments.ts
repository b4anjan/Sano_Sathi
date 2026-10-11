import { audioOut } from './audio';

/**
 * Little synthesized instruments for "tap anywhere" music. No sound files: each note is
 * built when it is played, so it costs no download.
 *
 *   struck   bells, marimba, kalimba, music box, vibraphone, celesta, xylophone,
 *            steel drum, piano: a few sine partials, each with its own fade
 *   plucked  harp, guitar, ukulele, sitar: a real plucked-string model (Karplus–Strong),
 *            computed once per note into a small buffer and reused
 *   blown    flute, pan flute, harmonium: soft oscillators with breath and vibrato
 */
export type Instrument =
  | 'bells' | 'marimba' | 'kalimba' | 'musicbox' | 'vibraphone' | 'celesta' | 'xylophone' | 'steeldrum' | 'piano' | 'santoor'
  | 'harp' | 'guitar' | 'ukulele' | 'sitar'
  | 'flute' | 'panflute' | 'harmonium';

/** Display names for the grown-ups panel. */
export const INSTRUMENT_NAMES: Record<Instrument, string> = {
  bells: 'bells', marimba: 'marimba', kalimba: 'kalimba', musicbox: 'music box', vibraphone: 'vibraphone',
  celesta: 'celesta', xylophone: 'xylophone', steeldrum: 'steel drum', piano: 'piano', santoor: 'santoor', harp: 'harp',
  guitar: 'guitar', ukulele: 'ukulele', sitar: 'sitar', flute: 'flute', panflute: 'pan flute', harmonium: 'harmonium',
};

type Overtone = [ratio: number, amp: number, decay: number];
interface Struck {
  kind: 'struck';
  oct: number;
  partials: Overtone[];
  /** Amplitude tremolo [rate Hz, depth 0..1] (vibraphone). */
  trem?: [number, number];
  /** Pitch starts this much sharp and settles (steel drum). */
  bend?: number;
  /** Second copy slightly detuned, in cents (piano warmth). */
  detune?: number;
}
interface Plucked {
  kind: 'plucked';
  oct: number;
  /** Energy kept per pass round the string (0.99–0.999): higher rings longer. */
  keep: number;
  /** 0..1: how bright the pluck is. */
  bright: number;
  dur: number;
  /** Sitar-style buzz amount. */
  buzz?: number;
}
interface Blown {
  kind: 'blown';
  oct: number;
  wave: OscillatorType;
  dur: number;
  breath: number;
  vib: [number, number];
  lp: number;
  /** Extra detuned reed (cents) for harmonium. */
  reed?: number;
}
type Recipe = Struck | Plucked | Blown;

const R: Record<Instrument, Recipe> = {
  bells: { kind: 'struck', oct: 2, partials: [[1, 1, 2.2], [2.76, 0.45, 1.3], [5.4, 0.22, 0.6], [8.93, 0.1, 0.3]] },
  marimba: { kind: 'struck', oct: 1, partials: [[1, 1, 0.8], [4, 0.28, 0.12], [9.9, 0.06, 0.04]] },
  kalimba: { kind: 'struck', oct: 1, partials: [[1, 1, 1.3], [2, 0.12, 0.4], [5.95, 0.3, 0.07]] },
  musicbox: { kind: 'struck', oct: 2, partials: [[1, 1, 1.1], [2, 0.35, 0.5], [3, 0.18, 0.25], [4.2, 0.12, 0.1]] },
  vibraphone: { kind: 'struck', oct: 1, partials: [[1, 1, 2.2], [4, 0.2, 0.35]], trem: [5.5, 0.35] },
  celesta: { kind: 'struck', oct: 2, partials: [[1, 1, 1.0], [3, 0.16, 0.3], [4, 0.12, 0.18]] },
  xylophone: { kind: 'struck', oct: 2, partials: [[1, 1, 0.55], [3, 0.45, 0.15], [6.2, 0.15, 0.05]] },
  steeldrum: { kind: 'struck', oct: 1, partials: [[1, 1, 1.0], [2, 0.65, 0.6], [3, 0.3, 0.35], [4.02, 0.14, 0.2]], bend: 1.03 },
  // Hammered dulcimer: bright, several strings per note (the slight detune shimmers).
  santoor: { kind: 'struck', oct: 1, partials: [[1, 1, 1.6], [2, 0.55, 0.9], [3, 0.3, 0.45], [5.1, 0.1, 0.12]], detune: 9 },
  piano: { kind: 'struck', oct: 1, partials: [[1, 1, 1.5], [2, 0.45, 0.9], [3, 0.22, 0.55], [4, 0.12, 0.35], [5, 0.06, 0.25]], detune: 6 },
  harp: { kind: 'plucked', oct: 1, keep: 0.997, bright: 0.65, dur: 1.8 },
  guitar: { kind: 'plucked', oct: 0.5, keep: 0.996, bright: 0.45, dur: 1.8 },
  ukulele: { kind: 'plucked', oct: 1, keep: 0.992, bright: 0.6, dur: 1.1 },
  sitar: { kind: 'plucked', oct: 0.5, keep: 0.997, bright: 0.9, dur: 2.0, buzz: 0.35 },
  flute: { kind: 'blown', oct: 2, wave: 'sine', dur: 0.75, breath: 0.12, vib: [5, 4], lp: 3200 },
  panflute: { kind: 'blown', oct: 1, wave: 'triangle', dur: 0.8, breath: 0.25, vib: [4.5, 3], lp: 2400 },
  harmonium: { kind: 'blown', oct: 1, wave: 'sawtooth', dur: 0.75, breath: 0, vib: [0, 0], lp: 1500, reed: 9 },
};

/* ------------- voice limiting: toddlers tap fast; keep it musical, never a wall of sound ------------- */
let lastAt = -1;
let lastCtx: BaseAudioContext | null = null;
const live: number[] = [];
const MAX_VOICES = 6;
function admit(a: AudioContext, len: number): boolean {
  if (a !== lastCtx) {
    // A new context starts its clock at zero (the very first tap creates it).
    lastCtx = a;
    lastAt = -1;
    live.length = 0;
  }
  const now = a.currentTime;
  if (now - lastAt < 0.06) return false;
  while (live.length && live[0] <= now) live.shift();
  if (live.length >= MAX_VOICES) return false;
  lastAt = now;
  live.push(now + len);
  live.sort((x, y) => x - y);
  return true;
}

/* ------------------------------------- struck ------------------------------------- */
function struck(a: AudioContext, out: AudioNode, f: number, r: Struck, gain: number) {
  const t = a.currentTime;
  const len = Math.max(...r.partials.map((p) => p[2]));
  const bus = a.createGain();
  bus.gain.value = gain;
  let end: AudioNode = bus;
  if (r.trem) {
    const amp = a.createGain();
    amp.gain.value = 1 - r.trem[1];
    const lfo = a.createOscillator();
    const depth = a.createGain();
    lfo.frequency.value = r.trem[0];
    depth.gain.value = r.trem[1];
    lfo.connect(depth);
    depth.connect(amp.gain);
    bus.connect(amp);
    lfo.start(t);
    lfo.stop(t + len + 0.1);
    end = amp;
  }
  end.connect(out);
  const copies = r.detune ? [-r.detune / 2, r.detune / 2] : [0];
  for (const cents of copies) {
    for (const [ratio, amp, decay] of r.partials) {
      const o = a.createOscillator();
      o.type = 'sine';
      const fr = f * ratio;
      if (r.bend) {
        o.frequency.setValueAtTime(fr * r.bend, t);
        o.frequency.exponentialRampToValueAtTime(fr, t + 0.04);
      } else o.frequency.setValueAtTime(fr, t);
      o.detune.value = cents;
      const g = a.createGain();
      const peak = (amp / copies.length) * (fr > 4000 ? 0.4 : 1);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(peak, t + 0.004);
      g.gain.exponentialRampToValueAtTime(0.0001, t + decay);
      o.connect(g);
      g.connect(bus);
      o.start(t);
      o.stop(t + decay + 0.05);
    }
  }
  return len;
}

/* ------------------------------------- plucked ------------------------------------- */
const pluckCache = new Map<string, { buf: AudioBuffer; rate: number }>();
function pluckBuffer(a: AudioContext, f: number, r: Plucked): { buf: AudioBuffer; rate: number } {
  const key = `${a.sampleRate}:${f.toFixed(2)}:${r.keep}:${r.bright}:${r.buzz ?? 0}`;
  const hit = pluckCache.get(key);
  if (hit) return hit;
  const sr = a.sampleRate;
  // Each pass averages a sample with the one after it, so the loop is n − ½ samples long;
  // playbackRate trims what rounding leaves, so every note is exactly in tune.
  const n = Math.max(2, Math.round(sr / f + 0.5));
  const rate = f / (sr / (n - 0.5));
  const len = Math.round(sr * r.dur);
  const buf = a.createBuffer(1, len, sr);
  const d = buf.getChannelData(0);
  const ring = new Float32Array(n);
  // The pluck: a burst of noise, softened for darker instruments.
  let lp = 0;
  let mean = 0;
  for (let i = 0; i < n; i++) {
    lp += r.bright * (Math.random() * 2 - 1 - lp);
    ring[i] = lp;
    mean += lp;
  }
  mean /= n;
  for (let i = 0; i < n; i++) ring[i] -= mean;
  let amp0 = 0;
  for (let i = 0; i < n; i++) amp0 = Math.max(amp0, Math.abs(ring[i]));
  const thresh = amp0 * 0.25;
  let idx = 0;
  let peak = 0;
  for (let i = 0; i < len; i++) {
    const cur = ring[idx];
    const nxt = ring[(idx + 1) % n];
    let v = r.keep * 0.5 * (cur + nxt);
    // Sitar "jawari": the string brushes the curved bridge on one side, which flattens that
    // side of the wave and adds the bright buzz.
    if (r.buzz && v < -thresh) v = -thresh + (v + thresh) * (1 - r.buzz);
    ring[idx] = v;
    d[i] = cur;
    if (Math.abs(cur) > peak) peak = Math.abs(cur);
    idx = (idx + 1) % n;
  }
  // Remove any slow drift (the sitar buzz is lopsided), then normalise.
  let px = 0;
  let py = 0;
  peak = 0;
  for (let i = 0; i < len; i++) {
    const y = d[i] - px + 0.995 * py;
    px = d[i];
    py = y;
    d[i] = y;
    if (Math.abs(y) > peak) peak = Math.abs(y);
  }
  if (peak > 0) for (let i = 0; i < len; i++) d[i] /= peak;
  // A short fade at the end so the tail never clicks.
  const fade = Math.min(len, Math.round(sr * 0.05));
  for (let i = 0; i < fade; i++) d[len - 1 - i] *= i / fade;
  if (pluckCache.size > 40) pluckCache.delete(pluckCache.keys().next().value as string);
  const out = { buf, rate };
  pluckCache.set(key, out);
  return out;
}
function plucked(a: AudioContext, out: AudioNode, f: number, r: Plucked, gain: number) {
  const t = a.currentTime;
  const src = a.createBufferSource();
  const { buf, rate } = pluckBuffer(a, f, r);
  src.buffer = buf;
  src.playbackRate.value = rate;
  const g = a.createGain();
  g.gain.value = gain * 0.9;
  // A gentle body resonance so it sounds like a wooden instrument, not a wire.
  const body = a.createBiquadFilter();
  body.type = 'peaking';
  body.frequency.value = r.oct < 1 ? 220 : 400;
  body.Q.value = 1;
  body.gain.value = 4;
  src.connect(body);
  body.connect(g);
  g.connect(out);
  src.start(t);
  return r.dur;
}

/* ------------------------------------- blown ------------------------------------- */
let noiseBuf: AudioBuffer | null = null;
function noise(a: AudioContext): AudioBuffer {
  if (!noiseBuf || noiseBuf.sampleRate !== a.sampleRate) {
    noiseBuf = a.createBuffer(1, a.sampleRate, a.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  return noiseBuf;
}
function blown(a: AudioContext, out: AudioNode, f: number, r: Blown, gain: number) {
  const t = a.currentTime;
  const dur = r.dur;
  const env = a.createGain();
  env.gain.setValueAtTime(0.0001, t);
  env.gain.exponentialRampToValueAtTime(gain, t + 0.06);
  env.gain.setValueAtTime(gain, t + dur * 0.45);
  env.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  const lp = a.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.value = r.lp;
  lp.connect(env);
  env.connect(out);
  const voices = r.reed ? [-r.reed, r.reed] : [0];
  for (const c of voices) {
    const o = a.createOscillator();
    o.type = r.wave;
    o.frequency.value = f;
    o.detune.value = c;
    if (r.vib[0]) {
      const lfo = a.createOscillator();
      const dep = a.createGain();
      lfo.frequency.value = r.vib[0];
      dep.gain.setValueAtTime(0, t);
      dep.gain.linearRampToValueAtTime(r.vib[1], t + 0.25);
      lfo.connect(dep);
      dep.connect(o.frequency);
      lfo.start(t);
      lfo.stop(t + dur + 0.05);
    }
    const g = a.createGain();
    g.gain.value = (r.wave === 'sawtooth' ? 1.0 : 0.62) / voices.length;
    o.connect(g);
    g.connect(lp);
    o.start(t);
    o.stop(t + dur + 0.05);
  }
  if (r.breath) {
    const s = a.createBufferSource();
    s.buffer = noise(a);
    s.loop = true;
    const bp = a.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = f * 2;
    bp.Q.value = 1.5;
    const ng = a.createGain();
    ng.gain.setValueAtTime(0.0001, t);
    ng.gain.exponentialRampToValueAtTime(r.breath * gain * 2.5, t + 0.03);
    ng.gain.exponentialRampToValueAtTime(0.0001, t + 0.35);
    s.connect(bp);
    bp.connect(ng);
    ng.connect(out);
    s.start(t, Math.random() * 0.5);
    s.stop(t + 0.4);
  }
  return dur;
}

/**
 * Play one note. `freq` is the base pitch (the instrument moves it to its own octave);
 * `gain` is the loudness before the master volume.
 */
export function playInstrument(name: Instrument, freq: number, gain = 0.2): boolean {
  const io = audioOut();
  if (!io) return false;
  const { a, out } = io;
  const r = R[name];
  const f = freq * r.oct;
  const len = r.kind === 'struck' ? Math.max(...r.partials.map((p) => p[2])) : r.dur;
  if (!admit(a, len)) return false;
  try {
    if (r.kind === 'struck') struck(a, out, f, r, gain);
    else if (r.kind === 'plucked') plucked(a, out, f, r, gain);
    else blown(a, out, f, r, gain);
    return true;
  } catch {
    return false;
  }
}

/** For tests: every instrument has a recipe. */
export const INSTRUMENTS = Object.keys(R) as Instrument[];
