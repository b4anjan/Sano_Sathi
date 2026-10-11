import { signal, effect } from '@preact/signals';
import type { PieceType } from './pieces';

/**
 * Everything Chess remembers on this device: the game in progress for each mode (as PGN,
 * so "take back" still works after a reload), the buddy level, which side the child plays,
 * the switches, lesson stars and which buddy levels the child has beaten.
 */
export type ChessMode = 'buddy' | 'two' | 'learn';
export interface ChessSaved {
  mode: ChessMode;
  level: number;
  youAre: 'w' | 'b';
  pgnBuddy: string;
  pgnTwo: string;
  /** "Warn me": point out a move that leaves a piece where it can simply be taken. */
  teach: boolean;
  /** Show the board from black's side. */
  flip: boolean;
  /** Two players at a flat tablet: black's pieces face the far side. */
  face: boolean;
  /** Best stars (0–3) per stage, per piece. */
  lessons: Partial<Record<PieceType, number[]>>;
  beaten: number[];
  seenRules: boolean;
}

const KEY = 'sanosathi.chess.v1';
const DEFAULTS: ChessSaved = {
  mode: 'buddy',
  level: 1,
  youAre: 'w',
  pgnBuddy: '',
  pgnTwo: '',
  teach: true,
  flip: false,
  face: false,
  lessons: {},
  beaten: [],
  seenRules: false,
};

function load(): ChessSaved {
  try {
    const p = JSON.parse(localStorage.getItem(KEY) ?? 'null');
    if (!p || typeof p !== 'object') return DEFAULTS;
    const s = { ...DEFAULTS, ...p } as ChessSaved;
    s.level = Math.max(1, Math.min(5, Number(s.level) || 1));
    if (!['buddy', 'two', 'learn'].includes(s.mode)) s.mode = 'buddy';
    if (s.youAre !== 'b') s.youAre = 'w';
    return s;
  } catch {
    return DEFAULTS;
  }
}

export const chess = signal<ChessSaved>(load());
export const setChess = (patch: Partial<ChessSaved>) => (chess.value = { ...chess.value, ...patch });

effect(() => {
  const v = chess.value;
  try {
    localStorage.setItem(KEY, JSON.stringify(v));
  } catch {
    /* private mode: remembered for this visit only */
  }
});
