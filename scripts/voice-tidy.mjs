/**
 * Tidy a clip's speech: trim the silence at both ends (keeping a 30 ms lead-in and a
 * 120 ms tail), and clean up what HD voices sometimes add.
 *
 * HD voices sometimes add things a child should never hear. Listening tests showed the
 * pattern: asked for a lone letter ("ङ"), the voice says it correctly, then goes quiet for one
 * to three seconds, then makes a stray sound. And in a chant ("क, कुखुराको क") the comma
 * pause can stretch to one and a half seconds. So:
 *  - a very short line (one or two letters' worth) keeps only its first utterance;
 *  - any pause longer than LONG_GAP is shortened to KEEP_GAP.
 * Works on 16-bit mono PCM samples; returns new samples.
 */
export const FRAME = 0.02; // seconds per loudness frame
export const LONG_GAP = 0.6; // a pause this long or longer is not natural in a short line
export const KEEP_GAP = 0.35; // …so it is shortened to this
const JOIN_GAP = 0.25; // sounds closer than this are one utterance (a "kh" burst and its vowel)
const STRAY_GAP = 0.45; // after a lone letter, a gap this long means what follows is a stray
const MIN_SOUND = 0.12; // a first "sound" shorter than this is a click or breath, not the letter

/** How many letters' worth a line is (vowel signs and the virama don't count). */
export function letterCount(text) {
  return [...text].filter((ch) => /[\p{L}\p{N}]/u.test(ch) && !/\p{M}/u.test(ch)).length;
}

/** Speech stretches as [startSample, endSample) pairs, from frame loudness. */
export function soundRuns(pcm, rate) {
  const n = Math.max(1, Math.round(FRAME * rate));
  const db = [];
  for (let i = 0; i + n <= pcm.length; i += n) {
    let s = 0;
    for (let k = i; k < i + n; k++) s += (pcm[k] / 32768) ** 2;
    db.push(10 * Math.log10(s / n + 1e-12));
  }
  if (!db.length) return [];
  const floor = Math.max(-50, Math.max(...db) - 35);
  const runs = [];
  let start = -1;
  db.forEach((v, f) => {
    if (v > floor && start < 0) start = f;
    if (v <= floor && start >= 0) {
      runs.push([start * n, f * n]);
      start = -1;
    }
  });
  if (start >= 0) runs.push([start * n, pcm.length]);
  // Join sounds separated by tiny gaps into one utterance.
  const joined = [];
  for (const r of runs) {
    const last = joined[joined.length - 1];
    if (last && r[0] - last[1] < JOIN_GAP * rate) last[1] = r[1];
    else joined.push([...r]);
  }
  return joined;
}

export function tidySpeech(pcm, rate, text) {
  let runs = soundRuns(pcm, rate);
  if (!runs.length) return pcm;
  // A lone letter: keep the first real utterance, drop strays after a long gap.
  if (letterCount(text) <= 2) {
    const first = runs.findIndex(([a, b]) => b - a >= MIN_SOUND * rate);
    if (first >= 0) {
      let end = first;
      while (end + 1 < runs.length && runs[end + 1][0] - runs[end][1] < STRAY_GAP * rate) end++;
      runs = runs.slice(first, end + 1);
    }
  }
  // Rebuild: every sound, with long pauses shortened. A short lead-in and tail are kept.
  const lead = Math.min(runs[0][0], Math.round(0.03 * rate));
  const tail = Math.min(pcm.length - runs[runs.length - 1][1], Math.round(0.12 * rate));
  const pieces = [pcm.subarray(runs[0][0] - lead, runs[0][0])];
  runs.forEach(([a, b], k) => {
    pieces.push(pcm.subarray(a, b));
    if (k + 1 < runs.length) {
      const gap = runs[k + 1][0] - b;
      pieces.push(gap >= LONG_GAP * rate ? new Int16Array(Math.round(KEEP_GAP * rate)) : pcm.subarray(b, runs[k + 1][0]));
    }
  });
  const end = runs[runs.length - 1][1];
  pieces.push(pcm.subarray(end, end + tail));
  const out = new Int16Array(pieces.reduce((s, p) => s + p.length, 0));
  let o = 0;
  for (const p of pieces) {
    out.set(p, o);
    o += p.length;
  }
  return out;
}
