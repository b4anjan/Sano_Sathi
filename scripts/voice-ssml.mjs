/**
 * Voice settings and SSML for the AI voices (Azure AI Speech).
 *
 * The "I4 recipe", chosen by ear in the voice lab (scripts/voice-lab.mjs, October 2026):
 *  - one multilingual HD voice per buddy speaks both Nepali and English, so a buddy sounds
 *    like the same friend in both languages;
 *  - the voice is used exactly as it is: no pitch or speed changes (those made the older
 *    voices sound wobbly);
 *  - only letter lines ("क", "क, कुखुराको क") are 10% slower: HD voices rush a lone letter.
 * `rate` and `pitch` are percentages and stay 0 unless a buddy really needs them.
 */
const HD = (name) => `${name}:DragonHDLatestNeural`;
const hd = (name) => ({ voice: HD(name), multi: true, rate: 0, pitch: 0 });

export const VOICES = {
  cat: { en: hd('en-US-Ava'), ne: hd('en-US-Ava') },
  puppy: { en: hd('en-US-Emma'), ne: hd('en-US-Emma') },
  panda: { en: hd('en-US-Andrew'), ne: hd('en-US-Andrew') },
};

/** Letter lines are said a little slower. */
export const LETTER_RATE = -10;

/** Change this to regenerate every clip after a voice-settings change. (3: the I4 recipe, HD voices, cleaner audio) */
export const VOICE_VERSION = 3;

export function escapeXml(s) {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' })[c]);
}

const pct = (n) => `${n >= 0 ? '+' : ''}${n}%`;

/** SSML for one line. Leading and trailing silence are kept short so clips join up quickly. */
export function buildSsml(job) {
  const v = VOICES[job.buddy]?.[job.lang];
  if (!v) throw new Error(`No voice for ${job.buddy}/${job.lang}`);
  const rate = (v.rate || 0) + (job.group === 'letters' ? LETTER_RATE : 0);
  const pitch = v.pitch || 0;
  const xmlLang = job.lang === 'ne' ? 'ne-NP' : 'en-US';
  let body = job.sayAs === 'characters' ? `<say-as interpret-as="characters">${escapeXml(job.text)}</say-as>` : escapeXml(job.text);
  if (rate || pitch) body = `<prosody rate="${pct(rate)}" pitch="${pct(pitch)}">${body}</prosody>`;
  // A multilingual voice is told which language this line is in.
  if (v.multi) body = `<lang xml:lang="${xmlLang}">${body}</lang>`;
  else if (v.style) body = `<mstts:express-as style="${v.style}">${body}</mstts:express-as>`;
  return (
    `<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xmlns:mstts="https://www.w3.org/2001/mstts" xml:lang="${xmlLang}">` +
    `<voice name="${v.voice}"><mstts:silence type="Leading-exact" value="50ms"/><mstts:silence type="Tailing-exact" value="150ms"/>${body}</voice></speak>`
  );
}

/**
 * The longest a clip should take, in seconds. HD voices now and then ramble on a short line
 * (a lone ङ once came back 4 s long instead of 0.6 s), so a clip longer than this is made
 * again. Counted in letters, not characters: vowel signs and the virama don't add time.
 */
export function maxSeconds(text) {
  const bases = [...text].filter((ch) => /[\p{L}\p{N}]/u.test(ch) && !/\p{M}/u.test(ch)).length;
  return 1.0 + 0.32 * Math.max(1, bases);
}
