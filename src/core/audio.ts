import { effect } from '@preact/signals';
import { volume } from './settings';

/**
 * Synthesized sound effects (Web Audio). No audio files: every tap sound is generated,
 * so it costs no download and starts instantly. Browsers only allow sound after a tap,
 * so screens call unlockAudio() from their first tap handler.
 */
let ac: AudioContext | null = null;
let master: GainNode | null = null;

export function unlockAudio(): AudioContext | null {
  try {
    if (!ac) {
      const AC = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AC) return null;
      ac = new AC();
      master = ac.createGain();
      master.gain.value = volume.value;
      const comp = ac.createDynamicsCompressor();
      comp.threshold.value = -14;
      comp.ratio.value = 4;
      master.connect(comp);
      comp.connect(ac.destination);
    }
    if (ac.state === 'suspended') void ac.resume();
  } catch {
    return null;
  }
  return ac;
}

/** The live context and master bus, or null when sound is blocked or the volume is zero. */
export function audioOut(): { a: AudioContext; out: GainNode } | null {
  const a = unlockAudio();
  return a && master && volume.value > 0 ? { a, out: master } : null;
}

effect(() => {
  const v = volume.value;
  if (ac && master) master.gain.setTargetAtTime(v, ac.currentTime, 0.02);
});

/** Xylophone-like strike: sine fundamental plus fast-fading 3rd and 6th partials. */
export function mallet(freq: number, gain = 0.45, decay = 1.3, when = 0): void {
  const a = unlockAudio();
  if (!a || !master || volume.value <= 0) return;
  const t = a.currentTime + when;
  const out = a.createGain();
  out.gain.setValueAtTime(0.0001, t);
  out.gain.exponentialRampToValueAtTime(gain, t + 0.004);
  out.gain.exponentialRampToValueAtTime(0.0001, t + decay);
  out.connect(master);
  const parts: Array<[number, OscillatorType, number, number]> = [
    [1, 'sine', 1, decay],
    [3, 'sine', 0.45, 0.2],
    [6.2, 'triangle', 0.18, 0.07],
  ];
  for (const [mult, type, g, dur] of parts) {
    const o = a.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(freq * mult, t);
    const gg = a.createGain();
    gg.gain.setValueAtTime(g, t);
    gg.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(gg);
    gg.connect(out);
    o.start(t);
    o.stop(t + decay + 0.05);
  }
}

/** A soft pitch-glide "bloop", used for gentle not-quite feedback and removals. */
export function bloop(f0: number, f1: number, dur = 0.16, type: OscillatorType = 'sine', gain = 0.3): void {
  const a = unlockAudio();
  if (!a || !master || volume.value <= 0) return;
  const t = a.currentTime;
  const o = a.createOscillator();
  o.type = type;
  o.frequency.setValueAtTime(f0, t);
  o.frequency.exponentialRampToValueAtTime(f1, t + dur);
  const g = a.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(gain, t + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur + 0.12);
  o.connect(g);
  g.connect(master);
  o.start(t);
  o.stop(t + dur + 0.15);
}

/** Major pentatonic: any sequence of these sounds pleasant, so counting "tunes" never clash. */
export const PENTA = [261.63, 293.66, 329.63, 392.0, 440.0, 523.25, 587.33, 659.25, 783.99, 880.0];

export const cheer = (): void => [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => mallet(f, 0.4, 1.1, i * 0.09));
export const chime = (): void => {
  mallet(783.99, 0.25, 0.8);
  mallet(1046.5, 0.22, 0.8, 0.12);
};

/**
 * Copy Me block voice: a round, soft "beep" that lasts as long as the light is on.
 * Sine body plus a quiet octave shimmer, so it carries on phone speakers without being shrill.
 */
export function beep(freq: number, dur = 0.4, gain = 0.32): void {
  tone({ path: [[0, freq]], dur, gain, attack: 0.012 });
  tone({ type: 'triangle', path: [[0, freq * 2]], dur: dur * 0.6, gain: gain * 0.22, attack: 0.012 });
}

/** Habre's giggle: three quick rising chirps. */
export const giggle = (): void => [1318.5, 1568, 1760].forEach((f, i) => mallet(f, 0.16, 0.25, i * 0.07));

/* ---------------- character and scene sounds (all synthesized) ---------------- */

let noiseBuf: AudioBuffer | null = null;
function noiseBuffer(a: AudioContext): AudioBuffer {
  if (!noiseBuf || noiseBuf.sampleRate !== a.sampleRate) {
    const b = a.createBuffer(1, a.sampleRate, a.sampleRate);
    const d = b.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    noiseBuf = b;
  }
  return noiseBuf;
}

