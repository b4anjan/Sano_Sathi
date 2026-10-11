import { useEffect, useRef, useState } from 'preact/hooks';
import { unlockAudio, sfx, cheer, bloop } from '../../core/audio';
import { say, stopSpeech } from '../../core/voice';
import { award } from '../../core/rewards';
import { CH, CL, PIECE_NAMES } from '../../content/chess';
import { Bi, burst } from '../../ui/common';
import { SpeakerIcon } from '../letters/Letters';
import { Board, type CellView } from './Board';
import { pieceSVG, type PieceType } from './pieces';
import { LESSONS, lessonMoves, par, promoted, sq, sqToName, stageStars } from './lessons';
import { chess, setChess } from './store';
import { biParts, pieceParts, sayLine } from './speak';
import type { Status } from './Chess';

/** "Meet the pieces": pick a piece, then move it onto every star, in as few moves as you can. */
export function Lessons({ setStatus }: { setStatus: (s: Status) => void }) {
  const [open, setOpen] = useState<{ li: number; si: number } | null>(null);
  if (!open) return <Picker setStatus={setStatus} onPick={(li) => setOpen({ li, si: firstOpen(li) })} />;
  return (
    <Stage
      key={`${open.li}-${open.si}`}
      li={open.li}
      si={open.si}
      setStatus={setStatus}
      onBack={() => setOpen(null)}
      onGo={(li, si) => setOpen({ li, si })}
    />
  );
}

function firstOpen(li: number): number {
  const got = chess.value.lessons[LESSONS[li].piece] ?? [];
  const i = LESSONS[li].stages.findIndex((_, k) => !got[k]);
  return i < 0 ? 0 : i;
}

