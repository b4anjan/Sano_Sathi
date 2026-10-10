import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { screen } from '../../core/nav';
import { localKeys, saveRecording, deleteRecording, deleteAllRecordings, exportZip, importZip } from '../../core/recordings';
import { isBundled, playKey, stopSpeech } from '../../core/voice';
import { findSpeech, shapeClip, downmix, encodeWav } from '../../core/clipProcess';
import { scriptFor, GROUPS, type Line, type RecLang } from '../../content/script';
import { ItemArt, Seg } from '../../ui/common';
import { BRAND } from '../../brand';

/**
 * Voice Studio (grown-ups): record every word and sentence the games say, one at a time.
 *
 * Each take is decoded, trimmed to the spoken part, levelled and saved on this device as
 * a small WAV, then played back once. The games use it immediately. "Download" exports a
 * zip, which is a backup and the way recordings are built into the app for every device.
 *
 * Keys: R record / stop · P play · ← → previous / next.
 */

type Phase = 'idle' | 'starting' | 'rec' | 'saving';
type Msg = { kind: 'error' | 'ok' | 'info'; text: string } | null;

interface Take {
  mr: MediaRecorder;
  raf: number;
  timer: number;
  heard: boolean;
  loud: number;
  quietSince: number;
}

const OUT_RATE = 24000; // plenty for speech, half the size of 48 kHz
const MAX_MS = 8000;
const QUIET_MS = 1100; // stop this long after the voice ends (a comma pause is shorter)
const MIMES = ['audio/mp4', 'audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus'];

type ACtor = typeof AudioContext;
type OACtor = typeof OfflineAudioContext;
const win = window as unknown as { webkitAudioContext?: ACtor; webkitOfflineAudioContext?: OACtor };

function pickMime(): string {
  if (typeof MediaRecorder === 'undefined' || typeof MediaRecorder.isTypeSupported !== 'function') return '';
  return (
    MIMES.find((m) => {
      try {
        return MediaRecorder.isTypeSupported(m);
      } catch {
        return false;
      }
    }) ?? ''
  );
}

function supportProblem(): string | null {
  if (!window.isSecureContext) return `Recording needs the secure address. Open ${BRAND.siteUrl} and try again.`;
  if (!navigator.mediaDevices?.getUserMedia) return 'This browser cannot use the microphone. Use Safari on iPhone or iPad, or Chrome or Edge on Android or a computer.';
  if (typeof MediaRecorder === 'undefined') return 'This browser cannot record audio. Update it (iPhone and iPad need iOS 14.3 or newer), or try Chrome.';
  return null;
}

function micError(e: unknown): string {
  const name = (e as { name?: string } | null)?.name ?? '';
  if (name === 'NotAllowedError' || name === 'SecurityError')
    return `The microphone is blocked. Allow it for this site (tap the icon beside the address, or on iPhone: Settings › Safari › Microphone), then press Record again. Preview windows always block the microphone: open ${BRAND.siteUrl} on its own.`;
  if (name === 'NotFoundError' || name === 'OverconstrainedError') return 'No microphone was found. Plug one in, or record on a phone or tablet.';
  if (name === 'NotReadableError' || name === 'AbortError') return 'The microphone is busy (a call, or another app or tab is using it). Close that and try again.';
  return 'The microphone could not start. Reload the page and try again.';
}

function decode(ac: BaseAudioContext, data: ArrayBuffer): Promise<AudioBuffer> {
  return new Promise((resolve, reject) => {
    try {
      // Callback form for older Safari; the promise form for everything else.
      const p = ac.decodeAudioData(data, resolve, reject) as Promise<AudioBuffer> | undefined;
      p?.then(resolve, reject);
    } catch (e) {
      reject(e);
    }
  });
}

async function resample(x: Float32Array, from: number, to: number): Promise<Float32Array> {
  if (from === to) return x;
  const OAC = window.OfflineAudioContext || win.webkitOfflineAudioContext;
  if (!OAC) throw new Error('no offline audio');
  const oc = new OAC(1, Math.ceil((x.length * to) / from), to);
  const b = oc.createBuffer(1, x.length, from);
  b.getChannelData(0).set(x);
  const src = oc.createBufferSource();
  src.buffer = b;
  src.connect(oc.destination);
  src.start(0);
  const out = await new Promise<AudioBuffer>((resolve, reject) => {
    oc.oncomplete = (e) => resolve(e.renderedBuffer);
    const p = oc.startRendering() as Promise<AudioBuffer> | undefined;
    p?.then(resolve, reject);
  });
  return out.getChannelData(0).slice();
}