function live(): AudioContext | null {
  const a = unlockAudio();
  return a && master && volume.value > 0 ? a : null;
}

interface ToneOpt {
  type?: OscillatorType;
  /** [seconds from start, frequency] points; ramps exponentially between them. */
  path: Array<[number, number]>;
  at?: number;
  dur: number;
  gain?: number;
  attack?: number;
  filter?: [BiquadFilterType, number, number?];
  vibrato?: [number, number]; // [rate Hz, depth Hz]
}

function tone(o: ToneOpt): void {
  const a = live();
  if (!a) return;
  const t = a.currentTime + (o.at ?? 0);
  const osc = a.createOscillator();
  osc.type = o.type ?? 'sine';
  osc.frequency.setValueAtTime(o.path[0][1], t);
  for (const [dt, f] of o.path.slice(1)) osc.frequency.exponentialRampToValueAtTime(f, t + dt);
  if (o.vibrato) {
    const lfo = a.createOscillator();
    const depth = a.createGain();
    lfo.frequency.value = o.vibrato[0];
    depth.gain.value = o.vibrato[1];
    lfo.connect(depth);
    depth.connect(osc.frequency);
    lfo.start(t);
    lfo.stop(t + o.dur + 0.05);
  }
  const g = a.createGain();
  const peak = o.gain ?? 0.25;
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(peak, t + (o.attack ?? 0.02));
  g.gain.setValueAtTime(peak, t + Math.max(o.attack ?? 0.02, o.dur * 0.7));
  g.gain.exponentialRampToValueAtTime(0.0001, t + o.dur);
  let node: AudioNode = osc;
  if (o.filter) {
    const f = a.createBiquadFilter();
    f.type = o.filter[0];
    f.frequency.value = o.filter[1];
    if (o.filter[2]) f.Q.value = o.filter[2];
    osc.connect(f);
    node = f;
  }
  node.connect(g);
  g.connect(master!);
  osc.start(t);
  osc.stop(t + o.dur + 0.05);
}

interface NoiseOpt {
  at?: number;
  dur: number;
  gain?: number;
  filter: [BiquadFilterType, number, number?];
  /** Sweep the filter to this frequency over the sound. */
  sweep?: number;
  /** Amplitude wobble [rate Hz, depth 0..1] (a purr). */
  wobble?: [number, number];
}

function hiss(o: NoiseOpt): void {
  const a = live();
  if (!a) return;
  const t = a.currentTime + (o.at ?? 0);
  const src = a.createBufferSource();
  src.buffer = noiseBuffer(a);
  src.loop = true;
  const f = a.createBiquadFilter();
  f.type = o.filter[0];
  f.frequency.setValueAtTime(o.filter[1], t);
  if (o.sweep) f.frequency.exponentialRampToValueAtTime(o.sweep, t + o.dur);
  if (o.filter[2]) f.Q.value = o.filter[2];
  const g = a.createGain();
  const peak = o.gain ?? 0.2;
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(peak, t + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t + o.dur);
  src.connect(f);
  f.connect(g);
  if (o.wobble) {
    const amp = a.createGain();
    amp.gain.value = 1 - o.wobble[1];
    const lfo = a.createOscillator();
    const depth = a.createGain();
    lfo.frequency.value = o.wobble[0];
    depth.gain.value = o.wobble[1];
    lfo.connect(depth);
    depth.connect(amp.gain);
    g.connect(amp);
    amp.connect(master!);
    lfo.start(t);
    lfo.stop(t + o.dur + 0.05);
  } else g.connect(master!);
  src.start(t, Math.random() * 0.5);
  src.stop(t + o.dur + 0.05);
}

export type Sfx =
  | 'meow' | 'purr' | 'whee' | 'sneeze' | 'bark' | 'wag' | 'roll' | 'hiccup' | 'chime' | 'munch' | 'yawn'
  | 'tumble' | 'giggle' | 'moo' | 'baa' | 'cluck' | 'splash' | 'pop' | 'swish' | 'coin' | 'sparkle' | 'thump'
  | 'tock' | 'clack';

