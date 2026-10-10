// Turns the single-file build into the shape a Claude artifact expects:
// no <html>/<head>/<body> wrappers (the viewer adds them), <title> first.
import fs from 'node:fs';

const src = 'dist-artifact/index.html';
const out = 'dist-artifact/sano-sathi.html';
let html = fs.readFileSync(src, 'utf8');

const title = (html.match(/<title>[\s\S]*?<\/title>/) || [''])[0];
html = html
  .replace(/<!doctype html>/i, '')
  .replace(/<\/?html[^>]*>/gi, '')
  .replace(/<\/?head>/gi, '')
  .replace(/<\/?body>/gi, '')
  .replace(/<meta charset[^>]*>/i, '')
  .replace(/<meta name="viewport"[^>]*>/i, '')
  .replace(title, '');

fs.writeFileSync(out, `${title}\n${html.trim()}\n`);
console.log(`wrote ${out} (${(fs.statSync(out).size / 1024).toFixed(1)} KB)`);
