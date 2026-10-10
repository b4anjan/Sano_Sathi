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

/** Habre's giggle: three quick rising chirps. */
export const giggle = (): void => [1318.5, 1568, 1760].forEach((f, i) => mallet(f, 0.16, 0.25, i * 0.07));
