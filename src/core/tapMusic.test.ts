import { describe, expect, it } from 'vitest';
import { SCREEN_INSTRUMENT, noteFor } from './tapMusic';
import { INSTRUMENTS } from './instruments';
import { PENTA } from './audio';
import { ACTIVITIES } from '../content/activities';

describe('tap music', () => {
  it('gives every activity its own instrument', () => {
    const used = ACTIVITIES.map((a) => SCREEN_INSTRUMENT[a.id]);
    expect(used.every((i) => i && INSTRUMENTS.includes(i))).toBe(true);
    const all = Object.values(SCREEN_INSTRUMENT).filter(Boolean);
    expect(new Set(all).size).toBe(all.length);
  });

  it('keeps the recording studio silent', () => {
    expect(SCREEN_INSTRUMENT.studio).toBeNull();
  });

  it('plays higher notes nearer the top of the screen', () => {
    expect(noteFor(0, 800)).toBe(PENTA[PENTA.length - 1]);
    expect(noteFor(799, 800)).toBe(PENTA[0]);
    expect(noteFor(200, 800)).toBeGreaterThan(noteFor(600, 800));
    expect(noteFor(-50, 800)).toBe(PENTA[PENTA.length - 1]);
    expect(noteFor(900, 800)).toBe(PENTA[0]);
  });
});
