# Sano Sathi (working name)

A bilingual English–Nepali learning playground for ages 2–8. One TypeScript codebase:
the website now, and the iPhone, iPad and Android apps later (wrapped with Capacitor).

## Run it

```bash
npm install
npm run dev              # local dev server with live reload
npm test                 # unit tests (Vitest)
npm run typecheck        # TypeScript checks
npm run build            # website build -> dist/
npm run build:artifact   # one self-contained HTML file -> dist-artifact/sano-sathi.html
```

## Put it online (GitHub Pages)

Every push to `main` builds, tests and publishes the site automatically
(`.github/workflows/deploy.yml`). If a test fails, nothing is published.

1. On GitHub, create a new repository named `sano-sathi` (no README, no .gitignore).
2. In this folder, push the code:
   ```powershell
   git init
   git add .
   git commit -m "Prototype v3"
   git branch -M main
   git remote add origin https://github.com/<your-user>/sano-sathi.git
   git push -u origin main
   ```
3. In the repository: Settings > Pages > Build and deployment > Source: **GitHub Actions**.
4. Open the Actions tab and wait for the green tick (about 1 minute). The site is at
   `https://<your-user>.github.io/sano-sathi/`.

Pages is free for public repositories; a private repository needs a paid GitHub plan.

## Where things live

| Path | What it is |
| --- | --- |
| `src/brand.ts` | App name, Nepali name, publisher, mascot, app id. **Rename here only.** |
| `src/content/items.ts` | Every word: topic, English, Nepali, romanised. Add a word here. |
| `src/content/art.ts` | Felt illustrations drawn in code, one function per word. |
| `src/content/strings.ts` | All child-facing sentences in both languages, for native-speaker review. |
| `src/content/numbers.ts` | English and Nepali numbers, Nepali digits, counting words (-वटा). |
| `src/audio/` | Recordings built into the app (see below). Empty until the first batch is imported. |
| `src/content/script.ts` | Everything the Voice Studio asks you to record, in recording order. |
| `src/content/pronounce.ts` | How the English computer voice should say Nepali names (dhaka topi, Habre…). |
| `src/core/` | Settings, sound effects, voice, felt texture, learning progress. |
| `src/modes/` | One folder per mode: `match`, `memory`, `count`, `smash`, `xylo`, plus `studio` (grown-ups). |
| `src/content/letters.ts` | English A–Z and Nepali vowels and consonants (in वर्ग rows) with example words. |
| `src/ui/Ambient.tsx` | The living background: drifting felt pieces, finger trails, tap bursts. |
| `src/ui/` | Frame, grown-ups gate, parent panel, home screen, shared pieces. |

## Voices: from the studio to the app

Computer voices cannot say Nepali properly, so the app is built around real voices.

1. **Record.** On the live site (it must be the https address; preview windows block the
   microphone), open Grown-ups › **Record voices**. Pick *नेपाली voice* or *English voice*,
   press **Record**, say the word once. It stops by itself, trims the silence, evens out the
   volume and plays it back. Every game uses it straight away, on that device.
2. **Download.** Press **Download all** (or **Share…** on iPhone/iPad) to get
   `sano-sathi-voices-YYYY-MM-DD.zip`. Keep it: it is also your backup. **Load a zip** puts
   the same recordings on another phone or tablet.
3. **Build in.** To give every device (and the beta families) your voices:
   ```
   node scripts/import-voices.mjs path\to\sano-sathi-voices-YYYY-MM-DD.zip
   git add src/audio
   git commit -m "Add voice recordings"
   git push
   ```
   The script needs ffmpeg (`winget install ffmpeg`). It writes small AAC files to
   `src/audio/<en|ne>/<key>.m4a`, with rumble removed and loudness levelled.

Recordings on a device win over built-in ones, which win over the computer voice. If a
sentence is only partly recorded and there is no computer voice for that language, the
recorded part still plays (so "गाई" is heard even before "कहाँ छ?" is recorded).

Clip keys (the studio handles these for you; they matter only when adding files by hand):

- Words: the item id, e.g. `ne/gai`, `en/gai`. Words whose English name is the Nepali name
  (`ownName` in items.ts: dhaka topi, daura suruwal…) are recorded once, in Nepali.
- Numbers: `num0` … `num10`
- Letters: `letter-A` … `letter-Z`, `letter-क`, `letter-अ` … (the chant: "क, कुखुराको क")
- Phrases: `_where`, `_welldone`, `_look`, `_allfound`
- Sentences: `s-hello`, `s-match`, `s-memory`, `s-count`, `s-smash`, `s-xylo`,
  `s-tapBasket`, `s-plateFull`, `s-countTogether`, `want-1` … `want-10`

When a game gets a new spoken line, add it to `src/content/script.ts` so the studio asks for it.

## Adding a word

1. Add a record to `ITEMS` in `src/content/items.ts`.
2. Add a picture function to `ART` in `src/content/art.ts` (same id).
3. `npm test` checks every word has a picture and Nepali text in Devanagari.

## Next steps

- Trace Lab (letters and numbers in both scripts), Color & Shape Sorting, and Story Time.
- Offline install (service worker) and IndexedDB progress.
- Recordings for the counting praise and hints ("Yum! Three oranges…"), which are still computer voice.
- Capacitor wrapper: `npx cap add ios` on the MacBook, `npx cap add android` anywhere.
