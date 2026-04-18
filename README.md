# Pirate Cannon Cove

Pirate Cannon Cove is a Phaser 3 browser game built with Vite. It aims to feel like a juicy pirate defense game first, while sneaking early math practice into visual cargo, treasure, and ship-choice situations.

## Run locally

1. Install dependencies:
   `npm install`
2. Start the dev server:
   `npm run dev`
3. Build for production:
   `npm run build`
4. Preview the build:
   `npm run preview -- --host 127.0.0.1`

Production output:
- `npm run build` now writes the static site to `docs/` so it can be deployed directly with GitHub Pages
- `npm run preview` serves that production build locally

Notes:
- This project uses Phaser 3 and Vite exactly as requested.
- The `package.json` uses a Vite-compatible `esbuild-wasm` override so the project can run in environments where the native `esbuild` binary is blocked by Windows policy. It is still a Vite project and the normal `npm run dev` / `npm run build` workflow works.
- The Vite base path is set to `./` in `vite.config.js` so the build works when served from a GitHub Pages repo subpath.

## GitHub Pages deployment

This project is set up for simple static GitHub Pages hosting with low discoverability, not real access control.

### One-time repo setup

1. Push this repo to GitHub.
2. Make sure the default branch is the branch you want to publish from, usually `main`.
3. In GitHub, open:
   `Settings -> Pages`
4. Under `Build and deployment`, choose:
   - `Source`: `Deploy from a branch`
   - `Branch`: `main`
   - `Folder`: `/docs`
5. Click `Save`.

That is the exact branch/folder setup this repo is prepared for.

### Publish the site

1. Install dependencies:
   `npm install`
2. Build the production site:
   `npm run build`
3. Commit the generated `docs/` folder along with your source changes.
4. Push to GitHub.
5. Wait for GitHub Pages to publish the updated contents of `docs/`.

### Update the site later

Every time you want to publish a change:

1. Run `npm run build`
2. Commit the updated `docs/`
3. Push to the same branch used in Pages settings

### Low-discoverability measures included

This repo intentionally reduces crawler discovery, while still keeping the site public by direct link:

- `index.html` includes:
  `<meta name="robots" content="noindex, nofollow">`
- `public/robots.txt` contains:
  `User-agent: *`
  `Disallow: /`
- No sitemap is included

Important:
- This is only crawler discouragement, not security
- Anyone with the public URL can still open the site

## iPhone and iPad support

The game shell is tuned for mobile Safari and tablet browsers:

- `viewport-fit=cover` is enabled in `index.html`
- safe-area padding is applied in `src/style.css`
- a viewport-height sync in `src/main.js` tracks mobile browser chrome changes and keeps the canvas height stable
- the Phaser parent now uses `expandParent: true`
- touch capture is enabled and the canvas uses `touch-action: none` to reduce accidental page gestures during play
- responsive HUD/menu layouts already adjust for narrow screens and landscape-friendly play

Recommended testing after each major UI pass:

1. iPhone Safari portrait
2. iPhone Safari landscape
3. iPad Safari portrait
4. iPad Safari landscape

## MVP status

MVP-complete now:
- Boot -> Main Menu -> World Map -> Level -> Results flow
- Story Cove with 18 levels
- Quick Play endless score chase
- Five required challenge templates plus one subtraction template
- Cannon recoil, projectile tween, smoke, splash, hit flash, combo feedback, coin burst, sparkles, confetti, and screen shake
- Adaptive difficulty that quietly changes pace, range, choices, support, and hinting
- Local save for story progress, quick-play best score, wallet, cosmetics, settings, and debug tuning
- Basic settings modal, mute toggle, and difficulty debug panel
- Generated placeholder visuals and placeholder/procedural audio hooks that can be swapped later

Still stretch / not fully built out:
- Full Cove Builder mode
- Boss encounters
- Weather variants beyond the current daylight cove look
- Extra island worlds beyond the main Story Cove map

## Folder structure

```text
src/
  game/
    audio/        Procedural audio system and sound hooks
    content/      Story levels and unlock catalogs
    effects/      Generated textures and reusable backdrop setup
    helpers/      Layout, storage, randomness, formatting
    scenes/       Boot, Main Menu, World Map, Level, Results
    systems/      Save system, challenge generator, adaptive difficulty
    ui/           Buttons, prompt visuals, settings modal, debug panel
  main.js         Phaser entrypoint
  style.css       App shell and font styles
public/
  assets/         Placeholder drop-in folder for future authored assets
```

## Adaptive difficulty

The adaptive difficulty lives in `src/game/systems/DifficultyDirector.js`.

It tracks:
- recent accuracy
- average response time
- streaks
- repeated struggles by challenge template
- manual debug tuning offsets

Those signals feed a per-wave profile that adjusts:
- ship speed
- max number size
- answer choice count
- movement amount
- visual support level
- hint strength

High performers quietly get faster ships, larger quantities, more choices, and less hinting. Players who struggle get slower pacing, lower values, clearer grouping support, and earlier hint pulses.

## Add a new challenge template

1. Add a new builder in `src/game/systems/ChallengeFactory.js`.
2. Return a challenge object with:
   - `instruction`
   - `subInstruction`
   - `promptVisual`
   - `options`
   - `responseGoalMs`
   - `learningTag`
3. Each option should declare:
   - `targetStyle` (`ship`, `raft`, or `marker`)
   - `label` when a big numeric badge helps readability
   - `cargo` visual descriptor for the renderer
   - `isCorrect`
4. Add the new template id to the relevant story levels in `src/game/content/levels.js` or the quick-play tier routing in `LevelScene.js`.
5. If the prompt or cargo needs a new visual type, extend `src/game/ui/ChallengeVisuals.js`.

## Swap assets later

Right now the game uses generated Phaser textures plus procedural placeholder audio so the gameplay can ship without an art/audio dependency block.

To replace visuals:
- Put real art in `public/assets/`
- Load it in `BootScene` instead of, or alongside, `createGeneratedTextures()`
- Keep the same texture keys (`ship`, `raft`, `marker`, `coin`, `crate`, `barrel`, etc.) to avoid scene changes

To replace audio:
- Keep the same method names in `src/game/audio/AudioSystem.js`
- Replace the procedural tone/noise calls with loaded audio clips or WebAudio buffers
- The scene layer already calls semantic hooks such as `playCannon()`, `playSuccess()`, `playMistake()`, `playSplash()`, and `playCelebration()`

## Testing checklist used here

Verified:
- `npm install`
- `npm run build`
- `npm run preview -- --host 127.0.0.1`
- local production preview responds on HTTP 200

Manual gameplay checks to keep doing while tuning:
- mouse and touch target comfort
- early-level forgiveness
- quick-play pacing over several rounds
- readability on narrow/tall phone layouts
- answer clarity when multiple targets overlap visually
