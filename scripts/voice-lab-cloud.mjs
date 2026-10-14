#!/usr/bin/env node
/**
 * Voice lab, cloud round: the hardest Nepali lines (lone letters, letter chants, क vs ख) with
 * the paid voice services, to compare by ear. Each service runs only if its key is set
 * (GitHub secrets), so any one of them can be tried:
 *   ELEVENLABS_API_KEY  ElevenLabs, Eleven v4 (the only ElevenLabs model with Nepali)
 *   OPENAI_API_KEY      OpenAI, gpt-4o-mini-tts (follows spoken instructions)
 *   GEMINI_API_KEY      Google, Gemini 3.8 Flash TTS (Nepali is supported)
 * Uses a few hundred characters per service. Keys are never printed or stored.
 *
 * Writes lab/<variant>/<line>.raw.<ext> and lab/<service>.json; voice-lab-clean.mjs then
 * cleans every clip exactly as the app's clips are cleaned.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const OUT = 'lab';
mkdirSync(OUT, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export const LINES = [
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

/** How to speak, for the services that take instructions. */
const HOW =
  'Speak natural Nepali as a native speaker from Nepal: a warm, clear, unhurried teacher for young children. ' +
  'Say exactly the words given, nothing more. Pronounce every Devanagari letter precisely: unaspirated consonants ' +
  '(क, ग, च, ज, ट, ड, त, द, प, ब) with no puff of air, aspirated ones (ख, घ, छ, झ, ठ, ढ, थ, ध, फ, भ) with a clear puff.';
const HOW_LETTER = `${HOW} This is a letter of the Nepali alphabet, said the way children chant the alphabet.`;
const HOW_EN = 'Speak warm, clear, friendly English for young children. Say exactly the words given.';

async function fetchRetry(url, init, label) {
  for (let attempt = 1; attempt <= 5; attempt++) {
    const res = await fetch(url, init);
    if (res.ok) return res;
    if (res.status === 429 || res.status >= 500) {
      await sleep(4000 * attempt);
      continue;
    }
    throw new Error(`${label}: HTTP ${res.status} ${(await res.text()).slice(0, 400)}`);
  }
  throw new Error(`${label}: gave up`);
}

/** Make every line with each variant; save raw audio and a report. */
async function runService(name, variants, make) {
  const info = { engine: name, variants: [], report: [], load_errors: [] };
  for (const v of variants) {
    mkdirSync(join(OUT, v.id), { recursive: true });
    info.variants.push({ id: v.id, desc: v.desc, licence: v.licence });
    for (const line of LINES) {
      if (v.onlyLetters && !line.letter) continue;
      const t0 = Date.now();
      try {
        const { bytes, ext } = await make(v, line);
        writeFileSync(join(OUT, v.id, `${line.id}.raw.${ext}`), bytes);
        info.report.push({ variant: v.id, line: line.id, ok: true, secs: (Date.now() - t0) / 1000 });
      } catch (e) {
        info.report.push({ variant: v.id, line: line.id, ok: false, error: String(e.message).slice(0, 400) });
        console.log(`  ${v.id}/${line.id}: ${e.message}`);
      }
      await sleep(700);
    }
    console.log(`${name}: made ${v.id}`);
  }
  writeFileSync(join(OUT, `${name}.json`), JSON.stringify(info, null, 1));
}

/* ------------------------------ ElevenLabs ------------------------------ */
async function eleven(key) {
  const API = 'https://api.elevenlabs.io';
  const headers = { 'xi-api-key': key };
  const mine = (await (await fetchRetry(`${API}/v1/voices`, { headers }, 'voices')).json()).voices || [];
  // Community voices that speak Nepali (names and previews, for a later round).
  try {
    const lib = (await (await fetchRetry(`${API}/v1/shared-voices?page_size=60&language=ne`, { headers }, 'shared')).json()).voices || [];
    writeFileSync(join(OUT, 'eleven-nepali-library.json'), JSON.stringify(lib.map((v) => ({ id: v.voice_id, name: v.name, gender: v.gender, age: v.age, accent: v.accent, description: v.description, preview: v.preview_url })), null, 1));
  } catch (e) {
    console.log('community voices:', e.message);
  }
  const byName = (n) => mine.find((v) => v.name.toLowerCase().startsWith(n.toLowerCase()));
  const SETTINGS = { stability: 0.5, similarity_boost: 0.75, speed: 1.0 }; // the parent's sample
  const CONTEXT = 'नेपाली वर्णमालाको अक्षर:';
  const want = [
    { id: 'E1-jessica', voice: 'Jessica', desc: 'ElevenLabs Jessica (your sample\'s voice and settings)', context: false },
    { id: 'E2-jessica-hint', voice: 'Jessica', desc: 'ElevenLabs Jessica, told "this is a letter"', context: true, onlyLetters: true },
    { id: 'E3-laura', voice: 'Laura', desc: 'ElevenLabs Laura (female)', context: true },
    { id: 'E4-will', voice: 'Will', desc: 'ElevenLabs Will (male)', context: true },
  ];
  const variants = want.map((w) => ({ ...w, voiceId: byName(w.voice)?.voice_id, licence: 'Paid plan for commercial use' })).filter((w) => w.voiceId);
  await runService('elevenlabs', variants, async (v, line) => {
    const body = { text: line.text, model_id: 'eleven_v4', language_code: line.lang || 'ne', voice_settings: SETTINGS };
    if (v.context && line.letter) body.previous_text = CONTEXT;
    const res = await fetchRetry(`${API}/v1/text-to-speech/${v.voiceId}?output_format=mp3_44100_128`, { method: 'POST', headers: { ...headers, 'Content-Type': 'application/json' }, body: JSON.stringify(body) }, 'tts');
    return { bytes: Buffer.from(await res.arrayBuffer()), ext: 'mp3' };
  });
}

