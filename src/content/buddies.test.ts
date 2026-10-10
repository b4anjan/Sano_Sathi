import { describe, it, expect } from 'vitest';
import { BUDDIES, BUDDY_IDS, GREETINGS, greetingKey } from './buddies';
import { ART } from './art';
import { ACTIVITIES } from './activities';
import { SPOKEN_S } from './strings';

describe('buddies', () => {
  it('has three buddies, each with art, a voice and four distinct reactions plus a tickle', () => {
    expect(BUDDY_IDS).toEqual(['cat', 'puppy', 'panda']);
    for (const id of BUDDY_IDS) {
      const b = BUDDIES[id];
      expect(ART[b.art], b.art).toBeTypeOf('function');
      expect(b.reactions.length).toBe(4);
      expect(new Set(b.reactions.map((r) => r.id)).size).toBe(4);
      expect(new Set(b.reactions.map((r) => r.anim)).size).toBe(4);
      for (const r of [...b.reactions, b.tickle]) {
        expect(r.say.ne).toMatch(/[ऀ-ॿ]/);
        expect(r.say.en.length).toBeGreaterThan(3);
      }
      expect(b.hello.ne).toMatch(/[ऀ-ॿ]/);
    }
    expect(BUDDIES.panda.voice.gender).toBe('male');
    expect(BUDDIES.cat.voice.gender).toBe('female');
    expect(BUDDIES.puppy.voice.kid).toBe(true);
  });

  it('greets by time of day', () => {
    expect(greetingKey(7)).toBe('morning');
    expect(greetingKey(13)).toBe('afternoon');
    expect(greetingKey(18)).toBe('evening');
    expect(greetingKey(21)).toBe('late');
    expect(greetingKey(2)).toBe('late');
    for (const g of Object.values(GREETINGS)) expect(g.ne).toMatch(/[ऀ-ॿ]/);
  });
});

describe('activities', () => {
  it('has unique ids, and every activity name is in the recording script', () => {
    const ids = ACTIVITIES.map((a) => a.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) expect((SPOKEN_S as readonly string[]).includes(id), id).toBe(true);
  });
});
