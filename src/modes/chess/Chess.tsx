import { useEffect, useRef, useState } from 'preact/hooks';
import { Chess as Rules, type Move, type PieceSymbol, type Square } from 'chess.js';
import { unlockAudio, sfx, cheer, bloop } from '../../core/audio';
import { say, stopSpeech } from '../../core/voice';
import { award } from '../../core/rewards';
import { PHRASES, type Bi as BiText } from '../../content/strings';
import { CH, CL, LEVEL_NAMES, PIECE_NAMES, type ChLine } from '../../content/chess';
import { Bi, burst } from '../../ui/common';
import { Buddy } from '../../ui/Buddy';
import { SpeakerIcon } from '../letters/Letters';
import { Board, type CellView } from './Board';
import { pieceSVG, type PieceType, type Side } from './pieces';
import { VALUE } from './ai';
import { leavesHanging } from './teach';
import { think } from './think';
import { chess, setChess, type ChessMode } from './store';
import { biParts, sayLine, sayPiece } from './speak';
import { Lessons } from './Lessons';

/**
 * Chess: play the buddy (5 levels), two players on one device, or learn the pieces.
 * Tapping a piece lights up every square it can go to and says its name in both languages
 * (and, the first time in a game, how it moves). "Warn me" points out a move that leaves a
 * piece where it can simply be taken; "Help me" shows a good move; "Take back" undoes.
 */
export interface Status {
  t: BiText;
  small?: BiText;
}

const STARS_FOR_WIN = [0, 1, 1, 2, 2, 3];
const RULES: ChLine[] = ['rule1', 'rule2', 'rule3', 'rule4', 'rule5', 'rule6'];

function loadGame(pgn: string): Rules {
  const g = new Rules();
  if (pgn) {
    try {
      g.loadPgn(pgn);
    } catch {
      /* a damaged save: start fresh */
    }
  }
  return g;
}

function Rules6({ onClose }: { onClose: () => void }) {
  const all = () => {
    unlockAudio();
    void say(RULES.flatMap((k) => biParts(CH[k], `ch-${k}`)));
  };
  return (
    <div class="ch-over" role="dialog" aria-label="How to play chess" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div class="ch-card ch-rules">
        <h2>
          <Bi t={CL.howTo} />
        </h2>
        <ol>
          {RULES.map((k, i) => (
            <li key={k}>
              <button type="button" class="ch-rule" onClick={() => (unlockAudio(), sayLine(k))}>
                <b aria-hidden="true">{i + 1}</b>
                <SpeakerIcon />
                <Bi t={CH[k]} />
              </button>
            </li>
          ))}
        </ol>
        <div class="ch-card-btns">
          <button type="button" class="pill-btn" onClick={all}>
            <SpeakerIcon />
            <Bi t={CL.hearAll} />
          </button>
          <button type="button" class="pill-btn go" onClick={() => (stopSpeech(), onClose())}>
            <Bi t={CL.letsPlay} />
            <span aria-hidden="true">▶</span>
          </button>
        </div>
      </div>
    </div>
  );
}

