/// <reference lib="webworker" />
import { bestMove, pickMove } from './ai';

/** Runs the buddy's thinking off the main thread, so the screen never freezes. */
self.onmessage = (e: MessageEvent) => {
  const { id, kind, fen, level, history } = e.data as { id: number; kind: 'pick' | 'best'; fen: string; level: number; history: string[] };
  let choice = null;
  try {
    choice = kind === 'best' ? bestMove(fen, history) : pickMove(fen, level, Math.random, history);
  } catch {
    choice = null;
  }
  (self as unknown as { postMessage: (m: unknown) => void }).postMessage({ id, choice });
};
