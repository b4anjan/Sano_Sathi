#!/usr/bin/env node
/**
 * Voice lab: clean every lab/<variant>/<line>.wav exactly as the app's clips are cleaned
 * (voice-tidy.mjs, one steady volume, one 64k MP3), measure each, and merge the engines'
 * notes into lab/lab.json. Used by the open-source round (voice-lab-open.yml).
 */
import { spawnSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tidySpeech } from './voice-tidy.mjs';
import { maxSeconds } from './voice-ssml.mjs';

const LAB = 'lab';
const RATE = 24000;
const PCM = ['-f', 's16le', '-ar', String(RATE), '-ac', '1'];
const engines = readdirSync(LAB).filter((f) => f.endsWith('.json') && f !== 'lab.json').map((f) => JSON.parse(readFileSync(join(LAB, f), 'utf8')));
const linesText = Object.fromEntries(
  [
    ['01-ka', 'क'], ['02-kha', 'ख'], ['03-ka-chant', 'क, कुखुराको क'], ['04-kha-chant', 'ख, खेतको ख'], ['05-jha-chant', 'झ, झण्डाको झ'],
    ['06-nga', 'ङ'], ['07-ksha', 'क्ष'], ['08-a-chant', 'अ, अनारको अ'], ['09-number', 'सात'], ['10-word', 'पहेँलो'],
    ['11-cat', 'म्याउँ! म बिरालो। आऊ, खेलौँ!'], ['12-praise', 'नीलो! स्याबास! ठीक डालोमा राख्यौ!'], ['13-sentence', 'राति भयो। चाँडै सुत्ने बेला भयो!'],
  ],
);

const measured = [];
for (const v of readdirSync(LAB)) {
  const dir = join(LAB, v);
  if (!statSync(dir).isDirectory()) continue;
  for (const f of readdirSync(dir).filter((x) => x.endsWith('.wav'))) {
    const line = f.replace(/\.wav$/, '');
    const src = join(dir, f);
    const dec = spawnSync('ffmpeg', ['-loglevel', 'error', '-i', src, ...PCM, '-'], { maxBuffer: 1 << 27 });
    if (dec.status !== 0 || !dec.stdout.length) continue;
    const bytes = new Uint8Array(dec.stdout.length & ~1);
    bytes.set(dec.stdout.subarray(0, bytes.length));
    const raw = new Int16Array(bytes.buffer);
    const pcm = tidySpeech(raw, RATE, linesText[line] || '');
    const tmp = join(dir, `${line}.pcm`);
    writeFileSync(tmp, Buffer.from(pcm.buffer, pcm.byteOffset, pcm.byteLength));
    const probe = spawnSync('ffmpeg', ['-hide_banner', ...PCM, '-i', tmp, '-af', 'volumedetect', '-f', 'null', '-'], { encoding: 'utf8' }).stderr;
    const mean = Number(/mean_volume: (-?[\d.]+) dB/.exec(probe)?.[1] ?? -20);
    const peak = Number(/max_volume: (-?[\d.]+) dB/.exec(probe)?.[1] ?? -1);
    const gain = Math.min(-18 - mean, -1 - peak);
    spawnSync('ffmpeg', ['-loglevel', 'error', '-y', ...PCM, '-i', tmp, '-af', `volume=${gain.toFixed(2)}dB`, '-c:a', 'libmp3lame', '-b:a', '64k', join(dir, `${line}.mp3`)]);
    rmSync(tmp, { force: true });
    rmSync(src, { force: true });
    const secs = pcm.length / RATE;
    measured.push({ variant: v, line, before: +(raw.length / RATE).toFixed(2), after: +secs.toFixed(2), long: secs > maxSeconds(linesText[line] || 'x') });
  }
}
writeFileSync(join(LAB, 'lab.json'), JSON.stringify({ round: 'open-source', lines: linesText, engines, measured }, null, 1));
console.log(`cleaned ${measured.length} clips`);
for (const m of measured.filter((x) => x.long)) console.log(`  long: ${m.variant}/${m.line} ${m.after}s`);
if (!existsSync(join(LAB, 'lab.json'))) process.exit(1);