const fileName = () => `${BRAND.appName.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-voices-${new Date().toISOString().slice(0, 10)}.zip`;

/** Short label for the list chips. */
function chipText(l: Line): string {
  if (l.group === 'letters') return l.key.replace(/^letter-/, '');
  return l.text;
}

export function Studio() {
  const [rl, setRl] = useState<RecLang>('ne');
  const [pos, setPos] = useState(0);
  const [phase, setPhase] = useState<Phase>('idle');
  const [msg, setMsg] = useState<Msg>(null);
  const [autoNext, setAutoNext] = useState(false);
  const [confirmAll, setConfirmAll] = useState(false);
  const [working, setWorking] = useState(false);
  const meterRef = useRef<HTMLSpanElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const acRef = useRef<AudioContext | null>(null);
  const takeRef = useRef<Take | null>(null);
  const backRef = useRef<AudioBufferSourceNode | null>(null);
  const shareFile = useRef<File | null>(null);
  const alive = useRef(true);
  const timers = useRef<number[]>([]);

  const script = useMemo(() => scriptFor(rl), [rl]);
  const line = script[Math.min(pos, script.length - 1)];
  const keyOf = (x: Line) => `${rl}/${x.key}`;
  const mine = localKeys.value;
  const state = (x: Line): 'mine' | 'built' | 'none' => (mine.has(keyOf(x)) ? 'mine' : isBundled(keyOf(x)) ? 'built' : 'none');
  const groupLines = script.filter((x) => x.group === line.group);
  const myCount = script.filter((x) => mine.has(keyOf(x))).length;
  const allMine = mine.size;

  const canShare = useMemo(() => {
    try {
      return !!navigator.canShare?.({ files: [new File(['x'], 'test.zip', { type: 'application/zip' })] });
    } catch {
      return false;
    }
  }, []);

  useEffect(() => {
    alive.current = true;
    stopSpeech();
    return () => {
      alive.current = false;
      timers.current.forEach((t) => window.clearTimeout(t));
      stopTake();
      stopBack();
      void acRef.current?.close().catch(() => undefined);
    };
  }, []);

  // ---- audio plumbing ---------------------------------------------------------------

  const ctx = (): AudioContext | null => {
    try {
      if (!acRef.current) {
        const AC = window.AudioContext || win.webkitAudioContext;
        if (!AC) return null;
        acRef.current = new AC();
      }
      if (acRef.current.state === 'suspended') void acRef.current.resume();
      return acRef.current;
    } catch {
      return null;
    }
  };

  const stopBack = () => {
    try {
      backRef.current?.stop();
    } catch {
      /* already stopped */
    }
    backRef.current = null;
  };

  function stopTake(): void {
    const t = takeRef.current;
    if (!t) return;
    cancelAnimationFrame(t.raf);
    window.clearTimeout(t.timer);
    if (t.mr.state !== 'inactive') {
      try {
        t.mr.stop();
      } catch {
        /* ignore */
      }
    }
  }

  const go = (i: number) => {
    if (phase !== 'idle') return;
    stopBack();
    stopSpeech();
    setConfirmAll(false);
    setMsg(null);
    setPos(Math.max(0, Math.min(script.length - 1, i)));
  };
  const nextMissing = (from = pos) => {
    for (let k = 1; k <= script.length; k++) {
      const j = (from + k) % script.length;
      if (state(script[j]) === 'none') return j;
    }
    return -1;
  };

  const record = async () => {
    if (phase === 'rec') return stopTake();
    if (phase !== 'idle') return;
    stopSpeech();
    stopBack();
    setMsg(null);
    setConfirmAll(false);
    const problem = supportProblem();
    if (problem) return setMsg({ kind: 'error', text: problem });
    const ac = ctx(); // created inside the tap, so iPhone allows it to play the take back
    const key = keyOf(line);
    setPhase('starting');

    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } });
    } catch (e) {
      setPhase('idle');
      setMsg({ kind: 'error', text: micError(e) });
      return;
    }
    if (!alive.current) return stream.getTracks().forEach((t) => t.stop());

    const mime = pickMime();
    let mr: MediaRecorder;
    try {
      mr = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream);
    } catch {
      try {
        mr = new MediaRecorder(stream);
      } catch {
        stream.getTracks().forEach((t) => t.stop());
        setPhase('idle');
        setMsg({ kind: 'error', text: 'This browser cannot record audio.' });
        return;
      }
    }

    // Level meter + automatic stop, from an analyser on the same microphone stream.
    let src: MediaStreamAudioSourceNode | null = null;
    let an: AnalyserNode | null = null;
    if (ac) {
      try {
        src = ac.createMediaStreamSource(stream);
        an = ac.createAnalyser();
        an.fftSize = 1024;
        src.connect(an);
      } catch {
        src = an = null;
      }
    }

    const chunks: Blob[] = [];
    const t: Take = { mr, raf: 0, timer: 0, heard: false, loud: 0, quietSince: 0 };
    takeRef.current = t;
    mr.ondataavailable = (e) => {
      if (e.data && e.data.size) chunks.push(e.data);
    };
    mr.onstop = () => {
      // Release the microphone between takes: on iPhone an open mic makes playback quiet.
      try {
        src?.disconnect();
      } catch {
        /* ignore */
      }
      stream.getTracks().forEach((x) => x.stop());
      takeRef.current = null;
      if (meterRef.current) meterRef.current.style.transform = 'scaleX(0)';
      if (alive.current) void finish(new Blob(chunks, { type: mr.mimeType || mime || 'audio/webm' }), key);
    };

    const bytes = an ? new Uint8Array(an.fftSize) : null;
    const tick = () => {
      if (an && bytes) {
        an.getByteTimeDomainData(bytes);
        let sum = 0;
        for (let i = 0; i < bytes.length; i++) {
          const v = (bytes[i] - 128) / 128;
          sum += v * v;
        }
        const rms = Math.sqrt(sum / bytes.length);
        if (meterRef.current) meterRef.current.style.transform = `scaleX(${Math.min(1, rms * 7).toFixed(3)})`;
        t.loud = Math.max(t.loud, rms);
        if (rms > 0.04) t.heard = true;
        const quiet = rms < Math.max(0.015, t.loud * 0.15);
        const now = performance.now();
        if (!t.heard || !quiet) t.quietSince = 0;
        else if (!t.quietSince) t.quietSince = now;
        else if (now - t.quietSince > QUIET_MS) return stopTake();
      }
      t.raf = requestAnimationFrame(tick);
    };

    try {
      mr.start();
    } catch {
      stream.getTracks().forEach((x) => x.stop());
      takeRef.current = null;
      setPhase('idle');
      setMsg({ kind: 'error', text: 'Recording could not start. Reload the page and try again.' });
      return;
    }
    setPhase('rec');
    t.timer = window.setTimeout(stopTake, MAX_MS);
    t.raf = requestAnimationFrame(tick);
  };

  const finish = async (blob: Blob, key: string) => {
    setPhase('saving');
    const ac = acRef.current;
    let raw: ArrayBuffer;
    try {
      raw = await blob.arrayBuffer();
    } catch {
      setPhase('idle');
      setMsg({ kind: 'error', text: 'The recording was empty. Please try again.' });
      return;
    }

    // Trim, level and convert. If this browser cannot decode its own recording, keep the original.
    let out: { data: ArrayBuffer; type: string; ms: number; samples?: Float32Array; rate?: number } = { data: raw, type: blob.type || 'audio/webm', ms: 0 };
    if (ac && raw.byteLength) {
      try {
        const dec = await decode(ac, raw.slice(0));
        const mono = downmix(Array.from({ length: dec.numberOfChannels }, (_, i) => dec.getChannelData(i)));
        const range = findSpeech(mono, dec.sampleRate);
        if (!range.heard) {
          setPhase('idle');
          setMsg({ kind: 'error', text: "I couldn't hear anything. Hold the phone about a hand's width away and speak up a little." });
          return;
        }
        let x = shapeClip(mono, dec.sampleRate, range);
        let rate = dec.sampleRate;
        try {
          x = await resample(x, rate, OUT_RATE);
          rate = OUT_RATE;
        } catch {
          /* keep the original rate */
        }
        out = { data: encodeWav(x, rate), type: 'audio/wav', ms: Math.round((x.length / rate) * 1000), samples: x, rate };
      } catch {
        /* keep the original recording */
      }
    }

    try {
      await saveRecording(key, out.data, out.type, out.ms);
    } catch {
      if (!alive.current) return;
      setPhase('idle');
      setMsg({ kind: 'error', text: 'Could not save. The device may be out of space, or this is a private window (private windows cannot keep recordings).' });
      return;
    }
    if (!alive.current) return;
    setPhase('idle');
    setMsg({ kind: 'ok', text: autoNext ? 'Saved. Moving to the next one…' : 'Saved. Listen, then go to the next one (or record again).' });

    // Play the take back once, through the audio context unlocked by the Record tap.
    let playMs = 1200;
    if (ac && out.samples && out.rate) {
      try {
        const b = ac.createBuffer(1, out.samples.length, out.rate);
        b.getChannelData(0).set(out.samples);
        const s = ac.createBufferSource();
        s.buffer = b;
        s.connect(ac.destination);
        s.start();
        backRef.current = s;
        playMs = out.ms;
      } catch {
        void playKey(key);
      }
    } else void playKey(key);

    if (autoNext) {
      timers.current.push(
        window.setTimeout(() => {
          if (!alive.current) return;
          const j = nextMissingAfter(key);
          if (j >= 0) setPos(j);
          setMsg(j >= 0 ? null : { kind: 'ok', text: 'Everything in this list is recorded. Wonderful!' });
        }, playMs + 500),
      );
    }
  };

  // After saving, "next missing" must ignore the clip just saved even before the signal re-renders.
  const nextMissingAfter = (savedKey: string) => {
    const i = script.findIndex((x) => keyOf(x) === savedKey);
    for (let k = 1; k <= script.length; k++) {
      const j = (i + k) % script.length;
      const x = script[j];
      if (keyOf(x) !== savedKey && !localKeys.value.has(keyOf(x)) && !isBundled(keyOf(x))) return j;
    }
    return -1;
  };

  const play = () => {
    stopBack();
    void playKey(keyOf(line)).then((ok) => {
      if (!ok) setMsg({ kind: 'info', text: 'Nothing recorded for this one yet.' });
    });
  };

  const removeOne = async () => {
    try {
      await deleteRecording(keyOf(line));
      setMsg({ kind: 'info', text: 'Deleted from this device.' });
    } catch {
      setMsg({ kind: 'error', text: 'Could not delete. Reload the page and try again.' });
    }
  };

  const removeAll = async () => {
    try {
      await deleteAllRecordings();
      setConfirmAll(false);
      setMsg({ kind: 'info', text: 'All recordings on this device were deleted.' });
    } catch {
      setMsg({ kind: 'error', text: 'Could not delete. Reload the page and try again.' });
    }
  };

  const makeZip = async () => {
    const blob = await exportZip({ app: BRAND.appName, version: BRAND.version, userAgent: navigator.userAgent });
    return new File([blob], fileName(), { type: 'application/zip' });
  };

  const download = async () => {
    setWorking(true);
    try {
      const f = await makeZip();
      const url = URL.createObjectURL(f);
      const a = document.createElement('a');
      a.href = url;
      a.download = f.name;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 60000);
      setMsg({ kind: 'ok', text: `Downloaded ${f.name} (${allMine} recordings, ${(f.size / 1048576).toFixed(1)} MB).` });
    } catch {
      setMsg({ kind: 'error', text: 'Could not make the download. Please try again.' });
    } finally {
      setWorking(false);
    }
  };

  const share = async () => {
    setWorking(true);
    try {
      const f = shareFile.current ?? (await makeZip());
      shareFile.current = f;
      await navigator.share({ files: [f], title: `${BRAND.appName} voices` });
      shareFile.current = null;
      setMsg({ kind: 'ok', text: 'Shared.' });
    } catch (e) {
      const name = (e as { name?: string } | null)?.name;
      if (name === 'AbortError') shareFile.current = null;
      else if (name === 'NotAllowedError') setMsg({ kind: 'info', text: 'The file is ready. Tap Share once more.' });
      else setMsg({ kind: 'error', text: 'Sharing did not work here. Use Download instead.' });
    } finally {
      setWorking(false);
    }
  };

  const onImport = async (e: Event) => {
    const input = e.currentTarget as HTMLInputElement;
    const f = input.files?.[0];
    input.value = '';
    if (!f) return;
    setWorking(true);
    try {
      const n = await importZip(f);
      setMsg(n ? { kind: 'ok', text: `Loaded ${n} recordings from ${f.name}.` } : { kind: 'error', text: 'No recordings found in that file. Pick a zip made by Download.' });
    } catch {
      setMsg({ kind: 'error', text: 'That file could not be read. Pick a zip made by Download.' });
    } finally {
      setWorking(false);
    }
  };

  // Keyboard shortcuts for recording at a computer (latest handler via a ref).
  const keyRef = useRef<(e: KeyboardEvent) => void>(() => undefined);
  useEffect(() => {
    const h = (e: KeyboardEvent) => keyRef.current(e);
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, []);
  {
    keyRef.current = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || e.metaKey || e.ctrlKey || e.altKey || document.querySelector('.panel')) return;
      const k = e.key.toLowerCase();
      if (k === 'r') {
        e.preventDefault();
        void record();
      } else if (k === 'p' && phase === 'idle') play();
      else if (e.key === 'ArrowRight') go(pos + 1);
      else if (e.key === 'ArrowLeft') go(pos - 1);
    };
  }

  const st = state(line);
  const recLabel = phase === 'starting' ? 'Starting…' : phase === 'rec' ? 'Stop' : phase === 'saving' ? 'Saving…' : st === 'none' ? 'Record' : 'Record again';
  const busy = phase !== 'idle';

  return (
    <section class="screen studio" aria-label="Voice studio">
      <div class="st-card">
        <div class="st-head">
          <h2>
            Voice studio<span class="st-ne-title"> · <span lang="ne">आवाज स्टुडियो</span></span>
          </h2>
          <button type="button" class="p-btn ghost" disabled={busy} onClick={() => (screen.value = 'home')}>
            Done
          </button>
        </div>
        <p class="p-small st-intro">
          Record each word the way you say it to your child. Your voice replaces the computer voice in every game straight away.
        </p>

        <div class="st-bar">
          <Seg<RecLang>
            label="Recording language"
            value={rl}
            onPick={(l) => {
              if (busy) return;
              setRl(l);
              setPos(0);
              setMsg(null);
            }}
            options={[
              { v: 'ne', label: <span><span lang="ne">नेपाली</span> voice</span> },
              { v: 'en', label: 'English voice' },
            ]}
          />
          <span class="st-count">
            {myCount} of {script.length} recorded here
          </span>
        </div>

        <div class="seg st-groups" role="group" aria-label="Part of the script">
          {GROUPS.map((g) => {
            const ls = script.filter((x) => x.group === g.id);
            const done = ls.filter((x) => state(x) !== 'none').length;
            const first = script.findIndex((x) => x.group === g.id && state(x) === 'none');
            return (
              <button
                key={g.id}
                type="button"
                aria-pressed={line.group === g.id}
                disabled={busy}
                onClick={() => go(first >= 0 ? first : script.findIndex((x) => x.group === g.id))}
              >
                {g.en} <span lang="ne">{g.ne}</span> <span class="n">{done}/{ls.length}</span>
              </button>
            );
          })}
        </div>

        <div class={`st-stage${phase === 'rec' ? ' live' : ''}`}>
          <div class="st-prompt">
            {line.art && <ItemArt id={line.art} class="st-art" />}
            <div class="st-text" lang={rl}>
              {line.text}
            </div>
            {line.hint && <div class="st-hint">{line.hint}</div>}
            <div class={`st-state ${st}`}>
              {st === 'mine' ? '✓ Your recording is in use' : st === 'built' ? '★ Built into the app (recording here replaces it on this device)' : 'Not recorded yet'}
            </div>
          </div>

          <div class="st-meter" aria-hidden="true">
            <span ref={meterRef} />
          </div>

          <div class="st-controls">
            <button type="button" class="st-nav" disabled={busy || pos === 0} onClick={() => go(pos - 1)} aria-label="Previous">
              ‹
            </button>
            <button type="button" class={`st-rec ${phase}`} onClick={() => void record()} disabled={phase === 'starting' || phase === 'saving'}>
              <span class="dot" aria-hidden="true" />
              {recLabel}
            </button>
            <button type="button" class="st-nav" disabled={busy || pos >= script.length - 1} onClick={() => go(pos + 1)} aria-label="Next">
              ›
            </button>
          </div>
          <p class="st-live" role="status">
            {phase === 'rec' ? 'Listening… say it once. It stops by itself when you finish.' : phase === 'starting' ? 'Getting the microphone ready…' : ''}
          </p>

          <div class="st-sub">
            <button type="button" class="p-btn ghost" disabled={busy || st === 'none'} onClick={play}>
              ▶ Play
            </button>
            {st === 'mine' && (
              <button type="button" class="p-btn ghost" disabled={busy} onClick={() => void removeOne()}>
                Delete this one
              </button>
            )}
            <button
              type="button"
              class="p-btn ghost"
              disabled={busy || nextMissing() < 0}
              onClick={() => {
                const j = nextMissing();
                if (j >= 0) go(j);
              }}
            >
              Next not recorded ›
            </button>
            <label class="st-auto">
              <input type="checkbox" checked={autoNext} onChange={(e) => setAutoNext((e.target as HTMLInputElement).checked)} />
              Go on automatically
            </label>
          </div>
          {msg && (
            <p class={`st-msg ${msg.kind}`} role={msg.kind === 'error' ? 'alert' : 'status'}>
              {msg.text}
            </p>
          )}
        </div>

        <div class="st-list" role="list" aria-label="All lines in this part">
          {groupLines.map((x) => {
            const i = script.indexOf(x);
            return (
              <button
                key={x.key}
                type="button"
                role="listitem"
                class={`st-chip ${state(x)}${i === pos ? ' here' : ''}`}
                lang={rl}
                disabled={busy}
                onClick={() => go(i)}
                title={x.text}
              >
                {chipText(x)}
              </button>
            );
          })}
        </div>

        <div class="p-sep" />
        <div class="st-foot">
          <div class="st-actions">
            <button type="button" class="p-btn" disabled={busy || working || allMine === 0} onClick={() => void download()}>
              Download all ({allMine})
            </button>
            {canShare && (
              <button type="button" class="p-btn ghost" disabled={busy || working || allMine === 0} onClick={() => void share()}>
                Share…
              </button>
            )}
            <button type="button" class="p-btn ghost" disabled={busy || working} onClick={() => fileRef.current?.click()}>
              Load a zip
            </button>
            <input ref={fileRef} type="file" accept=".zip,application/zip" hidden onChange={(e) => void onImport(e)} />
            {!confirmAll ? (
              <button type="button" class="p-btn ghost danger" disabled={busy || working || allMine === 0} onClick={() => setConfirmAll(true)}>
                Delete all
              </button>
            ) : (
              <span class="st-confirm">
                Delete all {allMine} recordings on this device?
                <button type="button" class="p-btn danger" onClick={() => void removeAll()}>
                  Delete
                </button>
                <button type="button" class="p-btn ghost" onClick={() => setConfirmAll(false)}>
                  Keep
                </button>
              </span>
            )}
          </div>
          <p class="p-small">
            <b>Tips:</b> a quiet room; phone about a hand's width from your mouth; say it once, warmly and clearly, the way you
            would to your child. Nepali first: those are the sounds no computer voice gets right.
          </p>
          <p class="p-small">
            <b>Where recordings live:</b> only in this browser on this device. Nothing is uploaded. Download a copy now and then:
            browsers can clear site data, and Safari may do so if the app is not opened for a few weeks. To build your voices into
            the app for every device, send the downloaded zip to whoever builds the app.
          </p>
        </div>
      </div>
    </section>
  );
}