function Game({ mode, setStatus }: { mode: 'buddy' | 'two'; setStatus: (s: Status) => void }) {
  const st = chess.value;
  const youAre: Side = st.youAre;
  const game = useRef<Rules>(loadGame(mode === 'buddy' ? st.pgnBuddy : st.pgnTwo));
  const [, setVer] = useState(0);
  const bump = () => setVer((v) => v + 1);
  const [selected, setSelected] = useState<string | null>(null);
  const [targets, setTargets] = useState<Map<string, 'move' | 'capture'>>(new Map());
  const [warn, setWarn] = useState<{ from: string; to: string } | null>(null);
  const [promo, setPromo] = useState<{ from: string; to: string } | null>(null);
  const [hint, setHint] = useState<[string, string] | null>(null);
  const [thinking, setThinking] = useState(false);
  const [arrive, setArrive] = useState<{ from: string; to: string; key: number } | null>(null);
  const token = useRef(0);
  const arriveKey = useRef(0);
  const spoken = useRef(new Set<PieceType>());
  const hostRef = useRef<HTMLDivElement>(null);
  const g = game.current;

  // Handlers read the live game and side (a new game replaces the object; a side switch
  // changes the setting before the next render).
  const me = (): Side => chess.value.youAre;
  const save = () => setChess(mode === 'buddy' ? { pgnBuddy: game.current.pgn() } : { pgnTwo: game.current.pgn() });
  const clearMarks = () => {
    setSelected(null);
    setTargets(new Map());
    setWarn(null);
    setHint(null);
  };
  const humanSide = (): Side => (mode === 'two' ? game.current.turn() : me());
  const bottom: Side = mode === 'buddy' ? (st.flip ? (youAre === 'w' ? 'b' : 'w') : youAre) : st.flip ? 'b' : 'w';

  const select = (sq: string) => {
    const g = game.current;
    const ms = g.moves({ square: sq as Square, verbose: true });
    setSelected(sq);
    setTargets(new Map(ms.map((m) => [m.to, m.captured ? 'capture' : 'move'] as const)));
    setWarn(null);
  };

  const finish = () => {
    const g = game.current;
    const level = chess.value.level;
    if (g.isCheckmate()) {
      const loser = g.turn();
      if (mode === 'buddy') {
        if (loser !== me()) {
          cheer();
          if (hostRef.current) burst(hostRef.current, hostRef.current, 30);
          award(STARS_FOR_WIN[level]);
          if (!chess.value.beaten.includes(level)) setChess({ beaten: [...chess.value.beaten, level] });
          sayLine('youWin');
        } else sayLine('iWin');
      } else {
        cheer();
        award(1);
        sayLine(loser === 'b' ? 'whiteWins' : 'blackWins');
      }
    } else {
      award(1);
      sayLine('draw');
    }
  };

  const afterMove = (m: Move, byHuman: boolean) => {
    const g = game.current;
    sfx(m.captured ? 'clack' : 'tock');
    setArrive({ from: m.from, to: m.to, key: ++arriveKey.current });
    clearMarks();
    save();
    bump();
    if (g.isGameOver()) return finish();
    if (m.promotion && byHuman) sayLine('promote');
    else if (g.inCheck()) sayLine(mode === 'buddy' && g.turn() === me() ? 'inCheck' : 'check');
    if (mode === 'buddy' && g.turn() !== me()) void buddyMove();
  };

  const buddyMove = async () => {
    const g = game.current;
    const my = ++token.current;
    setThinking(true);
    const t0 = Date.now();
    const history = g.history({ verbose: true }).map((m) => m.from + m.to);
    const choice = await think({ kind: 'pick', fen: g.fen(), level: chess.value.level, history });
    const wait = 600 + Math.random() * 400 - (Date.now() - t0);
    if (wait > 0) await new Promise((r) => window.setTimeout(r, wait));
    if (token.current !== my) return;
    setThinking(false);
    let m: Move | null = null;
    try {
      if (choice) m = g.move(choice);
    } catch {
      m = null;
    }
    if (!m) {
      // Safety net: never get stuck, even if the brain and the rules ever disagree.
      const all = g.moves({ verbose: true });
      if (!all.length) return;
      m = g.move(all[Math.floor(Math.random() * all.length)]);
    }
    afterMove(m, false);
  };

  const tryMove = (from: string, to: string, promotion?: PieceSymbol) => {
    const g = game.current;
    const cands = g.moves({ square: from as Square, verbose: true }).filter((m) => m.to === to);
    if (!cands.length) return;
    let pr = promotion;
    if (cands.some((m) => m.promotion) && !pr) {
      if (mode === 'buddy' && chess.value.level <= 2) pr = 'q';
      else {
        setPromo({ from, to });
        return;
      }
    }
    const confirmed = warn && warn.from === from && warn.to === to;
    if (mode === 'buddy' && chess.value.teach && !confirmed && leavesHanging(g.fen(), from as Square, to as Square, pr)) {
      setWarn({ from, to });
      bloop(440, 330, 0.14, 'sine', 0.18);
      sayLine('careful');
      return;
    }
    afterMove(g.move({ from, to, promotion: pr }), true);
  };

  const onTap = (sq: string) => {
    const g = game.current;
    unlockAudio();
    if (promo) return;
    const piece = g.get(sq as Square);
    if (g.isGameOver() || thinking) {
      if (piece) sayPiece(piece.type, false);
      return;
    }
    const side = humanSide();
    if (selected && targets.has(sq)) return tryMove(selected, sq);
    if (piece && piece.color === side) {
      if (selected === sq) return clearMarks();
      select(sq);
      const first = !spoken.current.has(piece.type);
      spoken.current.add(piece.type);
      sayPiece(piece.type, first);
      return;
    }
    // The other side's pieces still say their names: it's how children learn them.
    if (piece) sayPiece(piece.type, false);
    clearMarks();
  };

  const onDrop = (from: string, to: string) => {
    const g = game.current;
    if (g.isGameOver() || thinking || promo) return;
    const piece = g.get(from as Square);
    if (!piece || piece.color !== humanSide()) return;
    if (g.moves({ square: from as Square, verbose: true }).some((m) => m.to === to)) tryMove(from, to);
  };

  const undo = () => {
    const g = game.current;
    unlockAudio();
    token.current++;
    setThinking(false);
    setPromo(null);
    if (!g.history().length) return;
    g.undo();
    if (mode === 'buddy') while (g.history().length && g.turn() !== me()) g.undo();
    sfx('swish');
    clearMarks();
    setArrive(null);
    save();
    bump();
    if (mode === 'buddy' && g.turn() !== me()) void buddyMove();
  };

  const help = async () => {
    const g = game.current;
    unlockAudio();
    if (thinking || g.isGameOver() || promo) return;
    const my = token.current;
    const history = g.history({ verbose: true }).map((m) => m.from + m.to);
    const c = await think({ kind: 'best', fen: g.fen(), level: 5, history });
    if (!c || token.current !== my) return;
    select(c.from);
    setHint([c.from, c.to]);
    sayLine('hint');
  };

  const newGame = (side: Side = chess.value.youAre) => {
    unlockAudio();
    token.current++;
    game.current = new Rules();
    spoken.current.clear();
    setThinking(false);
    setPromo(null);
    clearMarks();
    setArrive(null);
    setChess(mode === 'buddy' ? { pgnBuddy: '', youAre: side } : { pgnTwo: '' });
    bump();
    sayLine(mode === 'buddy' && side === 'b' ? 'startBlack' : 'start');
    if (mode === 'buddy' && side === 'b') void buddyMove();
  };

  // A saved game where it's the buddy's turn (reloaded mid-thought): let it move.
  useEffect(() => {
    const g = game.current;
    if (mode === 'buddy' && !g.isGameOver() && g.turn() !== me()) void buddyMove();
    return () => {
      token.current++;
    };
  }, []);

  /* ---------- what the bubble says ---------- */
  const over = g.isGameOver();
  const loser = g.turn();
  const overText = (): Status => {
    if (g.isCheckmate()) {
      if (mode === 'buddy') return { t: loser !== youAre ? CH.youWin : CH.iWin };
      return { t: loser === 'b' ? CH.whiteWins : CH.blackWins };
    }
    const why = g.isStalemate()
      ? CL.stalemate
      : g.isThreefoldRepetition()
        ? CL.repetition
        : g.isInsufficientMaterial()
          ? CL.material
          : CL.fifty;
    return { t: CH.draw, small: why };
  };
  const status: Status = promo
    ? { t: { en: 'Choose a new piece for your pawn!', ne: 'सिपाहीका लागि नयाँ गोटी छान!' } }
    : over
      ? overText()
      : thinking
        ? { t: CH.think }
        : warn
          ? { t: CH.careful, small: CL.tapAgain }
          : hint
            ? { t: CH.hint }
            : mode === 'two'
              ? g.inCheck()
                ? { t: CH.check, small: g.turn() === 'w' ? CH.whiteTurn : CH.blackTurn }
                : { t: g.turn() === 'w' ? CH.whiteTurn : CH.blackTurn }
              : g.inCheck()
                ? { t: CH.inCheck }
                : g.history().length === 0
                  ? { t: youAre === 'w' ? CH.start : CH.startBlack }
                  : { t: PHRASES.yourTurn };
  useEffect(() => setStatus(status), [status.t.en, status.small?.en]);

  /* ---------- board ---------- */
  const hist = g.history({ verbose: true });
  const last = hist.length ? ([hist[hist.length - 1].from, hist[hist.length - 1].to] as [string, string]) : null;
  const checkSq = g.inCheck() ? (g.findPiece({ type: 'k', color: g.turn() })[0] ?? null) : null;
  const cell = (sq: string): CellView => {
    const p = g.get(sq as Square);
    return p ? { piece: { type: p.type as PieceType, side: p.color } } : {};
  };
  const label = (sq: string) => {
    const p = g.get(sq as Square);
    const what = p ? `${p.color === 'w' ? 'white' : 'black'} ${PIECE_NAMES[p.type as PieceType].en}` : 'empty';
    return `${sq}, ${what}${targets.has(sq) ? ', can move here' : ''}`;
  };
  const canDrag = (sq: string) => {
    const p = g.get(sq as Square);
    return !!p && !over && !thinking && !promo && p.color === humanSide() && g.turn() === p.color;
  };

  /* ---------- captured pieces ---------- */
  const took: Record<Side, PieceType[]> = { w: [], b: [] };
  for (const m of hist) if (m.captured) took[m.color].push(m.captured as PieceType);
  const worth = (xs: PieceType[]) => xs.reduce((a, t) => a + VALUE[t], 0);
  const order = (xs: PieceType[]) => [...xs].sort((a, b) => VALUE[b] - VALUE[a]);
  const tray = (side: Side, name: BiText) => {
    const lead = Math.round((worth(took[side]) - worth(took[side === 'w' ? 'b' : 'w'])) / 100);
    return (
      <div class="ch-tray">
        <span class="ch-tray-name">
          <Bi t={name} />
        </span>
        <span class="ch-tray-pieces">
          {order(took[side]).map((t, i) => (
            <span key={i} class="ch-mini" dangerouslySetInnerHTML={{ __html: pieceSVG(t, side === 'w' ? 'b' : 'w') }} />
          ))}
          {lead > 0 && <b class="ch-lead">+{lead}</b>}
        </span>
      </div>
    );
  };
  const buddyName: BiText = { en: 'Buddy', ne: 'साथी' };
  const youName: BiText = { en: 'You', ne: 'तिमी' };
  const level = st.level;

  return (
    <div class="ch-main" ref={hostRef}>
      <div class="ch-layout">
        <div class="ch-board-wrap">
          <Board
            cell={cell}
            bottom={bottom}
            selected={selected}
            targets={targets}
            last={last}
            check={checkSq}
            hint={hint}
            warn={warn?.to ?? null}
            arrive={arrive}
            faceOff={mode === 'two' && st.face}
            label={label}
            canDrag={canDrag}
            onTap={onTap}
            onDrop={onDrop}
          />
          {promo && (
            <div class="ch-over">
              <div class="ch-card ch-promo">
                <b>
                  <Bi t={{ en: 'Your pawn reached the end! Choose:', ne: 'सिपाही अन्तिम कोठामा पुग्यो! छान:' }} />
                </b>
                <div class="ch-promo-row">
                  {(['q', 'r', 'b', 'n'] as PieceType[]).map((t) => (
                    <button
                      key={t}
                      type="button"
                      class="ch-promo-btn"
                      aria-label={PIECE_NAMES[t].en}
                      onClick={() => {
                        const pz = promo;
                        setPromo(null);
                        sayPiece(t, false);
                        tryMove(pz.from, pz.to, t as PieceSymbol);
                      }}
                    >
                      <span dangerouslySetInnerHTML={{ __html: pieceSVG(t, g.turn()) }} />
                      <small>
                        <Bi t={PIECE_NAMES[t]} />
                      </small>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
          {over && (
            <div class="ch-over ch-over-end">
              <div class="ch-card ch-end">
                <b>
                  <Bi t={overText().t} />
                </b>
                {overText().small && (
                  <small>
                    <Bi t={overText().small!} />
                  </small>
                )}
                {mode === 'buddy' && g.isCheckmate() && loser !== youAre && (
                  <span class="ch-end-stars" aria-hidden="true">
                    {'★'.repeat(STARS_FOR_WIN[level])}
                  </span>
                )}
                <div class="ch-card-btns">
                  <button type="button" class="pill-btn" onClick={undo}>
                    <span aria-hidden="true">↶</span>
                    <Bi t={CL.undo} />
                  </button>
                  <button type="button" class="pill-btn go" onClick={() => newGame()}>
                    <span aria-hidden="true">↻</span>
                    <Bi t={CL.again} />
                  </button>
                  {mode === 'buddy' && g.isCheckmate() && loser !== youAre && level < 5 && (
                    <button
                      type="button"
                      class="pill-btn go"
                      onClick={() => {
                        setChess({ level: level + 1 });
                        newGame();
                      }}
                    >
                      <Bi t={{ en: `Level ${level + 1}`, ne: `तह ${level + 1}` }} />
                      <span aria-hidden="true">▶</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        <aside class="ch-side">
          {mode === 'buddy' && (
            <div class="ch-level" role="group" aria-label="Buddy level">
              <button
                type="button"
                class="cm-step"
                aria-label="Easier"
                disabled={level <= 1}
                onClick={() => setChess({ level: level - 1 })}
              >
                ‹
              </button>
              <span class="ch-level-name">
                <Bi t={{ en: `Level ${level} · ${LEVEL_NAMES[level - 1].en}`, ne: `तह ${level} · ${LEVEL_NAMES[level - 1].ne}` }} />
                <span class="ch-level-stars" aria-hidden="true">
                  {'★'.repeat(level)}
                  {st.beaten.includes(level) && <i title="Beaten">👑</i>}
                </span>
              </span>
              <button
                type="button"
                class="cm-step"
                aria-label="Harder"
                disabled={level >= 5}
                onClick={() => setChess({ level: level + 1 })}
              >
                ›
              </button>
            </div>
          )}
          {mode === 'buddy' && (
            <div class="kid-tabs ch-sides" role="group" aria-label="Your pieces">
              <span class="ch-label">
                <Bi t={CL.youAre} />
              </span>
              {(['w', 'b'] as Side[]).map((s) => (
                <button key={s} type="button" aria-pressed={youAre === s} onClick={() => youAre !== s && newGame(s)}>
                  <span class="ch-mini" dangerouslySetInnerHTML={{ __html: pieceSVG('k', s) }} />
                  <Bi t={s === 'w' ? CL.white : CL.black} />
                </button>
              ))}
            </div>
          )}
          <div class="ch-trays">
            {mode === 'buddy' ? (
              <>
                {tray(youAre === 'w' ? 'b' : 'w', buddyName)}
                {tray(youAre, youName)}
              </>
            ) : (
              <>
                {tray('b', CL.black)}
                {tray('w', CL.white)}
              </>
            )}
          </div>
          <div class="ch-actions">
            <button type="button" class="ch-btn" onClick={undo} disabled={!hist.length}>
              <span aria-hidden="true">↶</span>
              <Bi t={CL.undo} />
            </button>
            <button type="button" class="ch-btn" onClick={() => void help()} disabled={over || thinking}>
              <span aria-hidden="true">💡</span>
              <Bi t={CL.helpMe} />
            </button>
            <button type="button" class="ch-btn" onClick={() => newGame()}>
              <span aria-hidden="true">↻</span>
              <Bi t={CL.newGame} />
            </button>
            <button type="button" class="ch-btn" aria-pressed={st.flip} onClick={() => setChess({ flip: !st.flip })}>
              <span aria-hidden="true">⇅</span>
              <Bi t={CL.turnBoard} />
            </button>
            {mode === 'buddy' ? (
              <button type="button" class="ch-btn" aria-pressed={st.teach} onClick={() => setChess({ teach: !st.teach })}>
                <span aria-hidden="true">⚠</span>
                <Bi t={CL.warnMe} />
              </button>
            ) : (
              <button type="button" class="ch-btn" aria-pressed={st.face} onClick={() => setChess({ face: !st.face })}>
                <span aria-hidden="true">⇵</span>
                <Bi t={CL.faceEach} />
              </button>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}

export function ChessScreen() {
  const st = chess.value;
  const [rules, setRules] = useState(!st.seenRules);
  const [status, setStatus] = useState<Status>({ t: CH.start });
  useEffect(() => () => stopSpeech(), []);

  const pickMode = (m: ChessMode) => {
    unlockAudio();
    stopSpeech();
    sfx('pop');
    setChess({ mode: m });
  };
  const closeRules = () => {
    setRules(false);
    if (!chess.value.seenRules) setChess({ seenRules: true });
  };

  return (
    <section class="screen chess" aria-label="Chess">
      <div class="ch-top">
        <Buddy class="habre-small" />
        <div class="bubble left ch-status" aria-live="polite">
          <Bi t={status.t} />
          {status.small && (
            <small>
              <Bi t={status.small} />
            </small>
          )}
        </div>
        <div class="kid-tabs ch-modes" role="group" aria-label="Chess mode">
          {(
            [
              ['buddy', CL.playBuddy, '🙂'],
              ['two', CL.twoPlayers, '👫'],
              ['learn', CL.learn, '🎓'],
            ] as Array<[ChessMode, BiText, string]>
          ).map(([m, t, ico]) => (
            <button key={m} type="button" aria-pressed={st.mode === m} onClick={() => pickMode(m)}>
              <span aria-hidden="true">{ico}</span>
              <Bi t={t} />
            </button>
          ))}
          <button type="button" class="ch-howto" onClick={() => (unlockAudio(), setRules(true))} aria-label="How to play">
            <span aria-hidden="true">?</span>
            <Bi t={CL.howTo} />
          </button>
        </div>
      </div>
      {st.mode === 'learn' ? <Lessons setStatus={setStatus} /> : <Game key={st.mode} mode={st.mode} setStatus={setStatus} />}
      {rules && <Rules6 onClose={closeRules} />}
    </section>
  );
}
