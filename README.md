# Sano Sathi (working name)

A bilingual English–Nepali learning playground for ages 2–8. One TypeScript codebase:
the website now, and the iPhone, iPad and Android apps later (wrapped with Capacitor).

## What's inside

**14 activities**, grouped on the home screen:

| Section | Activity | Ages | What it does |
| --- | --- | --- | --- |
| Words, letters & numbers | Listen & Find | 2–8 | Hear a word, tap its picture (3 levels) |
| | Find the Pair | 3–8 | Memory cards: same picture, picture + word, or नेपाली + English |
| | Letters | 3–7 | Look at ABC, अ आ इ and क ख ग; trace any letter with a finger |
| | Numbers | 3–7 | 0–20 as felt objects in ten-frames, counted aloud; trace 0–9 and ०–९ |
| | Count with me | 3–6 | Put oranges on the buddy's plate (five- or ten-frame) |
| | Shapes & Colors | 2–5 | Drag felt shapes into baskets by colour or shape |
| Play & explore | Smash & See | 1–6 | Every key or tap makes a letter, number or shape |
| | Bubble Pop | 2–6 | Pop bubbles; or pop the letter, number or colour asked for |
| | Xylophone | 2–8 | Sargam and do-re-mi, glide and play tunes |
| | Felt Paint | 2–8 | Brushes, rainbow brush, sticker stamps, mirror mode, undo |
| | My Village | 1–6 | A Nepali hillside where everything answers a tap; sun ↔ starry night |
| | Copy Me | 3–8 | Watch the blocks light up and sing, then copy the pattern; 15 levels (4, 6, then 8 blocks; shapes change from level 6) |
| Big kids 6–8 | Math Quest | 6–8 | + − × missing-number and compare, 3 levels, keypad, "show me" pictures |
| | Rupee Shop | 5–8 | Pay with felt coins and notes; level 3 adds "how much change?" |

**Buddies.** The child picks Cat (cheerful female voice), Puppy (little kid voice) or Panda
(soft, welcoming male voice) on the home screen. The buddy guides every game; tapping it
plays one of four funny reactions (four quick taps make it giggle). Each buddy has its own
computer-voice style until a family records its lines in the Voice Studio.

**Stars and stickers.** Right answers and finished rounds earn stars in every game; every
five stars unlock a felt sticker of one of the app's words, collected in the Sticker book.
Nothing is ever taken away. A line at the top of the Sticker book explains this (tap it to hear it).

**Tap music.** Tapping empty felt plays one soft note; every screen has its own instrument
(bells on home, marimba, kalimba, harp, music box, steel drum, ukulele, piano, vibraphone,
flute, pan flute, guitar, celesta, sitar, harmonium, xylophone), higher notes nearer the top
of the screen. Learning games play it more softly; game pieces keep their own sounds. All
synthesized in `src/core/instruments.ts` (no sound files). Grown-ups can switch it off.

**Every screen size.** Phones get a compact home (slim header, EN / ने / दुवै toggles, buddy
faces, sticker counter); phones on their side get thinner chrome and side-by-side layouts;
tile pictures scale with their tile; big monitors and TVs get larger pieces. Tap targets are
at least 44 px, and text follows the device's text-size setting.

**Install to the home screen.** The site has a web manifest and icons (`public/`), so
"Add to Home screen" (Android, iPhone, iPad) or "Install" (desktop Chrome/Edge) opens it full
screen with its own icon. It still needs the internet (no offline mode yet).

