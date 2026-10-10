import { signal } from '@preact/signals';
import { extFor, typeFor } from './clipProcess';

/**
 * Recordings made in the Voice Studio, kept in this browser (IndexedDB) on this device.
 *
 * They override the clips bundled with the app, so a family's own voice is used the
 * moment it is recorded. Nothing is uploaded. "Download" packs them into a zip, which is
 * both a backup and the way recordings get built into the app for every device
 * (see the README: "Voices: from the studio to the app").
 *
 * Audio is stored as an ArrayBuffer plus its MIME type rather than a Blob, because some
 * older iOS versions could not store Blobs in IndexedDB reliably.
 */
export interface Recording {
  key: string; // e.g. 'ne/gai', 'en/_where', 'ne/letter-क'
  data: ArrayBuffer;
  type: string;
  ms: number;
  at: number;
}

const DB_NAME = 'sanosathi-voice';
const STORE = 'clips';

let dbp: Promise<IDBDatabase> | null = null;

function db(): Promise<IDBDatabase> {
  if (!dbp) {
    dbp = new Promise<IDBDatabase>((resolve, reject) => {
      if (typeof indexedDB === 'undefined') return reject(new Error('This browser cannot store recordings.'));
      const req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = () => req.result.createObjectStore(STORE, { keyPath: 'key' });
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error ?? new Error('Could not open storage.'));
      req.onblocked = () => reject(new Error('Storage is busy in another tab. Close other tabs of the app and try again.'));
    });
    dbp.catch(() => (dbp = null)); // let the next call retry
  }
  return dbp;
}

function run<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T> | void): Promise<T> {
  return db().then(
    (d) =>
      new Promise<T>((resolve, reject) => {
        const t = d.transaction(STORE, mode);
        const req = fn(t.objectStore(STORE));
        t.oncomplete = () => resolve(req ? req.result : (undefined as T));
        t.onerror = () => reject(t.error ?? new Error('Storage error.'));
        t.onabort = () => reject(t.error ?? new Error('Storage was full or blocked.'));
      }),
  );
}

// ---- in-memory playable URLs, one per key -------------------------------------------

const urls = new Map<string, string>();
/** Keys recorded on this device. Read it in a component to re-render when recordings change. */
export const localKeys = signal<ReadonlySet<string>>(new Set());

function setUrl(key: string, data: ArrayBuffer, type: string): void {
  const old = urls.get(key);
  if (old) URL.revokeObjectURL(old);
  urls.set(key, URL.createObjectURL(new Blob([data], { type })));
}
function dropUrl(key: string): void {
  const old = urls.get(key);
  if (old) URL.revokeObjectURL(old);
  urls.delete(key);
}
function publish(): void {
  localKeys.value = new Set(urls.keys());
}

export function localUrl(key: string): string | undefined {
  return urls.get(key);
}

/** Load saved recordings at start-up. Failure is silent: the app still works with bundled clips. */
export async function loadRecordings(): Promise<void> {
  try {
    const all = await run<Recording[]>('readonly', (s) => s.getAll() as IDBRequest<Recording[]>);
    for (const r of all) setUrl(r.key, r.data, r.type);
  } catch {
    /* no storage (private mode, old browser): nothing to load */
  }
  publish();
}

let askedPersist = false;
/** Ask the browser not to clear our storage under pressure. Browsers may still say no. */
function persist(): void {
  if (askedPersist) return;
  askedPersist = true;
  try {
    void navigator.storage?.persist?.();
  } catch {
    /* ignore */
  }
}

export async function saveRecording(key: string, data: ArrayBuffer, type: string, ms: number): Promise<void> {
  const rec: Recording = { key, data, type, ms, at: Date.now() };
  await run('readwrite', (s) => s.put(rec));
  setUrl(key, data, type);
  publish();
  persist();
}

export async function deleteRecording(key: string): Promise<void> {
  await run('readwrite', (s) => s.delete(key));
  dropUrl(key);
  publish();
}

export async function deleteAllRecordings(): Promise<void> {
  await run('readwrite', (s) => s.clear());
  for (const k of [...urls.keys()]) dropUrl(k);
  publish();
}

export function allRecordings(): Promise<Recording[]> {
  return run<Recording[]>('readonly', (s) => s.getAll() as IDBRequest<Recording[]>);
}

// ---- zip export / import -------------------------------------------------------------

const KEY_RE = /^(en|ne)\/([^/]+)$/;

/**
 * Pack every recording into a zip: en/<key>.wav, ne/<key>.wav and manifest.json.
 * Audio is stored, not re-compressed (it would not shrink), so zipping is instant.
 */
export async function exportZip(meta: Record<string, unknown>): Promise<Blob> {
  const { zipSync, strToU8 } = await import('fflate');
  const recs = await allRecordings();
  const files: Record<string, [Uint8Array, { level: 0 }] | Uint8Array> = {};
  for (const r of recs) files[`${r.key}.${extFor(r.type)}`] = [new Uint8Array(r.data), { level: 0 }];
  files['manifest.json'] = strToU8(
    JSON.stringify(
      { ...meta, exportedAt: new Date().toISOString(), clips: recs.map((r) => ({ key: r.key, type: r.type, ms: r.ms, recordedAt: new Date(r.at).toISOString() })) },
      null,
      2,
    ),
  );
  return new Blob([zipSync(files)], { type: 'application/zip' });
}

/** Load a zip made by exportZip (for example from another phone). Returns how many clips were added. */
export async function importZip(file: Blob): Promise<number> {
  const { unzipSync } = await import('fflate');
  const all = unzipSync(new Uint8Array(await file.arrayBuffer()));
  let n = 0;
  for (const [name, bytes] of Object.entries(all)) {
    const m = name.match(/(?:^|\/)((?:en|ne)\/[^/]+)\.(wav|m4a|mp4|ogg|mp3|webm)$/i);
    if (!m || !KEY_RE.test(m[1]) || bytes.length < 64) continue;
    const data = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
    await saveRecording(m[1], data, typeFor(m[2]), 0);
    n++;
  }
  return n;
}
