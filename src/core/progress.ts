/**
 * Learning progress, per item and per language, kept on this device.
 * A child can know "cow" in English and not yet "गाई" in Nepali; the two are tracked apart.
 * This is the first piece of the learning engine; spaced review builds on these counts.
 */
export type ProgressLang = 'en' | 'ne';
interface Stat {
  seen: number;
  right: number;
}
const KEY = 'sanosathi.progress.v1';
let data: Record<string, Stat> = {};
try {
  data = JSON.parse(localStorage.getItem(KEY) || '{}') || {};
} catch {
  data = {};
}
function persist(): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(data));
  } catch {
    /* storage unavailable */
  }
}

export function record(id: string, langs: ProgressLang[], firstTry: boolean): void {
  for (const l of langs) {
    const k = `${l}:${id}`;
    const s = data[k] || { seen: 0, right: 0 };
    s.seen++;
    if (firstTry) s.right++;
    data[k] = s;
  }
  persist();
}

export function stat(id: string, l: ProgressLang): Stat {
  return data[`${l}:${id}`] || { seen: 0, right: 0 };
}

/** Items a child gets right first time often are "known"; we show them less. */
export function weight(id: string, langs: ProgressLang[]): number {
  const right = Math.min(...langs.map((l) => stat(id, l).right));
  return 1 / (1 + right) + 0.15;
}

export function pickWeighted<T extends { id: string }>(pool: T[], langs: ProgressLang[], avoidId?: string, rand = Math.random): T {
  const choices = pool.length > 1 ? pool.filter((p) => p.id !== avoidId) : pool;
  const ws = choices.map((c) => weight(c.id, langs));
  const total = ws.reduce((a, b) => a + b, 0);
  let r = rand() * total;
  for (let i = 0; i < choices.length; i++) {
    r -= ws[i];
    if (r <= 0) return choices[i];
  }
  return choices[choices.length - 1];
}

export function shuffle<T>(arr: T[], rand = Math.random): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function knownCount(ids: string[], l: ProgressLang): number {
  return ids.filter((id) => stat(id, l).right >= 2).length;
}
