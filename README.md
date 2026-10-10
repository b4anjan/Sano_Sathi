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
| `src/audio/` | Your recordings (see below). Empty until the first recording session. |
| `src/core/` | Settings, sound effects, voice, felt texture, learning progress. |
| `src/modes/` | One folder per mode: `match`, `memory`, `count`, `smash`, `xylo`. |
| `src/content/letters.ts` | English A–Z and Nepali vowels and consonants (in वर्ग rows) with example words. |
| `src/ui/Ambient.tsx` | The living background: drifting felt pieces, finger trails, tap bursts. |
| `src/ui/` | Frame, grown-ups gate, parent panel, home screen, shared pieces. |

## Adding recordings

Put files in `src/audio/<en|ne>/<key>.m4a` (mp3/ogg/wav also work) and rebuild. Nothing else changes.

- Words: the item id, e.g. `src/audio/ne/gai.m4a`, `src/audio/en/gai.m4a`
- Numbers: `num1` … `num10`
- Letters: `letter-A` … `letter-Z` (English), `letter-क` etc. (Nepali)
- Phrases: `_where` (कहाँ छ? / Where is the…), `_welldone` (स्याबास! / Well done!)

When every clip a sentence needs exists, the clips play; otherwise the device's computer
voice is used. Nepali is never read with an English voice.

## Adding a word

1. Add a record to `ITEMS` in `src/content/items.ts`.
2. Add a picture function to `ART` in `src/content/art.ts` (same id).
3. `npm test` checks every word has a picture and Nepali text in Devanagari.

## Next steps

- Trace Lab (letters and numbers in both scripts), Color & Shape Sorting, and Story Time.
- Offline install (service worker) and IndexedDB progress.
- Capacitor wrapper: `npx cap add ios` on the MacBook, `npx cap add android` anywhere.
