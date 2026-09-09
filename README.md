# Games 4 All

A kids' game superapp for iOS and Android — offline by design, with no ads, no
tracking, and no accounts.

Built with Expo and React Native from a single TypeScript codebase. The safety
model is not a policy document; it is a build gate (see
**[SAFETY.md](SAFETY.md)**).

## What's in it

Seven games spanning early childhood through adulthood — this is a "whole
family shares one device" app, not just a kids' app, so the oldest content
here is built to actually hold up for a grown-up, not just tolerate one:

| Game | Practises | Ages |
| --- | --- | --- |
| **Find the Pairs** | Visual memory and concentration | 3-6 |
| **How Many?** | Counting and recognising numerals 1-12 | 3-6 |
| **Sort It Out** | Sorting by shape, colour, and size | 3-6 |
| **Spell It!** | Reading and spelling simple words | 6-10 |
| **Sudoku** | Logical reasoning and number placement | 7+ |
| **Pattern Play** | Sequence memory and concentration | 4+ |
| **Number Crunch** | Mental arithmetic: +, −, ×, ÷ | 6+ |

Each also carries a category (Memory, Numbers, Words, Logic, Sorting) shown
as filter chips on Home, alongside a search box — with seven games and
growing, finding the right one shouldn't require scrolling past all the
others.

Every game card also carries a star pin toggle — no parent gate needed, since
it changes nothing about what's available, only how quickly a profile
reaches what they already chose. Pinned games surface in a **Favourites**
row at the top of Home (`settings.pinnedGameIds`, per profile), so a
catalogue that grows toward dozens of games never forces a search just to
reach the handful someone actually plays. The row only shows while browsing
unfiltered — an active search or category already narrowed things down, so
there's nothing left for a shortcut to shortcut.

Plus **Profiles**, so a parent and each child sharing this device get their
own separate stars, adaptive levels, favourites, and settings; **Parent
Zone** behind a parent gate, holding screen-time limits, sound and motion
toggles, profile management, a plain-language privacy statement, and a
delete-all-data control; and **Play time**, a child-readable account of how
long today has gone, which is the one destination that needs no gate.

### Profiles: sharing one device honestly

