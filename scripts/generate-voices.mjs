#!/usr/bin/env node
/**
 * Generate natural AI voices for every spoken line, for each buddy, with Azure AI Speech.
 *
 *   node scripts/generate-voices.mjs [--buddy cat] [--force] [--limit 5] [--dry]
 *
 * Normally run by GitHub Actions (.github/workflows/voices.yml), which supplies the
 * AZURE_SPEECH_KEY and AZURE_SPEECH_REGION secrets. The key is never printed or stored.
 *
 * Writes src/audio/ai/<buddy>/<lang>/<key>.mp3 and src/audio/ai/manifest.json. The manifest
 * keeps a fingerprint of each clip's text and voice settings, so a run only makes clips that
 * are new or changed (--force remakes everything) and removes clips for lines that are gone.
 *
 * The free (F0) tier allows 20 requests a minute, so requests are spaced about 3 s apart.
 * Azure sends uncompressed audio; ffmpeg trims the silence (Azure leaves up to a second after
 * a word), sets one steady volume for the whole clip (no pumping), and encodes the MP3 once.
 * HD voices now and then ramble on a short line, so a clip much longer than its text should
 * take is made again (up to 3 tries, keeping the shortest).
 */
import { build } from 'esbuild';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, unlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { buildSsml, maxSeconds, VOICE_VERSION } from './voice-ssml.mjs';
import { tidySpeech } from './voice-tidy.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const outRoot = join(root, 'src/audio/ai');
const manifestPath = join(outRoot, 'manifest.json');
const args = process.argv.slice(2);
const flag = (name) => args.includes(`--${name}`);
const opt = (name) => (args.includes(`--${name}`) ? args[args.indexOf(`--${name}`) + 1] : undefined);
const onlyBuddy = opt('buddy');
const limit = Number(opt('limit') || 0);
const force = flag('force');
const dry = flag('dry');
const GAP_MS = 3200;
const SAFE = /^[^\\/:*?"<>|\s]+$/;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const hasFfmpeg = spawnSync('ffmpeg', ['-version'], { stdio: 'ignore' }).status === 0;
const RATE = 24000;
const PCM_IN = ['-f', 's16le', '-ar', String(RATE), '-ac', '1'];
/** Without ffmpeg, ask Azure for MP3 directly (no trimming or levelling). */
const FORMAT = hasFfmpeg ? 'riff-24khz-16bit-mono-pcm' : 'audio-24khz-48kbitrate-mono-mp3';

/**
 * Trim the silence and tidy the speech (voice-tidy.mjs: drops a stray sound after a lone
 * letter, shortens over-long pauses), set one steady volume (average about -18 dB, peaks
 * below -1 dB), and encode the MP3 once. Returns the MP3 and its length in seconds.
 */
function polish(raw, tmp, text) {
  if (!hasFfmpeg) return { mp3: raw, secs: null };
  const src = join(tmp, 'in.wav');
  const tidy = join(tmp, 'tidy.pcm');
  const dst = join(tmp, 'out.mp3');
  writeFileSync(src, raw);
  for (const f of [tidy, dst]) rmSync(f, { force: true });
  const dec = spawnSync('ffmpeg', ['-loglevel', 'error', '-i', src, ...PCM_IN, '-'], { maxBuffer: 1 << 27 });
  if (dec.status !== 0 || !dec.stdout?.length) throw Object.assign(new Error('ffmpeg could not read the audio'), { skip: true });
  const bytes = new Uint8Array(dec.stdout.length & ~1);
  bytes.set(dec.stdout.subarray(0, bytes.length));
  const pcm = tidySpeech(new Int16Array(bytes.buffer), RATE, text);
  writeFileSync(tidy, Buffer.from(pcm.buffer, pcm.byteOffset, pcm.byteLength));
  const probe = spawnSync('ffmpeg', ['-hide_banner', ...PCM_IN, '-i', tidy, '-af', 'volumedetect', '-f', 'null', '-'], { encoding: 'utf8' }).stderr;
  const mean = Number(/mean_volume: (-?[\d.]+) dB/.exec(probe)?.[1] ?? -20);
  const peak = Number(/max_volume: (-?[\d.]+) dB/.exec(probe)?.[1] ?? -1);
  const gain = Math.min(-18 - mean, -1 - peak);
  const e = spawnSync('ffmpeg', ['-loglevel', 'error', '-y', ...PCM_IN, '-i', tidy, '-af', `volume=${gain.toFixed(2)}dB`, '-c:a', 'libmp3lame', '-b:a', '64k', dst]);
  if (e.status !== 0 || !existsSync(dst)) throw Object.assign(new Error('ffmpeg could not encode the clip'), { skip: true });
  return { mp3: readFileSync(dst), secs: pcm.length / RATE };
}
const hashOf = (s) => createHash('sha1').update(`${VOICE_VERSION}|${s}`).digest('hex').slice(0, 12);

async function loadJobs() {
  const dir = mkdtempSync(join(tmpdir(), 'voices-'));
  const outfile = join(dir, 'lines.mjs');
  await build({ entryPoints: [join(root, 'scripts/voice-lines.ts')], bundle: true, platform: 'node', format: 'esm', outfile, logLevel: 'error' });
  const { voiceJobs } = await import(pathToFileURL(outfile).href);
  rmSync(dir, { recursive: true, force: true });
  return voiceJobs();
}

async function synth(ssml, key, region) {
  const url = `https://${region}.tts.speech.microsoft.com/cognitiveservices/v1`;
  for (let attempt = 1; attempt <= 6; attempt++) {
    let res;
    try {
      res = await fetch(url, {
        method: 'POST',
        headers: {
          'Ocp-Apim-Subscription-Key': key,
          'Content-Type': 'application/ssml+xml',
          'X-Microsoft-OutputFormat': FORMAT,
          'User-Agent': 'sano-sathi-voices',
        },
        body: ssml,
      });
    } catch (e) {
      console.log(`  network error (${e.message}), retrying…`);
      await sleep(5000 * attempt);
      continue;
    }
    if (res.ok) return Buffer.from(await res.arrayBuffer());
    if (res.status === 401 || res.status === 403) {
      throw new Error(`Azure refused the key (HTTP ${res.status}). Check the AZURE_SPEECH_KEY and AZURE_SPEECH_REGION secrets.`);
    }
    if (res.status === 429 || res.status >= 500) {
      const wait = Number(res.headers.get('retry-after')) * 1000 || 15000 * attempt;
      console.log(`  busy (HTTP ${res.status}), waiting ${Math.round(wait / 1000)} s…`);
      await sleep(wait);
      continue;
    }
    const detail = (await res.text()).slice(0, 300);
    throw Object.assign(new Error(`HTTP ${res.status}: ${detail}`), { skip: true });
  }
  throw Object.assign(new Error('gave up after 6 tries'), { skip: true });
}

const all = await loadJobs();
const jobs = onlyBuddy ? all.filter((j) => j.buddy === onlyBuddy) : all;
if (!jobs.length) {
  console.error(`No lines found${onlyBuddy ? ` for buddy "${onlyBuddy}"` : ''}.`);
  process.exit(1);
}
const manifest = existsSync(manifestPath) ? JSON.parse(readFileSync(manifestPath, 'utf8')) : {};
const idOf = (j) => `${j.buddy}/${j.lang}/${j.key}`;
const fileOf = (id) => join(outRoot, `${id}.mp3`);

const planned = jobs.map((j) => ({ j, id: idOf(j), ssml: buildSsml(j) })).map((p) => ({ ...p, hash: hashOf(p.ssml) }));
let todo = planned.filter((p) => force || manifest[p.id] !== p.hash || !existsSync(fileOf(p.id)));
if (limit > 0) todo = todo.slice(0, limit);
const chars = todo.reduce((n, p) => n + p.j.text.length, 0);
console.log(`${planned.length} lines${onlyBuddy ? ` for ${onlyBuddy}` : ''}; ${todo.length} to make (${chars} characters, about ${Math.ceil((todo.length * GAP_MS) / 60000)} min).`);

if (dry) {
  for (const p of todo.slice(0, 5)) console.log(`\n${p.id}\n${p.ssml}`);
  process.exit(0);
}

if (!hasFfmpeg) console.log('Note: ffmpeg not found, so clips are saved without trimming or levelling.');
const work = mkdtempSync(join(tmpdir(), 'voice-clip-'));
const key = process.env.AZURE_SPEECH_KEY;
const region = (process.env.AZURE_SPEECH_REGION || '').trim().toLowerCase();
if (todo.length && (!key || !region)) {
  console.error('Missing AZURE_SPEECH_KEY or AZURE_SPEECH_REGION (set them as GitHub secrets).');
  process.exit(1);
}

const save = () => {
  const sorted = Object.fromEntries(Object.entries(manifest).sort(([a], [b]) => a.localeCompare(b)));
  writeFileSync(manifestPath, `${JSON.stringify(sorted, null, 1)}\n`);
};

let made = 0;
const skipped = [];
const long = [];
let last = 0;
/** One request, spaced to stay inside the free tier's limit. */
async function makeOnce(p) {
  const wait = last + GAP_MS - Date.now();
  if (wait > 0) await sleep(wait);
  last = Date.now();
  const raw = await synth(p.ssml, key, region);
  if (raw.length < 500) throw Object.assign(new Error('audio too short'), { skip: true });
  return polish(raw, work, p.j.text);
}
const TRIES = 3;
for (const p of todo) {
  if (!SAFE.test(p.j.key)) {
    skipped.push(`${p.id} (unsafe file name)`);
    continue;
  }
  try {
    // Remake a clip that runs much longer than its text should take; keep the shortest.
    const limitSecs = maxSeconds(p.j.text);
    let best = await makeOnce(p);
    for (let t = 2; t <= TRIES && best.secs !== null && best.secs > limitSecs; t++) {
      console.log(`  … ${p.id} took ${best.secs.toFixed(2)} s (expected under ${limitSecs.toFixed(1)} s), making it again`);
      const again = await makeOnce(p);
      if (again.secs !== null && again.secs < best.secs) best = again;
    }
    if (best.secs !== null && best.secs > limitSecs) long.push(`${p.id}  ${p.j.text}  ${best.secs.toFixed(2)} s`);
    const mp3 = best.mp3;
    mkdirSync(dirname(fileOf(p.id)), { recursive: true });
    writeFileSync(fileOf(p.id), mp3);
    manifest[p.id] = p.hash;
    made++;
    console.log(`  ✓ ${p.id}  ${p.j.text}  (${best.secs !== null ? `${best.secs.toFixed(2)} s, ` : ''}${(mp3.length / 1024).toFixed(1)} KB)`);
    if (made % 10 === 0) save();
  } catch (e) {
    if (!e.skip) {
      save();
      console.error(e.message);
      process.exit(1);
    }
    skipped.push(`${p.id}: ${e.message}`);
    console.log(`  ✗ ${p.id}: ${e.message}`);
  }
}

// Remove clips for lines that no longer exist (only on full runs).
let removed = 0;
if (!limit) {
  const live = new Set(planned.map((p) => p.id));
  for (const id of Object.keys(manifest)) {
    if (onlyBuddy && !id.startsWith(`${onlyBuddy}/`)) continue;
    if (live.has(id)) continue;
    if (existsSync(fileOf(id))) unlinkSync(fileOf(id));
    delete manifest[id];
    removed++;
  }
}
save();
rmSync(work, { recursive: true, force: true });
console.log(`Made ${made} clips${removed ? `, removed ${removed}` : ''}${skipped.length ? `, skipped ${skipped.length}` : ''}.`);
for (const s of skipped) console.log(`  skipped ${s}`);
if (long.length) {
  console.log(`Still long after ${TRIES} tries (kept the shortest; worth a listen):`);
  for (const s of long) console.log(`  ${s}`);
}
