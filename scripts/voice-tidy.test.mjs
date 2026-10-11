import { describe, it, expect } from 'vitest';
import { letterCount, tidySpeech } from './voice-tidy.mjs';

const R = 24000;
/** A test clip: [kind, seconds] pieces, "s" for silence and "t" for a tone. */
function clip(...parts) {
  const out = [];
  for (const [kind, secs] of parts) for (let i = 0; i < Math.round(secs * R); i++) out.push(kind === 't' ? Math.round(9000 * Math.sin((2 * Math.PI * 220 * i) / R)) : 0);
  return Int16Array.from(out);
}
const secs = (pcm) => pcm.length / R;

describe('tidying a clip', () => {
  it('counts letters, not vowel signs or the virama', () => {
    expect(letterCount('ङ')).toBe(1);
    expect(letterCount('क्ष')).toBe(2);
    expect(letterCount('क, कुखुराको क')).toBe(6);
    expect(letterCount('B')).toBe(1);
  });

  it('trims the silence at both ends, keeping a short lead-in and tail', () => {
    const out = tidySpeech(clip(['s', 0.5], ['t', 0.4], ['s', 0.9]), R, 'गाई');
    expect(secs(out)).toBeGreaterThan(0.5);
    expect(secs(out)).toBeLessThan(0.6);
  });

  it('keeps only the letter when a stray sound follows a long silence (the HD ramble)', () => {
    const out = tidySpeech(clip(['t', 0.35], ['s', 2.4], ['t', 0.5], ['s', 0.3], ['t', 0.3]), R, 'ङ');
    expect(secs(out)).toBeLessThan(0.55);
  });

  it('does not mistake a click for the letter', () => {
    const out = tidySpeech(clip(['t', 0.04], ['s', 0.8], ['t', 0.35], ['s', 2], ['t', 0.4]), R, 'ख');
    expect(secs(out)).toBeGreaterThan(0.3);
    expect(secs(out)).toBeLessThan(0.55);
  });

  it('keeps a letter whose sound has a tiny gap inside ("double you")', () => {
    const out = tidySpeech(clip(['t', 0.3], ['s', 0.15], ['t', 0.3]), R, 'W');
    expect(secs(out)).toBeCloseTo(0.75, 2); // all of it
  });

  it('shortens an over-long pause in a chant but keeps every word', () => {
    const out = tidySpeech(clip(['t', 0.35], ['s', 1.5], ['t', 0.7], ['s', 0.2], ['t', 0.3]), R, 'क, कुखुराको क');
    expect(secs(out)).toBeCloseTo(0.35 + 0.35 + 0.7 + 0.2 + 0.3, 1);
  });

  it('leaves natural pauses alone', () => {
    const out = tidySpeech(clip(['t', 0.8], ['s', 0.4], ['t', 0.9]), R, 'राति भयो। चाँडै सुत्ने बेला भयो!');
    expect(secs(out)).toBeCloseTo(2.1, 1);
  });
});
