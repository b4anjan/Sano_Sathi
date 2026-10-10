import { describe, it, expect } from 'vitest';
import { buildSsml, escapeXml, VOICES } from './voice-ssml.mjs';

describe('AI voice SSML', () => {
  it('escapes text so any line is valid XML', () => {
    expect(escapeXml(`Tom & Jerry <3 "hi" 'yo'`)).toBe('Tom &amp; Jerry &lt;3 &quot;hi&quot; &apos;yo&apos;');
  });

  it('uses each buddy\'s voice, Nepali language tag and a slower rate for single words', () => {
    const s = buildSsml({ buddy: 'panda', lang: 'ne', key: 'gai', group: 'words', text: 'गाई' });
    expect(s).toContain('name="ne-NP-SagarNeural"');
    expect(s).toContain('xml:lang="ne-NP"');
    expect(s).toContain('rate="-16%"');
    expect(s).toContain('>गाई</prosody>');
    const c = buildSsml({ buddy: 'cat', lang: 'en', key: '_where', group: 'sentences', text: 'Where is the…' });
    expect(c).toContain('style="cheerful"');
    expect(c).toContain('rate="+0%"');
  });

  it('has an English and a Nepali voice for every buddy', () => {
    for (const b of ['cat', 'puppy', 'panda']) {
      expect(VOICES[b].en.voice).toMatch(/^en-US-/);
      expect(VOICES[b].ne.voice).toMatch(/^ne-NP-/);
    }
  });
});
