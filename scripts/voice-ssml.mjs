/**
 * Voice settings and SSML for the AI voices (Azure AI Speech).
 *
 * Each buddy has an English and a Nepali voice. `rate` and `pitch` are percentages.
 * Single words (and numbers, colours, letters) are said a little slower, the way a parent
 * says a new word to a child.
 */
export const VOICES = {
  cat: {
    en: { voice: 'en-US-JennyNeural', style: 'cheerful', rate: 0, pitch: 2 },
    ne: { voice: 'ne-NP-HemkalaNeural', rate: 0, pitch: 4 },
  },
  puppy: {
    en: { voice: 'en-US-AnaNeural', rate: 0, pitch: 0 },
    ne: { voice: 'ne-NP-HemkalaNeural', rate: 4, pitch: 18 },
  },
  panda: {
    en: { voice: 'en-US-GuyNeural', style: 'friendly', rate: -6, pitch: -4 },
    ne: { voice: 'ne-NP-SagarNeural', rate: -6, pitch: -2 },
  },
};

export const SLOW_GROUPS = new Set(['words', 'numbers', 'colors', 'letters']);
const SLOWER = -10;

/** Change this to regenerate every clip after a voice-settings change. (2: trim + level with ffmpeg) */
export const VOICE_VERSION = 2;

export function escapeXml(s) {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' })[c]);
}

const pct = (n) => `${n >= 0 ? '+' : ''}${n}%`;

/** SSML for one line. Leading and trailing silence are trimmed so clips join up quickly. */
export function buildSsml(job) {
  const v = VOICES[job.buddy]?.[job.lang];
  if (!v) throw new Error(`No voice for ${job.buddy}/${job.lang}`);
  const rate = v.rate + (SLOW_GROUPS.has(job.group) ? SLOWER : 0);
  const xmlLang = job.lang === 'ne' ? 'ne-NP' : 'en-US';
  let body = `<prosody rate="${pct(rate)}" pitch="${pct(v.pitch)}">${escapeXml(job.text)}</prosody>`;
  if (v.style) body = `<mstts:express-as style="${v.style}">${body}</mstts:express-as>`;
  return (
    `<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xmlns:mstts="https://www.w3.org/2001/mstts" xml:lang="${xmlLang}">` +
    `<voice name="${v.voice}"><mstts:silence type="Leading-exact" value="50ms"/><mstts:silence type="Tailing-exact" value="150ms"/>${body}</voice></speak>`
  );
}
