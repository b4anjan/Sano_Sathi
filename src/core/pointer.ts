/**
 * Where the child's finger or mouse is, shared by everything that reacts to it
 * (the living background, Habre's eyes). Plain object + listeners, not a signal,
 * so pointer movement never re-renders components.
 */
export const pointer = { x: -9999, y: -9999, active: false, t: 0 };
type Fn = (e: PointerEvent, kind: 'move' | 'down') => void;
const subs = new Set<Fn>();

export function onPointer(fn: Fn): () => void {
  subs.add(fn);
  return () => subs.delete(fn);
}

let started = false;
export function startPointerTracking(): void {
  if (started) return;
  started = true;
  const move = (e: PointerEvent) => {
    pointer.x = e.clientX;
    pointer.y = e.clientY;
    pointer.active = true;
    pointer.t = performance.now();
    subs.forEach((f) => f(e, 'move'));
  };
  const down = (e: PointerEvent) => {
    pointer.x = e.clientX;
    pointer.y = e.clientY;
    pointer.active = true;
    pointer.t = performance.now();
    subs.forEach((f) => f(e, 'down'));
  };
  window.addEventListener('pointermove', move, { passive: true });
  window.addEventListener('pointerdown', down, { passive: true });
  window.addEventListener('pointerleave', () => (pointer.active = false));
}
