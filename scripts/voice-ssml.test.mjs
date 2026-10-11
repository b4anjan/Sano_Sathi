import { describe, it, expect } from 'vitest';
import { buildSsml, escapeXml, maxSeconds, VOICES } from './voice-ssml.mjs';

describe('AI voice SSML', () => {
  it('escapes text so any line is valid XML', () => {
    expect(escapeXml(`Tom & Jerry <3 "hi" 'yo'`)).toBe('Tom &amp; Jerry &lt;3 &quot;hi&quot; &apos;yo&apos;');
  });

  it('says a word exactly as the voice is: no pitch or speed change, Nepali language tag', () => {
    const s = buildSsml({ buddy: 'panda', lang: 'ne', key: 'gai', group: 'words', text: 'गाई' });
    expect(s).toContain('name="en-US-Andrew:DragonHDLatestNeural"');
    expect(s).toContain('<lang xml:lang="ne-NP">गाई</lang>');
    expect(s).not.toContain('prosody');
  });

  it('says letter lines 10% slower (the I4 recipe)', () => {
    const s = buildSsml({ buddy: 'panda', lang: 'ne', key: 'letter-क', group: 'letters', text: 'क, कुखुराको क' });
    expect(s).toContain('<lang xml:lang="ne-NP"><prosody rate="-10%" pitch="+0%">क, कुखुराको क</prosody></lang>');
  });

  it('tells the voice which language each line is in', () => {
    const e = buildSsml({ buddy: 'cat', lang: 'en', key: '_where', group: 'sentences', text: 'Where is the…' });
    expect(e).toContain('<lang xml:lang="en-US">Where is the…</lang>');
  });

  it('has a voice for both languages for every buddy; one voice per buddy', () => {
    for (const b of ['cat', 'puppy', 'panda']) {
      expect(VOICES[b].en.voice).toBeTruthy();
      expect(VOICES[b].ne.voice).toBe(VOICES[b].en.voice);
    }
  });

  it('sets the longest a clip may take by letters, so a rambling lone letter is caught', () => {
    expect(maxSeconds('ङ')).toBeLessThan(1.5); // was once 4.3 s
    expect(maxSeconds('क्ष')).toBeLessThan(1.7); // virama adds nothing
    expect(maxSeconds('क, कुखुराको क')).toBeGreaterThan(2.8); // normal: about 2 s
    expect(maxSeconds('राति भयो। चाँडै सुत्ने बेला भयो!')).toBeGreaterThan(4); // normal: 2.7 s
  });
});
