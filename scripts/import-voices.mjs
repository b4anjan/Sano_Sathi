#!/usr/bin/env node
/**
 * Build Voice Studio recordings into the app.
 *
 *   node scripts/import-voices.mjs <sano-sathi-voices-YYYY-MM-DD.zip> [--out src/audio] [--dry]
 *
 * Takes the zip from the studio's "Download all" button and writes one small AAC file per
 * clip to src/audio/<en|ne>/<key>.m4a, ready to commit. Each clip gets a gentle low-cut
 * (removes rumble and handling noise) and loudness levelling, so a parent's and a child's
 * recordings play at the same volume. Recordings that the browser could not trim (non-WAV)
 * also get leading and trailing silence removed.
 *
 * Needs ffmpeg on the PATH (Windows: `winget install ffmpeg`, macOS: `brew install ffmpeg`).
 */
import { readFileSync, writeFileSync, mkdirSync, mkdtempSync, rmSync, readdirSync, unlinkSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';
import { unzipSync } from 'fflate';

const args = process.argv.slice(2);
const zipPath = args.find((a) => !a.startsWith('--'));
const outRoot = resolve(args.includes('--out') ? args[args.indexOf('--out') + 1] : 'src/audio');
const dry = args.includes('--dry');

if (!zipPath) {
  console.error('Usage: node scripts/import-voices.mjs <voices.zip> [--out src/audio] [--dry]');
  process.exit(1);
}
if (spawnSync('ffmpeg', ['-version'], { stdio: 'ignore' }).status !== 0) {
  console.error('ffmpeg was not found. Install it (Windows: winget install ffmpeg) and open a new terminal.');
  process.exit(1);
}

const entries = unzipSync(new Uint8Array(readFileSync(zipPath)));
const tmp = mkdtempSync(join(tmpdir(), 'voices-'));
const SAFE = /^[^\\/:*?"<>|\s]+$/;
let ok = 0;
const failed = [];

for (const [name, bytes] of Object.entries(entries)) {
  const m = name.match(/(?:^|\/)(en|ne)\/([^/]+)\.(wav|m4a|mp4|ogg|mp3|webm)$/i);
  if (!m) continue;
  const [, lang, key, ext] = m;
  if (!SAFE.test(key)) {
    failed.push(`${name} (unsafe name)`);
    continue;
  }
  const src = join(tmp, `${lang}-${ok}-${failed.length}.${ext}`);
  writeFileSync(src, bytes);
  const dir = join(outRoot, lang);
  const dst = join(dir, `${key}.m4a`);
  const trim = ext.toLowerCase() === 'wav' ? '' : 'silenceremove=start_periods=1:start_threshold=-45dB:start_silence=0.12,areverse,silenceremove=start_periods=1:start_threshold=-45dB:start_silence=0.2,areverse,';
  const filter = `${trim}highpass=f=70,loudnorm=I=-16:TP=-1.5:LRA=11`;
  if (dry) {
    console.log(`would write ${dst}`);
    ok++;
    continue;
  }
  mkdirSync(dir, { recursive: true });
  // Remove an older clip with the same key in another format, so only one file per key exists.
  for (const f of readdirSync(dir)) if (f.startsWith(`${key}.`) && f !== `${key}.m4a`) unlinkSync(join(dir, f));
  const r = spawnSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-i', src, '-af', filter, '-ac', '1', '-ar', '44100', '-c:a', 'aac', '-b:a', '64k', '-movflags', '+faststart', dst], { encoding: 'utf8' });
  if (r.status === 0) ok++;
  else failed.push(`${name}: ${r.stderr.trim().split('\n').pop()}`);
}
rmSync(tmp, { recursive: true, force: true });

console.log(`${dry ? 'Checked' : 'Wrote'} ${ok} clips to ${outRoot}`);
if (failed.length) {
  console.log(`Skipped ${failed.length}:`);
  for (const f of failed) console.log(`  ${f}`);
  process.exitCode = 1;
}
