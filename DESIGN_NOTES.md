# Design Notes

## Hidden learning approach

The game hides math inside pirate-defense choices instead of stopping for quiz screens.

Examples in the current design:
- grouped cargo asks "all together" without showing equations first
- ship comparison asks the player to spot more or less supplies by sight
- fair-sharing waves present treasure split across pirates or chests
- equal-groups waves turn multiplication thinking into repeated stacks
- subtraction appears as cargo that washed away in a storm
- matching-marker waves reinforce grouped visual recognition instead of worksheet-style prompts

The player experiences these as target-selection problems inside a fast arcade loop. The math is there, but it is wrapped in motion, timing, rewards, and pirate fantasy.

## Why it does not feel like school

The project avoids school-like UX on purpose:
- no quiz screens between action beats
- no big equation panels as the primary interaction
- no long text instructions
- no harsh fail screens
- no formal multiplication-table presentation
- no sterile menu flow before play

Instead, the game emphasizes:
- juicy cannon feedback
- colorful moving targets
- quick rounds
- treasure rewards and cosmetic unlocks
- forgiving early waves
- world-themed hints instead of academic overlays

## Progression philosophy

Story Cove introduces complexity gradually:
- Tier 1 focuses on counting, totals, and simple more/less choices
- Tier 2 expands to values up to 20 and introduces visual subtraction and fair sharing
- Tier 3 leans into equal groups and stronger grouping logic
- Tier 4 pushes toward early multiplication and division thinking while still staying visual

Quick Play then remixes the same challenge families into an endless score-chase loop.

## Adaptive difficulty philosophy

The game quietly adapts instead of announcing difficulty changes.

When the player is doing well:
- ships move faster
- answer sets get a little busier
- hinting backs off
- number ranges climb

When the player is struggling:
- movement slows
- support visuals stay clearer
- hinting arrives earlier
- challenge values stay more manageable

That keeps the game feeling supportive without sounding instructional.

## MVP-complete versus stretch

MVP-complete in the current codebase:
- Story Cove scene flow and 18 levels
- Quick Play endless mode
- reusable challenge generator
- adaptive difficulty core
- save data and meta rewards
- settings and debug tuning
- strong placeholder visuals/audio with room for asset swaps

Stretch ideas intentionally left for later:
- full Cove Builder placement/customization mode
- boss ships with multi-step waves
- weather and time-of-day variants
- more islands with distinct visual identities
- richer pet behaviors and stronger hint personalities
- authored art/audio pass replacing generated placeholders

## Future expansion ideas

Good next steps after the MVP polish pass:
- add a compact Cove Builder that spends gold on visible island decorations
- give each pet a unique hint style instead of a shared helper pulse
- introduce miniboss waves that ask the player to solve multiple linked hits in sequence
- add themed worlds with different cargo types and palette shifts
- replace generated textures with bespoke art while preserving the same gameplay keys and systems