function Picker({ onPick, setStatus }: { onPick: (li: number) => void; setStatus: (s: Status) => void }) {
  useEffect(() => setStatus({ t: { en: 'Pick a piece to learn!', ne: 'सिक्न एउटा गोटी छान!' } }), []);
  return (
    <div class="ch-learn">
      <div class="ch-pick-grid">
        {LESSONS.map((l, li) => {
          const got = chess.value.lessons[l.piece] ?? [];
          const total = got.reduce((a, b) => a + (b || 0), 0);
          return (
            <button key={l.piece} type="button" class="ch-pick" onClick={() => (unlockAudio(), sfx('pop'), onPick(li))}>
              <span class="ch-pick-art" dangerouslySetInnerHTML={{ __html: pieceSVG(l.piece, 'w') }} />
              <b>
                <Bi t={PIECE_NAMES[l.piece]} />
              </b>
              <span class="ch-pick-stars" aria-label={`${total} of 9 stars`}>
                {l.stages.map((_, k) => (
                  <i key={k} class={got[k] ? 'on' : ''}>
                    {'★'.repeat(got[k] || 0)}
                    {'☆'.repeat(3 - (got[k] || 0))}
                  </i>
                ))}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function Stage({
  li,
  si,
  setStatus,
  onBack,
  onGo,
}: {
  li: number;
  si: number;
  setStatus: (s: Status) => void;
  onBack: () => void;
  onGo: (li: number, si: number) => void;
}) {
  const lesson = LESSONS[li];
  const stage = lesson.stages[si];
  const best = par(lesson, stage);
  const [at, setAt] = useState(sq(stage.start));
  const [piece, setPiece] = useState<PieceType>(lesson.piece);
  const [got, setGot] = useState<Set<number>>(new Set());
  const [moves, setMoves] = useState(0);
  const [done, setDone] = useState<number | null>(null);
  const [arrive, setArrive] = useState<{ from: string; to: string; key: number } | null>(null);
  const key = useRef(0);
  const hostRef = useRef<HTMLDivElement>(null);

  const stars = stage.stars.map(sq);
  const foes = (stage.foes ?? []).map(sq);
  const rocks = new Set((stage.rocks ?? []).map(sq));
  const foesLeft = new Set(foes.filter((f) => !got.has(f)));
  const targets = done === null ? lessonMoves(piece, at, rocks, foesLeft) : [];

  const intro = () => {
    unlockAudio();
    void say([
      ...pieceParts(lesson.piece, true),
      ...biParts(CH.goal, 'ch-goal'),
      ...(stage.tip ? biParts(CH[stage.tip], `ch-${stage.tip}`) : []),
    ]);
  };
  useEffect(() => {
    const t = window.setTimeout(intro, 350);
    return () => {
      window.clearTimeout(t);
      stopSpeech();
    };
  }, []);
  useEffect(() => {
    setStatus(done !== null ? { t: CH.allStars } : { t: CH[`how-${lesson.piece}`], small: stage.tip ? CH[stage.tip] : CH.goal });
  }, [done === null]);

  const go = (to: number) => {
    const isFoe = foesLeft.has(to);
    const isStar = stars.includes(to) && !got.has(to);
    setArrive({ from: sqToName(at), to: sqToName(to), key: ++key.current });
    setAt(to);
    const n = moves + 1;
    setMoves(n);
    const next = new Set(got);
    if (isFoe || isStar) next.add(to);
    setGot(next);
    sfx(isFoe ? 'clack' : 'tock');
    if (isStar) window.setTimeout(() => sfx('sparkle'), 90);
    const becomes = promoted(piece, to);
    if (becomes !== piece) {
      setPiece(becomes);
      sayLine('promote');
    }
    if (next.size === stars.length + foes.length) {
      const s = stageStars(n, best);
      setDone(s);
      cheer();
      if (hostRef.current) burst(hostRef.current, hostRef.current, 24);
      award(s === 3 ? 2 : 1);
      const all = { ...chess.value.lessons };
      const row = [...(all[lesson.piece] ?? [0, 0, 0])];
      row[si] = Math.max(row[si] || 0, s);
      all[lesson.piece] = row;
      setChess({ lessons: all });
      window.setTimeout(() => sayLine('allStars'), 350);
    }
  };

  const onTap = (name: string) => {
    unlockAudio();
    if (done !== null) return;
    const s = sq(name);
    if (targets.includes(s)) return go(s);
    if (s === at) return void say(pieceParts(piece, true));
    bloop(380, 300, 0.12, 'sine', 0.14);
  };

  const cell = (name: string): CellView => {
    const s = sq(name);
    if (s === at) return { piece: { type: piece, side: 'w' } };
    if (foesLeft.has(s)) return { piece: { type: 'p', side: 'b' } };
    return { star: stars.includes(s) && !got.has(s), rock: rocks.has(s) };
  };
  const tmap = new Map(targets.map((t) => [sqToName(t), foesLeft.has(t) ? ('capture' as const) : ('move' as const)]));

  const nextStage = () => {
    if (si + 1 < lesson.stages.length) onGo(li, si + 1);
    else if (li + 1 < LESSONS.length) onGo(li + 1, 0);
    else onBack();
  };

  return (
    <div class="ch-main ch-lesson" ref={hostRef}>
      <div class="ch-layout">
        <div class="ch-board-wrap">
          <Board
            cell={cell}
            bottom="w"
            selected={done === null ? sqToName(at) : null}
            targets={tmap}
            arrive={arrive}
            label={(n) => {
              const c = cell(n);
              return `${n}${c.piece ? `, ${c.piece.side === 'w' ? 'white' : 'black'} ${PIECE_NAMES[c.piece.type].en}` : c.star ? ', star' : c.rock ? ', rock' : ''}${tmap.has(n) ? ', can move here' : ''}`;
            }}
            canDrag={(n) => done === null && sq(n) === at}
            onTap={onTap}
            onDrop={(from, to) => sq(from) === at && targets.includes(sq(to)) && go(sq(to))}
          />
          {done !== null && (
            <div class="ch-over ch-over-end">
              <div class="ch-card ch-end">
                <b>
                  <Bi t={CH.allStars} />
                </b>
                <span class="ch-end-stars" aria-label={`${done} stars`}>
                  {'★'.repeat(done)}
                  <span class="dim">{'★'.repeat(3 - done)}</span>
                </span>
                <small>
                  <Bi t={{ en: `${moves} moves · best is ${best}`, ne: `${moves} चाल · उत्तम ${best}` }} />
                </small>
                <div class="ch-card-btns">
                  <button type="button" class="pill-btn" onClick={() => onGo(li, si)}>
                    <span aria-hidden="true">↻</span>
                    <Bi t={CL.again} />
                  </button>
                  <button type="button" class="pill-btn go" onClick={nextStage}>
                    <Bi t={CL.next} />
                    <span aria-hidden="true">▶</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
        <aside class="ch-side">
          <button type="button" class="ch-btn ch-back" onClick={() => (stopSpeech(), onBack())}>
            <span aria-hidden="true">‹</span>
            <Bi t={CL.allPieces} />
          </button>
          <button type="button" class="ch-lesson-head" onClick={intro}>
            <span class="ch-pick-art" dangerouslySetInnerHTML={{ __html: pieceSVG(lesson.piece, 'w') }} />
            <span>
              <b>
                <Bi t={PIECE_NAMES[lesson.piece]} />
              </b>
              <small>
                <SpeakerIcon />
                <Bi t={CH[`how-${lesson.piece}`]} />
              </small>
            </span>
          </button>
          <div class="ch-stage-row">
            <span class="ch-label">
              <Bi t={CL.stage} />
            </span>
            {lesson.stages.map((_, k) => (
              <button
                key={k}
                type="button"
                class={`ch-stage-dot${k === si ? ' here' : ''}${(chess.value.lessons[lesson.piece] ?? [])[k] ? ' done' : ''}`}
                onClick={() => onGo(li, k)}
                aria-label={`Stage ${k + 1}`}
              >
                {k + 1}
              </button>
            ))}
          </div>
          <div class="ch-count">
            <span>
              <Bi t={CL.moves} /> <b>{moves}</b>
            </span>
            <span>
              <Bi t={CL.best} /> <b>{best}</b>
            </span>
            <span class="ch-count-stars" aria-label={`${got.size} of ${stars.length + foes.length} collected`}>
              {Array.from({ length: stars.length + foes.length }, (_, i) => (
                <i key={i} class={i < got.size ? 'on' : ''}>
                  ★
                </i>
              ))}
            </span>
          </div>
        </aside>
      </div>
    </div>
  );
}
