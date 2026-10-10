/**
 * AI voices made by scripts/generate-voices.mjs: src/audio/ai/<buddy>/<lang>/<key>.mp3,
 * keyed "<buddy>/<lang>/<key>". Each buddy has its own voice for every line.
 * (The one-file prototype build swaps this for aiClips.empty.ts to stay small.)
 */
const files = import.meta.glob('../audio/ai/*/*/*.mp3', { eager: true, query: '?url', import: 'default' }) as Record<string, string>;

export const aiClips: Record<string, string> = {};
for (const [path, url] of Object.entries(files)) {
  const m = path.match(/audio\/ai\/([^/]+)\/(en|ne)\/(.+)\.mp3$/);
  if (m) aiClips[`${m[1]}/${m[2]}/${m[3]}`] = url;
}
