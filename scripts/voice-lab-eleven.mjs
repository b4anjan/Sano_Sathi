#!/usr/bin/env node
/**
 * Voice lab, ElevenLabs round: the hardest lines (lone letters, letter chants, क vs ख) with
 * ElevenLabs' Eleven v4 model, to compare with the Azure voices by ear before switching.
 * Also lists ElevenLabs' community voices that speak Nepali and saves their previews.
 *
 * Writes lab/<variant>/<line>.mp3 (cleaned exactly as the app's clips are), lab/lab.json,
 * lab/eleven-voices.json and lab/nepali-library/*.mp3. Uses at most ~1,500 characters.
 * Run by .github/workflows/voice-lab.yml with round "eleven" (needs ELEVENLABS_API_KEY).
 * The key is never printed or stored.
 */
import { spawnSync } from 'node:child_process';
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tidySpeech } from './voice-tidy.mjs';

const key = process.env.ELEVENLABS_API_KEY;
if (!key) {
  console.error('Missing ELEVENLABS_API_KEY (add it as a GitHub secret).');
  process.exit(1);
}
const API = 'https://api.elevenlabs.io';
const out = 'lab';
rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function call(path, init = {}) {
  for (let attempt = 1; attempt <= 5; attempt++) {
    const res = await fetch(`${API}${path}`, { ...init, headers: { 'xi-api-key': key, ...(init.headers || {}) } });
    if (res.ok) return res;
    if (res.status === 429 || res.status >= 500) {
      await sleep(3000 * attempt);
      continue;
    }
    throw new Error(`${path.split('?')[0]}: HTTP ${res.status} ${(await res.text()).slice(0, 300)}`);
  }
  throw new Error(`${path}: gave up`);
}

// 1. Which voices: the account's own (premade + added), and community voices that speak Nepali.
const mine = (await (await call('/v1/voices')).json()).voices || [];
let library = [];
try {
  library = (await (await call('/v1/shared-voices?page_size=60&language=ne')).json()).voices || [];
} catch (e) {
  console.log('Could not list community voices:', e.message);
}
writeFileSync(
  join(out, 'eleven-voices.json'),
  JSON.stringify(
    {
      mine: mine.map((v) => ({ id: v.voice_id, name: v.name, category: v.category, labels: v.labels })),
      nepaliLibrary: library.map((v) => ({ id: v.voice_id, owner: v.public_owner_id, name: v.name, gender: v.gender, age: v.age, accent: v.accent, language: v.language, useCase: v.use_case, descriptive: v.descriptive, description: v.description, freeUsersAllowed: v.free_users_allowed, preview: v.preview_url })),
    },
    null,
    1,
  ),
);
console.log(`${mine.length} voices in the account; ${library.length} community voices speak Nepali.`);
mkdirSync(join(out, 'nepali-library'), { recursive: true });
for (const v of library.slice(0, 12)) {
  if (!v.preview_url) continue;
  try {
    const r = await fetch(v.preview_url);
    if (r.ok) writeFileSync(join(out, 'nepali-library', `${v.voice_id}.mp3`), Buffer.from(await r.arrayBuffer()));
  } catch {}
}

const byName = (name) => mine.find((v) => v.name.toLowerCase().startsWith(name.toLowerCase()));

// 2. The hard lines. `letter` lines get context the voice reads but does not say.
const LINES = [
  { id: '01-ka', text: 'क', letter: true },
  { id: '02-kha', text: 'ख', letter: true },
  { id: '03-ka-chant', text: 'क, कुखुराको क', letter: true },
  { id: '04-kha-chant', text: 'ख, खेतको ख', letter: true },
  { id: '05-jha-chant', text: 'झ, झण्डाको झ', letter: true },
  { id: '06-nga', text: 'ङ', letter: true },
  { id: '07-ksha', text: 'क्ष', letter: true },
  { id: '08-a-chant', text: 'अ, अनारको अ', letter: true },
  { id: '09-number', text: 'सात' },
  { id: '10-word', text: 'पहेँलो' },
  { id: '11-cat', text: 'म्याउँ! म बिरालो। आऊ, खेलौँ!' },
  { id: '12-praise', text: 'नीलो! स्याबास! ठीक डालोमा राख्यौ!' },
  { id: '13-sentence', text: 'राति भयो। चाँडै सुत्ने बेला भयो!' },
  { id: '14-english', text: "Blue! Great job! That's the right basket!", lang: 'en' },
];
const LETTER_CONTEXT = 'नेपाली वर्णमालाको अक्षर:';

