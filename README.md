# Games 4 All

A kids' game superapp for iOS and Android — offline by design, with no ads, no
tracking, and no accounts.

Built with Expo and React Native from a single TypeScript codebase. The safety
model is not a policy document; it is a build gate (see
**[SAFETY.md](SAFETY.md)**).

## What's in it

Five learning-basics games spanning roughly ages 3-7+. The first three need
no reading at all; the last two are the deliberate exceptions, built for the
7+ group specifically:

| Game | Practises | Shown for |
| --- | --- | --- |
| 🧠 **Find the Pairs** | Visual memory and concentration | 3-4, 5-6, 7+ |
| 🔢 **How Many?** | Counting and recognising numerals 1-12 | 3-4, 5-6 |
| 🔺 **Sort It Out** | Sorting by shape, colour, and size | 3-4, 5-6, 7+ |
| 🔤 **Spell It!** | Reading and spelling simple words | 7+ |
| 🧩 **Sudoku** | Logical reasoning and number placement | 7+ |

Plus a **Parent Zone** behind a parent gate, holding screen-time limits, sound
and motion toggles, the child's age group, a plain-language privacy statement,
and a delete-all-data control.

### Age group: which games show, and how hard they start

A one-time, first-launch setup step (`OnboardingScreen`, gated behind the
parent gate — a child shouldn't be the one setting this) asks a grown-up
which age group the app is for: 3-4, 5-6, or 7+ (`src/state/ageGroups.ts`).
"Skip for now" is available without the gate and defaults to the middle
group, so setup never blocks play. The current age group is always visible
as a pill on Home next to the star count — no need to open Parent Zone just
to see it — and it's changeable any time after, either by tapping that pill
or in Parent Zone directly.

Age group does two genuinely different things, not one:

1. **Filters the catalogue.** Each game declares a `minAgeGroup`/
   `maxAgeGroup` (`src/games/catalog.ts`), and Home only shows games whose
   range includes the current group — `gamesForAgeGroup`. Right now that
   means "How Many?" (counting to 12) steps aside for the 7+ group, since
   it's squarely a preschool skill by then, while "Spell It!" (reading and
   spelling) and "Sudoku" (multi-step logical reasoning) do the opposite —
   they only appear for 7+, since the younger groups either can't read yet
   or aren't ready to hold a row/column/box rule in mind at once. "Find the
   Pairs" and "Sort It Out" suit the whole range. Parent Zone's game list is
   intentionally unfiltered, so a parent can always see the full catalogue
   and why something isn't showing on Home.
2. **Seeds where a shown game's difficulty starts.** From there each game's
   level drifts up or down round by round based on how the last round went
   (`nextLevel` in `src/games/types.ts`) — a perfect round nudges it up one
   step, a rough one nudges it down one step, never more than one step at a
   time. Parent Zone shows the level each game is currently sitting at.

Adding a game to the catalogue means picking its age range deliberately
(what age is this actually appropriate or interesting for?), not defaulting
to "all ages" — that default is what made every group look identical
before this existed.

### Staying fresh round to round

Every game actively avoids repeating what the previous round just used —
not just "the pool is big enough that it probably won't repeat," but an
explicit exclusion each time a new round is built (`sampleFresh`/`pickFresh`
in `src/util/random.ts`):

- **Find the Pairs** never deals the same set of pictures two rounds running.
- **How Many?** never shows the same picture on two consecutive questions,
  including the seam between one round and the next.
- **Sort It Out** never repeats the same sorting rule (shape/colour/size) two
  rounds running, and a shape- or colour-sort round avoids the previous
  round's basket shapes or colours too.

This only ever *excludes* recent content, never fails a round: if avoiding
would leave too few items to fill it (an exhausted pool at a high basket
count, say), it tops back up from the avoided set rather than breaking. It's
bounded variety within a fixed, kid-safe content pool, not literally
unlimited content.

**Sudoku** is the one exception, deliberately: every puzzle is generated
fresh by solving a full grid and digging holes (`src/games/sudoku/logic.ts`),
so there's no fixed pool to exhaust and nothing to avoid repeating — the
generator already gives effectively unlimited variety on its own.

What each game last showed is persisted (`g4a:freshness`, via
`getFreshness`/`setFreshness` on `AppProvider`), so the "just used" memory
survives backing out to Home and reopening the game, and survives the app
being closed and reopened entirely — not just "Play again" within one
sitting. A game's very first-ever round, before anything has been persisted
for it, is unaffected.

## Getting started

```bash
npm install
npm start          # Expo dev server — scan the QR code with Expo Go
```

Platform targets:

```bash
npm run ios        # iOS simulator (macOS) or Expo Go on device
npm run android    # Android emulator or device
npm run web        # browser preview, handy for quick UI checks
```

## Verifying a change

```bash
npm run verify     # safety gate + typecheck + unit tests
```

Individually:

```bash
npm run safety     # child-safety rules (see SAFETY.md)
npm run typecheck  # tsc --noEmit
npm test           # pure-logic unit tests
```

Tests run on Node's built-in test runner with native TypeScript support, so
there is no test framework, no transpiler, and no extra dependency to audit.

## Layout

```
App.tsx                     Root: navigation and screen-time enforcement
src/
  safety/
    parentGate.ts           Gate challenge generation and verification
    screenTime.ts           Session and daily limit rules
    ParentGateModal.tsx     The gate a grown-up passes
  state/
    AppProvider.tsx         Settings, progress, and usage accounting
    settings.ts, progress.ts, ageGroups.ts, freshness.ts
  games/
    catalog.ts              Pure game metadata + age-group filtering (no React)
    registry.ts             Attaches each game's Screen component to the catalogue
    memory/ counting/ shapes/ wordbuilder/ sudoku/
      logic.ts              Pure, seeded, unit-tested game rules
      *Screen.tsx           Presentation only
  screens/                  Home, Parent Zone, time's-up
  components/               Shared UI (all targets >= 72dp)
  theme/tokens.ts           Colour-blind-safe palette, spacing, type scale
scripts/check-safety.mjs    The build gate
tests/                      Unit tests for all pure logic
```

Game rules are kept in `logic.ts` files with no React and no I/O — every rule
takes a seeded RNG, so round generation can be asserted exhaustively (every
memory deal contains exactly two of each symbol; every sortable item matches
exactly one basket; every round is completable).

## Adding a game

1. Create `src/games/<id>/logic.ts` — pure rules, taking an `Rng` and a `level`.
2. Add `tests/` coverage asserting the round is always completable and fair.
3. Create `<id>Screen.tsx` implementing `GameScreenProps`. Seed local level
   state from the `level` prop, then advance it with `nextLevel` (from
   `src/games/types.ts`) on "Play again" — see any existing game screen for
   the pattern. This is what makes the game's difficulty adaptive rather than
   fixed at whatever the parent chose as a starting point.
4. Add an entry to `GAMES_META` in `src/games/catalog.ts`, including a
   deliberate `minAgeGroup`/`maxAgeGroup` — don't default to "all ages"
   without thinking about it; that's what made every age group identical
   before this field existed. Register the screen component in
   `src/games/registry.ts`'s `SCREEN_BY_ID`.

Home, progress tracking, and the parent-facing skills list all read from the
catalogue, so a game cannot ship half-wired.

Then run `npm run verify`.

## Building for the stores

```bash
npx eas build --platform ios
npx eas build --platform android
```

Release Android builds drop the `INTERNET` permission entirely
(`app.config.ts`); it is retained in development builds only so Metro can
attach.

Both stores require a children's-category declaration. The honest answers here
are: no data collected, no third-party SDKs, no ads, no purchases, no accounts.
