/**
 * Felt texture, generated once at start-up on a canvas (no image files).
 * - CSS var --noise: used as a background layer on felt surfaces and felt letters.
 * - feltPatternUrl: fills the #feltPat SVG pattern that every illustration overlays.
 */
function noise(size: number, alpha: number, fibers: number): string {
  try {
    const c = document.createElement('canvas');
    c.width = c.height = size;
    const x = c.getContext('2d');
    if (!x) return '';
    const d = x.createImageData(size, size);
    for (let i = 0; i < d.data.length; i += 4) {
      const v = Math.random() < 0.5 ? 0 : 255;
      d.data[i] = d.data[i + 1] = d.data[i + 2] = v;
      d.data[i + 3] = Math.random() * alpha;
    }
    x.putImageData(d, 0, 0);
    x.lineCap = 'round';
    x.lineWidth = 0.8;
    for (let i = 0; i < fibers; i++) {
      const px = Math.random() * size;
      const py = Math.random() * size;
      const a = Math.random() * Math.PI;
      const l = 2 + Math.random() * 5;
      x.strokeStyle = Math.random() < 0.5 ? 'rgba(255,255,255,.07)' : 'rgba(0,0,0,.09)';
      x.beginPath();
      x.moveTo(px, py);
      x.lineTo(px + Math.cos(a) * l, py + Math.sin(a) * l);
      x.stroke();
    }
    return c.toDataURL('image/png');
  } catch {
    return '';
  }
}

export let feltPatternUrl = '';

export function initFelt(): void {
  const board = noise(120, 30, 380);
  if (board) document.documentElement.style.setProperty('--noise', `url(${board})`);
  feltPatternUrl = noise(64, 70, 120);
}