// 3. Voices to try. Jessica with the settings of the parent's sample (speed 1.0,
//    stability 0.5, similarity 0.75), also with letter context; and two more for Panda.
const SETTINGS = { stability: 0.5, similarity_boost: 0.75, speed: 1.0 };
const VARIANTS = [
  { id: 'E1-jessica', voice: 'Jessica', context: false },
  { id: 'E2-jessica-context', voice: 'Jessica', context: true, onlyLetters: true },
  { id: 'E3-will', voice: 'Will', context: true },
  { id: 'E4-chris', voice: 'Chris', context: true },
  { id: 'E5-laura', voice: 'Laura', context: true },
];

const RATE = 24000;
const PCM = ['-f', 's16le', '-ar', String(RATE), '-ac', '1'];
/** Clean a clip exactly as generate-voices.mjs does. */
function polish(mp3In, text, dst) {
  const src = `${dst}.in.mp3`;
  writeFileSync(src, mp3In);
  const dec = spawnSync('ffmpeg', ['-loglevel', 'error', '-i', src, ...PCM, '-'], { maxBuffer: 1 << 27 });
  const bytes = new Uint8Array(dec.stdout.length & ~1);
  bytes.set(dec.stdout.subarray(0, bytes.length));
  const raw = new Int16Array(bytes.buffer);
  const pcm = tidySpeech(raw, RATE, text);
  const tidy = `${dst}.pcm`;
  writeFileSync(tidy, Buffer.from(pcm.buffer, pcm.byteOffset, pcm.byteLength));
  const probe = spawnSync('ffmpeg', ['-hide_banner', ...PCM, '-i', tidy, '-af', 'volumedetect', '-f', 'null', '-'], { encoding: 'utf8' }).stderr;
  const mean = Number(/mean_volume: (-?[\d.]+) dB/.exec(probe)?.[1] ?? -20);
  const peak = Number(/max_volume: (-?[\d.]+) dB/.exec(probe)?.[1] ?? -1);
  const gain = Math.min(-18 - mean, -1 - peak);
  spawnSync('ffmpeg', ['-loglevel', 'error', '-y', ...PCM, '-i', tidy, '-af', `volume=${gain.toFixed(2)}dB`, '-c:a', 'libmp3lame', '-b:a', '64k', dst]);
  rmSync(src, { force: true });
  rmSync(tidy, { force: true });
  return { before: raw.length / RATE, after: pcm.length / RATE };
}

const report = [];
let chars = 0;
for (const v of VARIANTS) {
  const voice = byName(v.voice);
  if (!voice) {
    console.log(`No voice named ${v.voice} in this account; skipping ${v.id}.`);
    continue;
  }
  v.voiceId = voice.voice_id;
  v.voiceName = voice.name;
  mkdirSync(join(out, v.id), { recursive: true });
  for (const line of LINES) {
    if (v.onlyLetters && !line.letter) continue;
    const body = { text: line.text, model_id: 'eleven_v4', language_code: line.lang || 'ne', voice_settings: SETTINGS };
    if (v.context && line.letter) body.previous_text = LETTER_CONTEXT;
    try {
      const res = await call(`/v1/text-to-speech/${voice.voice_id}?output_format=mp3_44100_128`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const audio = Buffer.from(await res.arrayBuffer());
      const t = polish(audio, line.text, join(out, v.id, `${line.id}.mp3`));
      chars += line.text.length;
      report.push({ variant: v.id, line: line.id, ok: true, ...t });
    } catch (e) {
      report.push({ variant: v.id, line: line.id, ok: false, error: String(e.message).slice(0, 200) });
      console.log(`  ${v.id}/${line.id}: ${e.message}`);
    }
    await sleep(600);
  }
  console.log(`made ${v.id} (${v.voiceName})`);
}
writeFileSync(join(out, 'lab.json'), JSON.stringify({ provider: 'elevenlabs', model: 'eleven_v4', settings: SETTINGS, letterContext: LETTER_CONTEXT, variants: VARIANTS, lines: LINES, report, chars }, null, 1));
console.log(`done; about ${chars} characters used`);
