#!/usr/bin/env node
/**
 * Voice lab: make the same few lines with several voice settings, to compare by ear and by
 * measurement before remaking every clip. Writes lab/<variant>/<line>.mp3, lab/lab.json
 * (what each variant is) and lab/voices.json (every Azure voice that can speak Nepali).
 *
 * Run by .github/workflows/voice-lab.yml (it has the Azure key). Nothing here is used by the app.
 */
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const key = process.env.AZURE_SPEECH_KEY;
const region = (process.env.AZURE_SPEECH_REGION || '').trim().toLowerCase();
if (!key || !region) {
  console.error('Missing AZURE_SPEECH_KEY / AZURE_SPEECH_REGION');
  process.exit(1);
}
const out = 'lab';
rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const esc = (s) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' })[c]);

const LINES = [
  { id: '1-word', lang: 'ne', word: true, text: 'गाई' },
  { id: '2-number', lang: 'ne', word: true, text: 'सात' },
  { id: '3-colour', lang: 'ne', word: true, text: 'पहेँलो' },
  { id: '4-letter', lang: 'ne', word: true, text: 'क, कमलको क' },
  { id: '5-hello', lang: 'ne', text: 'म्याउँ! म बिरालो। आऊ, खेलौँ!' },
  { id: '6-sentence', lang: 'ne', text: 'राति भयो। चाँडै सुत्ने बेला भयो!' },
  { id: '7-long', lang: 'ne', text: 'घोडा अङ्ग्रेजी L आकारमा उफ्रन्छ: दुई कोठा, अनि एक कोठा छेउतिर।' },
  { id: '8-english', lang: 'en', text: "It's getting late. Sleep time soon!" },
  { id: '9-bignum', lang: 'ne', word: true, text: '४४' },
];

/** How the app makes clips today, and cleaner alternatives. */
const VARIANTS = [
  { id: 'A-now-cat', desc: 'Now (Cat): Hemkala, pitch +4%, words 10% slower; MP3 compressed twice; volume levelled continuously', ne: 'ne-NP-HemkalaNeural', en: 'en-US-JennyNeural', pitch: 4, slow: -10, hq: false },
  { id: 'B-hemkala-clean', desc: 'Hemkala exactly as she is (no pitch or speed change); best quality from Azure; one MP3; steady volume', ne: 'ne-NP-HemkalaNeural', en: 'en-US-JennyNeural', pitch: 0, slow: 0, hq: true },
  { id: 'C-hemkala-clean-slower', desc: 'Like B, but single words 6% slower', ne: 'ne-NP-HemkalaNeural', en: 'en-US-JennyNeural', pitch: 0, slow: -6, hq: true },
  { id: 'D-sagar-clean', desc: 'Sagar (male) exactly as he is; best quality; one MP3; steady volume', ne: 'ne-NP-SagarNeural', en: 'en-US-GuyNeural', pitch: 0, slow: 0, hq: true },
  { id: 'E-now-puppy', desc: 'Now (Puppy): Hemkala pitch +18%, 4% faster, words 10% slower; MP3 twice; continuous levelling', ne: 'ne-NP-HemkalaNeural', en: 'en-US-AnaNeural', pitch: 18, rate: 4, slow: -10, hq: false },
];

async function req(url, init) {
  for (let attempt = 1; attempt <= 6; attempt++) {
    let res;
    try {
      res = await fetch(url, init);
    } catch (e) {
      await sleep(4000 * attempt);
      continue;
    }
    if (res.ok) return res;
    if (res.status === 429 || res.status >= 500) {
      await sleep((Number(res.headers.get('retry-after')) || 15) * 1000);
      continue;
    }
    throw new Error(`HTTP ${res.status}: ${(await res.text()).slice(0, 200)}`);
  }
  throw new Error('gave up');
}

// 1. Which voices can speak Nepali (its own locale, or as a second language)?
const voices = await (await req(`https://${region}.tts.speech.microsoft.com/cognitiveservices/voices/list`, { headers: { 'Ocp-Apim-Subscription-Key': key } })).json();
const nepali = voices
  .filter((v) => v.Locale?.startsWith('ne') || (v.SecondaryLocaleList || []).some((l) => l.startsWith('ne')))
  .map((v) => ({ name: v.ShortName, locale: v.Locale, gender: v.Gender, type: v.VoiceType, secondary: (v.SecondaryLocaleList || []).length, styles: v.StyleList || [], tag: v.VoiceTag || null }));
writeFileSync(join(out, 'voices.json'), JSON.stringify({ count: voices.length, nepali }, null, 1));
console.log(`${voices.length} voices; ${nepali.length} can speak Nepali:`, nepali.map((v) => v.name).join(', '));