**Grown-ups** (hold the corner tag 2 s, or type `parent`): language, buddy, volume, tap
music, levels for each game (including opening or resetting Copy Me levels), background
motion, the children's hold-to-go-home button, sticker reset, and the Voice Studio.

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
| `src/brand.ts` | App name, Nepali name, publisher, default buddy, app id. **Rename here only.** |
| `src/content/activities.ts` | The list of activities (title, age, colour, section) used by home, rail and panel. |
| `src/content/buddies.ts` | The three buddies: names, voice styles, hello and tap reactions. |
| `src/core/rewards.ts` | Stars and stickers. |
| `src/core/trace.ts` | Scoring for tracing letters and numbers (works for any script). |
| `src/content/items.ts` | Every word: topic, English, Nepali, romanised. Add a word here. |
| `src/content/art.ts` | Felt illustrations drawn in code, one function per word. |
| `src/content/strings.ts` | All child-facing sentences in both languages, for native-speaker review. |
| `src/content/numbers.ts` | English and Nepali numbers, Nepali digits, counting words (-वटा). |
| `src/audio/` | Recordings built into the app (see below). Empty until the first batch is imported. |
| `src/content/script.ts` | Everything the Voice Studio asks you to record, in recording order. |
| `src/content/pronounce.ts` | How the English computer voice should say Nepali names (dhaka topi, Habre…). |
| `src/core/` | Settings, sound effects, voice, felt texture, learning progress. |
| `src/modes/` | One folder per activity, plus `stickers` and `studio` (grown-ups). |
| `src/content/letters.ts` | English A–Z and Nepali vowels and consonants (in वर्ग rows) with example words. |
| `src/ui/Ambient.tsx` | The living background: drifting felt pieces, finger trails, tap bursts. |
| `src/core/tapMusic.ts`, `src/core/instruments.ts` | Tap-anywhere music: which instrument each screen uses, and the synthesized instruments. |
| `public/` | Home-screen icons and the web manifest (website build only). |
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
- Phrases: `_where`, `_welldone`, `_look`, `_allfound`, `_pop`, `_night`, and greetings
  `_morning`, `_afternoon`, `_evening`, `_late`
- Sentences: `s-<activity>` (said when an activity opens), `s-tapBasket`, `s-plateFull`,
  `s-countTogether`, `s-tryAgain`, `want-1` … `want-10`
- Colours and shapes: `color-red`, `color-sky-blue` …, `shape-circle`, `shape-star` …
- Buddies: `m-<buddy>-<line>`, e.g. `m-cat-hello`, `m-puppy-bark`, `m-panda-tickle`.
  Children love recording the Puppy!
- Village words: `w-house`, `w-himal`, `w-cloud`, `w-pond`, `w-star`

When a game gets a new spoken line, add it to `src/content/script.ts` so the studio asks for it.

## AI voices (Azure AI Speech)

Every line in the Voice Studio script is also spoken by an AI voice, separately for each
buddy, and built into the app as `src/audio/ai/<buddy>/<lang>/<key>.mp3`:

| Buddy | English | Nepali |
| --- | --- | --- |
| Cat | en-US-JennyNeural (cheerful) | ne-NP-HemkalaNeural |
| Puppy | en-US-AnaNeural (child) | ne-NP-HemkalaNeural, higher pitch |
| Panda | en-US-GuyNeural (friendly), slower | ne-NP-SagarNeural, slower |

- The GitHub job **Generate AI voices** (`.github/workflows/voices.yml`) makes them with the
  repository secrets `AZURE_SPEECH_KEY` and `AZURE_SPEECH_REGION`, commits them and redeploys.
  It runs by itself when `src/content` changes, or by hand from the Actions tab (choose a
  buddy, "remake every clip", or a small limit to test).
- Only new or changed lines are made (`src/audio/ai/manifest.json` keeps a fingerprint of each).
  Voice settings live in `scripts/voice-ssml.mjs`; bump `VOICE_VERSION` there to remake all.
- The free Azure tier allows 20 clips a minute: a full run of ~920 clips takes about 50 minutes,
  and a few new words take seconds. Clips are trimmed and levelled with ffmpeg.
- Playback order: this device's recording > a human recording built in > the buddy's AI voice >
  the device's computer voice. Check AI lines in the Voice Studio (they show "AI voice"), and
  record any word that sounds wrong.

## Adding a word

1. Add a record to `ITEMS` in `src/content/items.ts`.
2. Add a picture function to `ART` in `src/content/art.ts` (same id).
3. `npm test` checks every word has a picture and Nepali text in Devanagari.

## Adding an activity

1. Add an entry to `ACTIVITIES` in `src/content/activities.ts` (and its title to `S` and
   `SPOKEN_S` in `src/content/strings.ts`).
2. Write the screen in `src/modes/<id>/` and add it to `src/App.tsx`.
3. Add its tile picture to `TILE_ART` in `src/ui/Home.tsx`.
4. Give it an instrument in `SCREEN_INSTRUMENT` (`src/core/tapMusic.ts`); the test checks no two screens share one.
5. Call `award(1)` from `src/core/rewards.ts` when the child succeeds.

## Next steps

- Story Time and rhymes, with family recordings.
- Native speaker review of all Nepali text (buddy lines, new activity names, math prompts).
- Offline mode (service worker) and IndexedDB progress.
- Recordings for the counting praise and hints ("Yum! Three oranges…"), which are still computer voice.
- Capacitor wrapper: `npx cap add ios` on the MacBook, `npx cap add android` anywhere.
