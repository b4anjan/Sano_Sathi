/**
 * Pure audio helpers for the Voice Studio. No browser APIs here, so they are unit-tested.
 *
 * After a take is recorded, the studio decodes it to samples and runs:
 *   findSpeech → where the voice starts and stops (drops the tap noise and dead air)
 *   shapeClip  → cut to that range, even out loudness, soften the edges (no clicks)
 *   encodeWav  → 16-bit mono WAV, which every browser can play back
 * The result is used in the games straight away, and is also what gets exported.
 */

export interface SpeechRange {
  /** First and last sample to keep (end is exclusive). */
  start: number;
  end: number;
  /** Loudest sample in the whole take, 0..1. */
  peak: number;
  /** False when the take is just room noise (nothing was said, or the mic was muted). */
  heard: boolean;
}

const FRAME_S = 0.01; // 10 ms analysis frames
const RUN = 3; // frames in a row above the threshold to count as voice (ignores single clicks)
const PAD_START_S = 0.15; // keep soft beginnings: स, ह and breathy onsets are quiet
const PAD_END_S = 0.22; // keep tails: vowels fade out slowly

/** Find the spoken part of a take by comparing 10 ms loudness frames against the room's noise floor. */
export function findSpeech(x: Float32Array, rate: number): SpeechRange {
  const frame = Math.max(1, Math.round(rate * FRAME_S));
  const n = Math.floor(x.length / frame);
  if (n < RUN) return { start: 0, end: x.length, peak: 0, heard: false };

  const rms = new Float32Array(n);
  let peak = 0;
  for (let f = 0; f < n; f++) {
    let sum = 0;
    for (let i = f * frame, e = i + frame; i < e; i++) {
      const v = x[i];
      sum += v * v;
      const a = v < 0 ? -v : v;
      if (a > peak) peak = a;
    }
    rms[f] = Math.sqrt(sum / frame);
  }

  const sorted = Array.from(rms).sort((a, b) => a - b);
  const floor = sorted[Math.floor(n * 0.1)];
  const loud = sorted[n - 1];
  const heard = loud > 0.02 && loud > floor * 4;
  if (!heard) return { start: 0, end: x.length, peak, heard: false };

  const thr = Math.max(0.008, floor * 3, loud * 0.06);
  let first = -1;
  for (let f = 0, run = 0; f < n; f++) {
    run = rms[f] > thr ? run + 1 : 0;
    if (run === RUN) {
      first = f - RUN + 1;
      break;
    }
  }
  let last = -1;
  for (let f = n - 1, run = 0; f >= 0; f--) {
    run = rms[f] > thr ? run + 1 : 0;
    if (run === RUN) {
      last = f + RUN - 1;
      break;
    }
  }
  if (first < 0 || last < first) return { start: 0, end: x.length, peak, heard: false };

  const start = Math.max(0, first * frame - Math.round(PAD_START_S * rate));
  const end = Math.min(x.length, (last + 1) * frame + Math.round(PAD_END_S * rate));
  return { start, end, peak, heard: true };
}

/**
 * Cut to the spoken range, bring the loudest point to about -1 dBFS (gain capped, so a
 * whisper is lifted but room noise is not blown up), and fade 12 ms in and out.
 */
export function shapeClip(x: Float32Array, rate: number, range: SpeechRange, target = 0.89, maxGain = 8): Float32Array {
  const out = x.slice(range.start, range.end);
  let peak = 0;
  for (let i = 0; i < out.length; i++) {
    const a = Math.abs(out[i]);
    if (a > peak) peak = a;
  }
  const gain = peak > 0 ? Math.min(maxGain, target / peak) : 1;
  const fade = Math.min(Math.round(rate * 0.012), Math.floor(out.length / 2));
  for (let i = 0; i < out.length; i++) {
    let g = gain;
    if (i < fade) g *= i / fade;
    else if (i >= out.length - fade) g *= (out.length - 1 - i) / fade;
    out[i] = Math.max(-1, Math.min(1, out[i] * g));
  }
  return out;
}

/** Average all channels into one. */
export function downmix(channels: Float32Array[]): Float32Array {
  if (channels.length === 1) return channels[0].slice();
  const len = channels[0].length;
  const out = new Float32Array(len);
  for (const ch of channels) for (let i = 0; i < len; i++) out[i] += ch[i];
  for (let i = 0; i < len; i++) out[i] /= channels.length;
  return out;
}

/** 16-bit PCM mono WAV. */
export function encodeWav(x: Float32Array, rate: number): ArrayBuffer {
  const buf = new ArrayBuffer(44 + x.length * 2);
  const v = new DataView(buf);
  const str = (o: number, s: string) => {
    for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i));
  };
  str(0, 'RIFF');
  v.setUint32(4, 36 + x.length * 2, true);
  str(8, 'WAVE');
  str(12, 'fmt ');
  v.setUint32(16, 16, true); // fmt chunk size
  v.setUint16(20, 1, true); // PCM
  v.setUint16(22, 1, true); // mono
  v.setUint32(24, rate, true);
  v.setUint32(28, rate * 2, true); // byte rate
  v.setUint16(32, 2, true); // block align
  v.setUint16(34, 16, true); // bits per sample
  str(36, 'data');
  v.setUint32(40, x.length * 2, true);
  for (let i = 0, o = 44; i < x.length; i++, o += 2) {
    const s = Math.max(-1, Math.min(1, x[i]));
    v.setInt16(o, s < 0 ? Math.round(s * 0x8000) : Math.round(s * 0x7fff), true);
  }
  return buf;
}

/** File extension for a recorded MIME type (used in exported zips). */
export function extFor(type: string): string {
  const t = type.toLowerCase();
  if (t.includes('wav')) return 'wav';
  if (t.includes('mp4') || t.includes('aac') || t.includes('m4a')) return 'm4a';
  if (t.includes('ogg')) return 'ogg';
  if (t.includes('mpeg') || t.includes('mp3')) return 'mp3';
  return 'webm';
}

/** MIME type for an audio file extension (used when loading a zip back in). */
export function typeFor(ext: string): string {
  return (
    { wav: 'audio/wav', m4a: 'audio/mp4', mp4: 'audio/mp4', ogg: 'audio/ogg', mp3: 'audio/mpeg', webm: 'audio/webm' } as Record<string, string>
  )[ext.toLowerCase()] ?? 'application/octet-stream';
}