A one-time, first-launch setup step (`OnboardingScreen`, gated behind the
parent gate — a child shouldn't be the one setting this) asks a grown-up to
create the first profile: a name, a colour, and a real age
(`src/state/profiles.ts`). "Skip for now" is available without the gate and
creates a sensible default profile, so setup never blocks play. A profile
shows as its own initial on its colour, always visible on Home next to the
Parent Zone control — tapping it opens **Profiles** (behind the parent gate
again, every time) to switch to someone else, add a new profile, edit one,
or remove one.

This is deliberate, not incidental: **switching who's playing always requires
a grown-up**, the same way opening Parent Zone does. A child should never be
able to hand themselves an adult's profile, an older sibling's, or spin up a
new one, without a grown-up saying so.

Everything that varies per-person is kept fully separate — stars, each
game's adaptive level, sound/haptics/reduce-motion preferences, and even
screen-time usage — so a parent playing Sudoku on their own profile never
inflates a child's star count, and vice versa (`AppProvider`, which keys all
of this by profile id under the same four storage keys `SAFETY.md` lists —
adding profiles never grows what's stored, only reshapes it).

### Age: a real number, not a named group

There is no "3-4 / 5-6 / 7+" bucket any more. Every profile has a real age in
years, and every game declares a real `minAge`/`maxAge` range
(`src/games/catalog.ts`) — Home just checks whether the profile's age falls
inside it (`gamesForAge`). A simple picture-matching game caps out in the
single digits, honestly, rather than defaulting to "all ages" and quietly
boring anyone older; a game built to keep scaling (Sudoku's grid size,
Pattern Play's sequence length, Number Crunch's arithmetic) carries no upper
cap at all, because it doesn't need one.

Age still does the same two things it always did, just without the group
label in between:

1. **Filters the catalogue.** A profile only sees games whose range includes
   their age. Parent Zone's game list is intentionally unfiltered, so a
   parent can always see the full catalogue and why something isn't showing
   on Home for a given profile.
2. **Seeds where a shown game's difficulty starts.** A profile's age picks
   the level a never-played game opens at (`startingLevelForAge` in
   `src/games/types.ts`) — this matters because a single game's range can
   span decades, and starting everyone in the middle is wrong at both ends:
   it hands a six-year-old something too hard, and asks a forty-one-year-old
   to warm up on "6 + 7" for several rounds before Number Crunch offers
   anything worth their time. From the first completed round onward, age
   stops mattering entirely: the level drifts up or down based on how the
   last round actually went (`nextLevel`) — a perfect round nudges it up one
   step, a rough one nudges it down one step, never more than one step at a
   time — so a confident young player climbs past their starting point and
   an adult who'd rather take it gently drops below theirs. Parent Zone shows
   the level each game is currently sitting at for the active profile.

Those age bands aren't guesses. They track two well-documented curves that
happen to run together: arithmetic milestones (add and subtract within 20
around 6-7, within 100 around 7-8, times tables and division within 100
around 8-9, fluent by ~11) and short-term memory span (roughly 3 items at
age 4, 6 by 10-12, levelling off at 7-8 by about 16). **Number Crunch**
follows that ladder most literally — see `src/games/numbercrunch/logic.ts`,
where each of the six levels is annotated with the milestone it is anchored
to, and where three further findings shape the questions themselves:

- **The problem-size effect** — large single-digit facts (8 × 7) resist
  direct retrieval in a way small ones (2 × 3) don't — so higher levels
  raise the *floor* on factors, not just the ceiling. An adult is never
  handed 2 × 3.
- **Error structure** — around 88% of adults' multiplication mistakes are
  "operand-related", landing on a number from one of the operands' own
  tables (7 × 4 → 24). The wrong answers offered are built from those real
  confusions plus carry and place-value slips, so 8 × 7 is offered against
  48 and 63 rather than 55 and 57. Decoys no times table can reach turn a
  question into a formatting exercise.
- **Cognitive aging** — processing *speed* declines with age while
  arithmetic knowledge holds up, and nothing here is timed, so content is
  never softened for older players.

Adding a game to the catalogue means picking its age range deliberately
(what age is this actually appropriate or interesting for, and where does it
stop being one?), not defaulting to "all ages" — that default is exactly
what made an 18-year-old's game list identical to a 4-year-old's before this
model existed.

### The look: Modernist

The interface follows the `Games Hub` design handoff in this project's own
design system, **Modernist**, applied to the app itself rather than kept as
a separate mock (`src/theme/tokens.ts`, `src/theme/type.ts`). Four of its
rules are load-bearing, and `tests/theme.test.ts` fails the build if any of
them slips:

- **Zero radius everywhere.** No rounded corners, no pills. The only curves
  left in the app are circles that are genuinely circles — a ring in the
  icon set, the circle you sort in Sort It Out.
- **Flat.** No gradients, no shadows, no glows. Removing them also removed a
  dependency: `expo-linear-gradient` is gone.
- **Structure comes from rules.** A 2px rule divides one section from the
  next, a 1px rule divides rows inside one, and grid cells are separated by
  1px divider-coloured gaps. There is not a card anywhere in the app.
- **Flush left, one accent.** Button labels included. `#ec3013` marks the
  primary action, the active tab, and small emphasis — never decoration.

Home is the handoff's first screen, built for real: header over a rule,
offline reassurance row, search, `WHO IS PLAYING`, a 184px hero, the
`ON THIS DEVICE` shelf as a 3-up grid, pinned games, and a four-item tab
bar. The handoff's second screen — "let a parent approve a game in
seconds" — landed in **Parent Zone** instead of between a child and the game
they just tapped: the safety tag row, the fact grid, the numbered "what
parents should know" rows and the play-time meter are all there. `TIME` is
the one new destination, and the one tab that isn't gated: how long you have
played is your own information, and reading it changes nothing.

Five things deliberately depart from the handoff, all of them documented at
the call site:

| The handoff | This app | Why |
| --- | --- | --- |
| Rows ≥44px, CTA ~52px | Everything tappable ≥72dp | The app's own floor is higher (SAFETY.md, "Big targets"). It only ever disagrees in the safe direction. |
| Archivo, bundled locally | The platform grotesque at the handoff's weights, sizes and tracking | This repository ships no asset files at all — no images, no fonts, nothing to license or audit. |
| Grayscale key art in every image slot | The game's own drawn mark on a flat field | Same reason: there are no bitmaps here, so the icon *is* the art. |
| Age bands (`Kids 6-12`, `Teen 13-17`, …) | `WHO IS PLAYING` picks a person, and their real age filters the shelf | This app dropped named age groups a while ago — see "Age: a real number, not a named group" above. |
| A PIN for the parent gate | The existing two-digit multiplication question | The gate is a speed bump, not authentication, and deliberately guards nothing whose disclosure would matter. A PIN would be a real secret to store, forget, and reset. |

Colour survives the flattening in exactly two places, and both are about
recognition rather than decoration: a profile keeps its own colour, and the
games keep their colour-blind-safe play palette. A four-year-old picks "the
blue one" long before they can read "Champ", and Sort It Out literally sorts
by colour.

### No emoji in the interface

Every icon is geometry the app draws from plain views — rectangles, circles
and triangles (`src/components/Icon.tsx`) — and a profile is its own initial
on its own colour (`Avatar.tsx`). There are no image files in the repository,
no icon font, and no icon-library dependency, so an icon can't render as a
missing-glyph box on one platform and a cartoon on another.

Four games are the deliberate exception, because there the emoji *are* the
playable material rather than decoration: the symbols you match in Find the
Pairs, the objects you count in How Many?, the tiles you repeat in Pattern
Play, and the picture clue you spell in Spell It!. `tests/chrome.test.ts`
enforces the split — it fails if an emoji appears anywhere outside those four
files, and equally if one of them stops needing its exemption.

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

**Sudoku** and **Pattern Play** are the exceptions, deliberately: every
puzzle and every sequence is procedurally generated (a full-grid solve plus
hole-digging for Sudoku; a randomised tile sequence for Pattern Play), so
there's no fixed pool to exhaust and nothing to avoid repeating — both
already give effectively unlimited variety on their own.

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
    AppProvider.tsx         Profiles, per-profile settings/progress/usage accounting
    profiles.ts             Profile list operations (add/update/remove/switch)
    settings.ts, progress.ts, freshness.ts
  games/
    catalog.ts              Pure game metadata + age/category/search filtering (no React)
    registry.ts             Attaches each game's Screen component to the catalogue
    memory/ counting/ shapes/ wordbuilder/ sudoku/ patternplay/ numbercrunch/
      logic.ts              Pure, seeded, unit-tested game rules
      *Screen.tsx           Presentation only
  screens/                  Home, Parent Zone, Profiles, play time, time's-up
  components/               Shared UI (all targets >= 72dp)
    Icon.tsx                Every icon, drawn from plain views — no assets, no library
    Avatar.tsx              A profile as its initial on its colour
    Rule.tsx                The 2px/1px rules the whole layout is built from
    SectionHeader.tsx       A machine label over a shelf
    TabBar.tsx              GAMES / PARENT / TIME / ME
    FactGrid.tsx            The handoff's fact cells and numbered parent rows
    PlayTimeMeter.tsx       Today's play time as a track and two labels
  theme/
    tokens.ts               Modernist tokens: palette, rules, spacing, type scale
    type.ts                 Heading and machine-label styles built from them
scripts/check-safety.mjs    The build gate
tests/                      Unit tests for all pure logic
```

Game rules are kept in `logic.ts` files with no React and no I/O — every rule
takes a seeded RNG, so round generation can be asserted exhaustively (every
memory deal contains exactly two of each symbol; every sortable item matches
exactly one basket; every round is completable).

## Adding a game

0. Pick something **original or genuinely public-domain** — never a clone of
   a specific commercial game's mechanics-plus-presentation, and never a
   borrowed name, character, or asset. See "Original content, always" in
   **[SAFETY.md](SAFETY.md)** before settling on a concept.
1. Create `src/games/<id>/logic.ts` — pure rules, taking an `Rng` and a `level`.
2. Add `tests/` coverage asserting the round is always completable and fair.
3. Create `<id>Screen.tsx` implementing `GameScreenProps`. Seed local level
   state from the `level` prop, then advance it with `nextLevel` (from
   `src/games/types.ts`) on "Play again" — see any existing game screen for
   the pattern. This is what makes the game's difficulty adaptive rather than
   fixed at whatever the parent chose as a starting point.
4. Add an entry to `GAMES_META` in `src/games/catalog.ts`, including a
   deliberate `minAge`/`maxAge` and a `category` — don't default to "all
   ages" without thinking about it; that's what made an adult's game list
   identical to a young child's before this field existed. Register the
   screen component in `src/games/registry.ts`'s `SCREEN_BY_ID`.

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