/* ------------------------------ OpenAI ------------------------------ */
async function openai(key) {
  const variants = [
    { id: 'A1-marin', voice: 'marin', desc: 'OpenAI marin', licence: 'Paid API; tell users the voice is AI' },
    { id: 'A2-coral', voice: 'coral', desc: 'OpenAI coral', licence: 'Paid API; tell users the voice is AI' },
    { id: 'A3-cedar', voice: 'cedar', desc: 'OpenAI cedar', licence: 'Paid API; tell users the voice is AI' },
  ];
  await runService('openai', variants, async (v, line) => {
    const body = { model: 'gpt-4o-mini-tts', voice: v.voice, input: line.text, instructions: line.lang === 'en' ? HOW_EN : line.letter ? HOW_LETTER : HOW, response_format: 'wav' };
    const res = await fetchRetry('https://api.openai.com/v1/audio/speech', { method: 'POST', headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' }, body: JSON.stringify(body) }, 'speech');
    return { bytes: Buffer.from(await res.arrayBuffer()), ext: 'wav' };
  });
}

/* ------------------------------ Google Gemini ------------------------------ */
/** Find the base64 audio anywhere in the reply (the reply layout is nested). */
function findAudio(node) {
  if (!node || typeof node !== 'object') return null;
  if (node.type === 'audio' && typeof node.data === 'string') return node.data;
  if (node.inlineData?.data) return node.inlineData.data;
  for (const v of Object.values(node)) {
    const hit = findAudio(v);
    if (hit) return hit;
  }
  return null;
}
async function gemini(key) {
  const variants = [
    { id: 'G1-sulafat', voice: 'Sulafat', desc: 'Google Gemini Sulafat (warm, female)', licence: 'Paid API' },
    { id: 'G2-leda', voice: 'Leda', desc: 'Google Gemini Leda (youthful, female)', licence: 'Paid API' },
    { id: 'G3-achird', voice: 'Achird', desc: 'Google Gemini Achird (friendly, male)', licence: 'Paid API' },
  ];
  await runService('gemini', variants, async (v, line) => {
    const style = line.lang === 'en' ? 'warm, clear and friendly, for young children' : line.letter ? 'a native Nepali teacher saying one letter of the Nepali alphabet, clearly and precisely' : 'a warm, clear native Nepali speaker talking to a young child';
    const body = {
      model: 'gemini-3.8-flash-tts',
      input: [{ type: 'user_input', content: [{ type: 'text', text: line.text, annotations: [{ type: 'speech_metadata', style }] }] }],
      response_format: { type: 'audio' },
      generation_config: { speech_config: [{ voice: v.voice }] },
    };
    const res = await fetchRetry('https://generativelanguage.googleapis.com/v1beta/interactions', { method: 'POST', headers: { 'x-goog-api-key': key, 'Content-Type': 'application/json' }, body: JSON.stringify(body) }, 'interactions');
    const data = findAudio(await res.json());
    if (!data) throw new Error('no audio in the reply');
    return { bytes: Buffer.from(data, 'base64'), ext: 'wav' };
  });
}

const tried = [];
for (const [name, env, fn] of [['ElevenLabs', 'ELEVENLABS_API_KEY', eleven], ['OpenAI', 'OPENAI_API_KEY', openai], ['Gemini', 'GEMINI_API_KEY', gemini]]) {
  const key = process.env[env];
  if (!key) {
    console.log(`${name}: no ${env} secret, skipped.`);
    continue;
  }
  tried.push(name);
  try {
    await fn(key);
  } catch (e) {
    console.log(`${name} failed: ${e.message}`);
    writeFileSync(join(OUT, `${name.toLowerCase()}.json`), JSON.stringify({ engine: name.toLowerCase(), variants: [], report: [], load_errors: [{ engine: name, error: String(e.message).slice(0, 800) }] }, null, 1));
  }
}
if (!tried.length) {
  console.error('No voice service keys are set. Add ELEVENLABS_API_KEY, OPENAI_API_KEY or GEMINI_API_KEY as GitHub secrets.');
  process.exit(1);
}