const SFX: Record<Sfx, () => void> = {
  meow: () => tone({ type: 'sawtooth', path: [[0, 520], [0.16, 840], [0.55, 560]], dur: 0.6, gain: 0.16, filter: ['bandpass', 1300, 1.8], vibrato: [6, 12] }),
  purr: () => hiss({ dur: 1.1, gain: 0.35, filter: ['lowpass', 380], wobble: [24, 0.85] }),
  whee: () => tone({ path: [[0, 420], [0.45, 1400], [0.7, 950]], dur: 0.75, gain: 0.2, vibrato: [7, 18] }),
  sneeze: () => {
    tone({ type: 'triangle', path: [[0, 300], [0.45, 470]], dur: 0.5, gain: 0.12 });
    hiss({ at: 0.55, dur: 0.32, gain: 0.45, filter: ['highpass', 1400] });
  },
  bark: () => {
    for (const at of [0, 0.24]) {
      tone({ type: 'sawtooth', path: [[0, 330], [0.12, 190]], at, dur: 0.14, gain: 0.22, filter: ['lowpass', 1300] });
      hiss({ at, dur: 0.07, gain: 0.18, filter: ['bandpass', 900, 1.2] });
    }
  },
  wag: () => [0, 1, 2, 3, 4, 5].forEach((i) => tone({ path: [[0, i % 2 ? 900 : 700]], at: i * 0.07, dur: 0.06, gain: 0.12 })),
  roll: () => {
    for (let i = 0; i < 12; i++) hiss({ at: i * 0.05, dur: 0.05, gain: 0.14, filter: ['bandpass', 320, 2] });
    [523.25, 659.25, 783.99].forEach((f) => mallet(f, 0.3, 0.9, 0.65));
  },
  hiccup: () => [0, 0.45].forEach((at) => tone({ path: [[0, 520], [0.07, 1150]], at, dur: 0.09, gain: 0.22 })),
  chime: () => chime(),
  munch: () => [0, 0.18, 0.36, 0.54].forEach((at) => hiss({ at, dur: 0.05, gain: 0.25, filter: ['bandpass', 1900, 3] })),
  yawn: () => tone({ type: 'triangle', path: [[0, 520], [0.4, 600], [1.1, 240]], dur: 1.15, gain: 0.14, filter: ['lowpass', 1400], vibrato: [5, 10] }),
  tumble: () => {
    tone({ path: [[0, 900], [0.3, 300], [0.6, 1000]], dur: 0.62, gain: 0.18 });
    tone({ path: [[0, 140], [0.15, 50]], at: 0.62, dur: 0.18, gain: 0.35 });
  },
  giggle: () => [1318.5, 1568, 1760, 1568, 1760, 2093].forEach((f, i) => mallet(f, 0.14, 0.22, i * 0.075)),
  moo: () => tone({ type: 'sawtooth', path: [[0, 150], [0.25, 135], [0.95, 105]], dur: 1.0, gain: 0.2, filter: ['lowpass', 650], vibrato: [4, 3] }),
  baa: () => tone({ type: 'sawtooth', path: [[0, 340], [0.7, 300]], dur: 0.75, gain: 0.13, filter: ['bandpass', 1000, 1.5], vibrato: [9, 28] }),
  cluck: () => [0, 0.13, 0.26].forEach((at) => tone({ type: 'square', path: [[0, 950], [0.06, 600]], at, dur: 0.07, gain: 0.08, filter: ['lowpass', 2200] })),
  splash: () => hiss({ dur: 0.6, gain: 0.3, filter: ['lowpass', 3200], sweep: 350 }),
  pop: () => {
    tone({ path: [[0, 900], [0.08, 180]], dur: 0.1, gain: 0.3 });
    hiss({ dur: 0.03, gain: 0.15, filter: ['highpass', 3000] });
  },
  swish: () => hiss({ dur: 0.32, gain: 0.18, filter: ['bandpass', 600, 1.2], sweep: 3200 }),
  coin: () => {
    mallet(1567.98, 0.22, 0.5);
    mallet(2093, 0.2, 0.7, 0.08);
  },
  sparkle: () => [2, 4, 6, 8].forEach((k, i) => mallet(PENTA[k] * 2, 0.12, 0.5, i * 0.06)),
  thump: () => tone({ path: [[0, 160], [0.12, 55]], dur: 0.16, gain: 0.4 }),
  // A wooden chess piece set down, and one knocking another off the board.
  tock: () => {
    tone({ type: 'triangle', path: [[0, 240], [0.05, 160]], dur: 0.09, gain: 0.32, attack: 0.003 });
    hiss({ dur: 0.03, gain: 0.12, filter: ['bandpass', 1900, 2.5] });
  },
  clack: () => {
    tone({ type: 'triangle', path: [[0, 330], [0.05, 190]], dur: 0.08, gain: 0.3, attack: 0.003 });
    hiss({ dur: 0.04, gain: 0.2, filter: ['bandpass', 2600, 1.6] });
    tone({ type: 'triangle', path: [[0, 260], [0.05, 170]], at: 0.07, dur: 0.08, gain: 0.22, attack: 0.003 });
  },
};

export function sfx(name: Sfx): void {
  try {
    SFX[name]();
  } catch {
    /* audio blocked */
  }
}
