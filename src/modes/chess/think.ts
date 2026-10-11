import { bestMove, pickMove, type Choice } from './ai';
import AiWorker from './ai.worker?worker&inline';

/**
 * Ask the buddy for a move. Runs in a Web Worker when the browser allows it (so animations
 * and taps stay smooth while it thinks) and falls back to the main thread otherwise.
 */
interface Req {
  kind: 'pick' | 'best';
  fen: string;
  level: number;
  history: string[];
}

let worker: Worker | null | undefined;
let seq = 0;
const pending = new Map<number, { req: Req; done: (c: Choice | null) => void }>();

const local = (r: Req): Choice | null => (r.kind === 'best' ? bestMove(r.fen, r.history) : pickMove(r.fen, r.level, Math.random, r.history));

function getWorker(): Worker | null {
  if (worker !== undefined) return worker;
  try {
    worker = new AiWorker();
    worker.onmessage = (e: MessageEvent) => {
      const { id, choice } = e.data as { id: number; choice: Choice | null };
      const p = pending.get(id);
      pending.delete(id);
      p?.done(choice);
    };
    worker.onerror = () => {
      // Blocked or broken worker: finish what was asked here, and stop using it.
      worker?.terminate();
      worker = null;
      for (const [id, p] of pending) {
        pending.delete(id);
        p.done(local(p.req));
      }
    };
  } catch {
    worker = null;
  }
  return worker;
}

export function think(req: Req): Promise<Choice | null> {
  const w = getWorker();
  if (!w) return new Promise((r) => window.setTimeout(() => r(local(req)), 20));
  return new Promise((done) => {
    const id = ++seq;
    pending.set(id, { req, done });
    w.postMessage({ id, ...req });
  });
}
