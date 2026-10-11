import { useRef, useState } from 'preact/hooks';
import { pieceSVG, STAR_SVG, ROCK_SVG, type PieceType, type Side } from './pieces';

/**
 * The chess board (shared by games and lessons). Tap a piece, then a square; or drag.
 * The board knows nothing about rules: the screen tells it what is on each square and
 * which squares to light up.
 */
export interface CellView {
  piece?: { type: PieceType; side: Side };
  star?: boolean;
  rock?: boolean;
}

export interface BoardProps {
  cell: (sq: string) => CellView;
  /** Which side is at the bottom. */
  bottom: Side;
  selected?: string | null;
  /** Squares the selected piece can go to (capture = an enemy piece is there). */
  targets?: Map<string, 'move' | 'capture'>;
  last?: [string, string] | null;
  check?: string | null;
  hint?: [string, string] | null;
  warn?: string | null;
  /** The last move, to slide the piece in from where it came. */
  arrive?: { from: string; to: string; key: number } | null;
  /** Two players at a flat tablet: black's pieces drawn upside down. */
  faceOff?: boolean;
  coords?: boolean;
  label: (sq: string) => string;
  canDrag?: (sq: string) => boolean;
  onTap: (sq: string) => void;
  onDrop?: (from: string, to: string) => void;
}

const FILES = 'abcdefgh';

export function Board(p: BoardProps) {
  const ref = useRef<HTMLDivElement>(null);
  const press = useRef<{ sq: string; x: number; y: number; id: number; moved: boolean } | null>(null);
  const [drag, setDrag] = useState<{ sq: string; x: number; y: number; size: number } | null>(null);

  const files = p.bottom === 'w' ? FILES.split('') : FILES.split('').reverse();
  const ranks = p.bottom === 'w' ? [8, 7, 6, 5, 4, 3, 2, 1] : [1, 2, 3, 4, 5, 6, 7, 8];
  const col = (sq: string) => files.indexOf(sq[0]);
  const row = (sq: string) => ranks.indexOf(Number(sq[1]));

  const sqAt = (x: number, y: number): string | null => {
    for (const el of document.elementsFromPoint(x, y)) {
      const s = (el as HTMLElement).closest?.('[data-sq]') as HTMLElement | null;
      if (s && ref.current?.contains(s)) return s.dataset.sq!;
    }
    return null;
  };

  const down = (e: PointerEvent, sq: string) => {
    if (e.button > 0) return;
    press.current = { sq, x: e.clientX, y: e.clientY, id: e.pointerId, moved: false };
    if (p.canDrag?.(sq)) ref.current?.setPointerCapture?.(e.pointerId);
  };
  const move = (e: PointerEvent) => {
    const pr = press.current;
    if (!pr || pr.id !== e.pointerId || !p.canDrag?.(pr.sq)) return;
    if (!pr.moved && Math.hypot(e.clientX - pr.x, e.clientY - pr.y) < 8) return;
    if (!pr.moved) {
      pr.moved = true;
      // Picking a piece up selects it, so its squares light up while dragging.
      p.onTap(pr.sq);
    }
    const size = (ref.current?.getBoundingClientRect().width ?? 400) / 8;
    setDrag({ sq: pr.sq, x: e.clientX, y: e.clientY, size });
  };
  const up = (e: PointerEvent) => {
    const pr = press.current;
    press.current = null;
    if (!pr || pr.id !== e.pointerId) return;
    if (pr.moved) {
      setDrag(null);
      const to = sqAt(e.clientX, e.clientY);
      if (to && to !== pr.sq) p.onDrop?.(pr.sq, to);
      return;
    }
    p.onTap(pr.sq);
  };

  const cells = [];
  for (const r of ranks) {
    for (const f of files) {
      const sq = `${f}${r}`;
      const c = p.cell(sq);
      // a1 is a dark square, h1 a light one.
      const dark = (FILES.indexOf(f) + r) % 2 === 1;
      const t = p.targets?.get(sq);
      const cls = [
        'csq',
        dark ? 'dark' : 'light',
        p.selected === sq && 'sel',
        p.last && (p.last[0] === sq || p.last[1] === sq) && 'last',
        p.check === sq && 'check',
        p.hint && (p.hint[0] === sq || p.hint[1] === sq) && 'hint',
        p.warn === sq && 'warn',
        t && `t-${t}`,
      ]
        .filter(Boolean)
        .join(' ');
      const arriving = p.arrive && p.arrive.to === sq && c.piece;
      const dx = arriving ? col(p.arrive!.from) - col(sq) : 0;
      const dy = arriving ? row(p.arrive!.from) - row(sq) : 0;
      const dragged = drag?.sq === sq;
      cells.push(
        <button
          key={sq}
          type="button"
          class={cls}
          data-sq={sq}
          aria-label={p.label(sq)}
          onPointerDown={(e) => down(e as PointerEvent, sq)}
          onClick={(e) => {
            // Keyboard (Enter/Space) arrives as a click with no pointer.
            if ((e as MouseEvent).detail === 0) p.onTap(sq);
          }}
        >
          {c.rock && <span class="cart" dangerouslySetInnerHTML={{ __html: ROCK_SVG }} />}
          {c.star && <span class="cart star" dangerouslySetInnerHTML={{ __html: STAR_SVG }} />}
          {c.piece && (
            <span
              key={arriving ? `a${p.arrive!.key}` : 'p'}
              class={`cart piece${arriving ? ' arrive' : ''}${dragged ? ' lifted' : ''}${p.faceOff && c.piece.side === 'b' ? ' upside' : ''}`}
              style={arriving ? { '--dx': dx, '--dy': dy } : undefined}
              dangerouslySetInnerHTML={{ __html: pieceSVG(c.piece.type, c.piece.side) }}
            />
          )}
          {t && <i class="cdot" aria-hidden="true" />}
          {p.coords !== false && f === files[0] && (
            <small class="crank" aria-hidden="true">
              {r}
            </small>
          )}
          {p.coords !== false && r === ranks[7] && (
            <small class="cfile" aria-hidden="true">
              {f}
            </small>
          )}
        </button>,
      );
    }
  }

  const dragPiece = drag ? p.cell(drag.sq).piece : null;
  return (
    <div
      class="cboard"
      ref={ref}
      onPointerMove={(e) => move(e as PointerEvent)}
      onPointerUp={(e) => up(e as PointerEvent)}
      onPointerCancel={() => ((press.current = null), setDrag(null))}
      role="grid"
      aria-label="Chess board"
    >
      {cells}
      {drag && dragPiece && (
        <span
          class="cghost"
          style={{ left: `${drag.x}px`, top: `${drag.y}px`, width: `${drag.size * 1.15}px`, height: `${drag.size * 1.15}px` }}
          dangerouslySetInnerHTML={{ __html: pieceSVG(dragPiece.type, dragPiece.side) }}
        />
      )}
    </div>
  );
}