// Multilingual voices to try: LAB_VOICES (comma list) or, by default, the first three.
const wanted = (process.env.LAB_VOICES || '').split(',').map((s) => s.trim()).filter(Boolean);
const pickList = wanted.length ? nepali.filter((x) => wanted.includes(x.name)) : nepali.filter((x) => !x.locale.startsWith('ne')).slice(0, 3);
if (wanted.length) {
  // A focused round: keep only today's voice and the clean native voices for reference.
  VARIANTS.splice(0, VARIANTS.length, ...VARIANTS.filter((v) => ['A-now-cat', 'B-hemkala-clean', 'D-sagar-clean'].includes(v.id)));
}
for (const v of pickList) {
  VARIANTS.push({ id: `M-${v.name.replace(/:.*$/, '').replace(/Neural$/, '')}${v.type === 'NeuralHD' ? '-HD' : ''}`, desc: `${v.name}: a multilingual voice (${v.gender.toLowerCase()}) speaking Nepali and English; best quality; one MP3; steady volume`, ne: v.name, en: v.name, pitch: 0, slow: 0, hq: true, multi: true });
}

const pct = (n) => `${n >= 0 ? '+' : ''}${n}%`;
function ssml(v, line) {
  const voice = line.lang === 'ne' ? v.ne : v.en;
  const rate = (v.rate || 0) + (line.word ? v.slow : 0);
  const xl = line.lang === 'ne' ? 'ne-NP' : 'en-US';
  let body = esc(line.text);
  if (rate || v.pitch) body = `<prosody rate="${pct(rate)}" pitch="${pct(v.pitch)}">${body}</prosody>`;
  if (v.multi) body = `<lang xml:lang="${xl}">${body}</lang>`;
  return `<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xmlns:mstts="https://www.w3.org/2001/mstts" xml:lang="${xl}"><voice name="${voice}"><mstts:silence type="Leading-exact" value="50ms"/><mstts:silence type="Tailing-exact" value="150ms"/>${body}</voice></speak>`;
}

const TRIM =
  'silenceremove=start_periods=1:start_threshold=-50dB:start_silence=0.03,areverse,' +
  'silenceremove=start_periods=1:start_threshold=-50dB:start_silence=0.12,areverse';

/** Today's polish: trim, single-pass loudnorm (adjusts volume through the clip), MP3 48k again. */
function polishOld(src, dst) {
  spawnSync('ffmpeg', ['-loglevel', 'error', '-y', '-i', src, '-af', `${TRIM},loudnorm=I=-16:TP=-1.5:LRA=11`, '-ar', '24000', '-ac', '1', '-c:a', 'libmp3lame', '-b:a', '48k', dst]);
}
/** New polish: trim, one fixed gain for the whole clip (no pumping), one MP3 encode at 64k. */
function polishNew(src, dst) {
  const trimmed = `${src}.trim.wav`;
  spawnSync('ffmpeg', ['-loglevel', 'error', '-y', '-i', src, '-af', TRIM, '-ar', '24000', '-ac', '1', trimmed]);
  const probe = spawnSync('ffmpeg', ['-hide_banner', '-i', trimmed, '-af', 'volumedetect', '-f', 'null', '-'], { encoding: 'utf8' }).stderr;
  const mean = Number(/mean_volume: (-?[\d.]+) dB/.exec(probe)?.[1] ?? -20);
  const peak = Number(/max_volume: (-?[\d.]+) dB/.exec(probe)?.[1] ?? -1);
  const gain = Math.min(-18 - mean, -1.0 - peak);
  spawnSync('ffmpeg', ['-loglevel', 'error', '-y', '-i', trimmed, '-af', `volume=${gain.toFixed(2)}dB`, '-c:a', 'libmp3lame', '-b:a', '64k', dst]);
  rmSync(trimmed, { force: true });
}

const report = [];
for (const v of VARIANTS) {
  mkdirSync(join(out, v.id), { recursive: true });
  for (const line of LINES) {
    const body = ssml(v, line);
    const t0 = Date.now();
    try {
      const res = await req(`https://${region}.tts.speech.microsoft.com/cognitiveservices/v1`, {
        method: 'POST',
        headers: {
          'Ocp-Apim-Subscription-Key': key,
          'Content-Type': 'application/ssml+xml',
          'X-Microsoft-OutputFormat': v.hq ? 'riff-24khz-16bit-mono-pcm' : 'audio-24khz-48kbitrate-mono-mp3',
          'User-Agent': 'sano-sathi-voice-lab',
        },
        body,
      });
      const raw = join(out, v.id, `${line.id}.raw.${v.hq ? 'wav' : 'mp3'}`);
      writeFileSync(raw, Buffer.from(await res.arrayBuffer()));
      const dst = join(out, v.id, `${line.id}.mp3`);
      (v.hq ? polishNew : polishOld)(raw, dst);
      rmSync(raw, { force: true });
      report.push({ variant: v.id, line: line.id, ok: existsSync(dst) });
    } catch (e) {
      report.push({ variant: v.id, line: line.id, ok: false, error: String(e.message).slice(0, 160) });
      console.log(`  ${v.id}/${line.id}: ${e.message}`);
    }
    const wait = 3200 - (Date.now() - t0);
    if (wait > 0) await sleep(wait);
  }
  console.log(`made ${v.id}`);
}
writeFileSync(join(out, 'lab.json'), JSON.stringify({ variants: VARIANTS, lines: LINES, report }, null, 1));
console.log('done');
