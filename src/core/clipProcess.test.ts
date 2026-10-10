import { describe, it, expect } from 'vitest';
import { findSpeech, shapeClip, encodeWav, downmix, extFor, typeFor } from './clipProcess';

const RATE = 24000;

/** Room noise with a "word" (a 220 Hz tone) from `from` to `to` seconds. */
function take(total: number, from: number, to: number, amp = 0.3, noise = 0.003): Float32Array {
  const x = new Float32Array(Math.round(total * RATE));
  let seed = 7;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647) * 2 - 1;
  for (let i = 0; i < x.length; i++) {
    const t = i / RATE;
    x[i] = rnd() * noise + (t >= from && t < to ? amp * Math.sin(2 * Math.PI * 220 * t) : 0);
  }
  return x;
}

describe('findSpeech', () => {
  it('finds the word inside dead air, with padding on both sides', () => {
    const r = findSpeech(take(3, 1.0, 1.8), RATE);
    expect(r.heard).toBe(true);
    expect(r.start / RATE).toBeGreaterThan(0.8);
    expect(r.start / RATE).toBeLessThan(1.0);
    expect(r.end / RATE).toBeGreaterThan(1.8);
    expect(r.end / RATE).toBeLessThan(2.1);
  });

  it('reports nothing heard for room noise alone', () => {
    expect(findSpeech(take(2, 0, 0), RATE).heard).toBe(false);
  });

  it('ignores a single click before the word', () => {
    const x = take(3, 1.2, 1.9);
    for (let i = 2400; i < 2520; i++) x[i] = 0.9; // 5 ms tap at 0.1 s
    const r = findSpeech(x, RATE);
    expect(r.start / RATE).toBeGreaterThan(1.0);
  });

  it('handles a very short buffer', () => {
    expect(findSpeech(new Float32Array(10), RATE).heard).toBe(false);
  });
});

describe('shapeClip', () => {
  it('cuts to the range, levels the peak and fades the edges', () => {
    const x = take(3, 1.0, 1.8, 0.2);
    const r = findSpeech(x, RATE);
    const y = shapeClip(x, RATE, r);
    expect(y.length).toBe(r.end - r.start);
    const peak = y.reduce((m, v) => Math.max(m, Math.abs(v)), 0);
    expect(peak).toBeGreaterThan(0.85);
    expect(peak).toBeLessThanOrEqual(0.9);
    expect(Math.abs(y[0])).toBeLessThan(0.001);
    expect(Math.abs(y[y.length - 1])).toBeLessThan(0.001);
  });

  it('caps the gain so a whisper is not blown up 100x', () => {
    const x = take(2, 0.5, 1.2, 0.01, 0.0005);
    const y = shapeClip(x, RATE, { start: 0, end: x.length, peak: 0.01, heard: true });
    const peak = y.reduce((m, v) => Math.max(m, Math.abs(v)), 0);
    expect(peak).toBeLessThan(0.1);
  });
});

describe('encodeWav', () => {
  it('writes a valid 16-bit mono header and samples', () => {
    const buf = encodeWav(new Float32Array([0, 1, -1, 0.5]), RATE);
    const v = new DataView(buf);
    const tag = (o: number) => String.fromCharCode(v.getUint8(o), v.getUint8(o + 1), v.getUint8(o + 2), v.getUint8(o + 3));
    expect(buf.byteLength).toBe(44 + 8);
    expect(tag(0)).toBe('RIFF');
    expect(tag(8)).toBe('WAVE');
    expect(tag(36)).toBe('data');
    expect(v.getUint16(22, true)).toBe(1);
    expect(v.getUint32(24, true)).toBe(RATE);
    expect(v.getUint16(34, true)).toBe(16);
    expect(v.getInt16(46, true)).toBe(32767);
    expect(v.getInt16(48, true)).toBe(-32768);
  });
});

describe('helpers', () => {
  it('downmixes stereo to the average', () => {
    expect(Array.from(downmix([new Float32Array([1, 0]), new Float32Array([0, 0])]))).toEqual([0.5, 0]);
  });
  it('maps MIME types and extensions both ways', () => {
    expect(extFor('audio/mp4;codecs=mp4a.40.2')).toBe('m4a');
    expect(extFor('audio/webm;codecs=opus')).toBe('webm');
    expect(extFor('audio/wav')).toBe('wav');
    expect(typeFor('m4a')).toBe('audio/mp4');
    expect(typeFor('WAV')).toBe('audio/wav');
  });
});
