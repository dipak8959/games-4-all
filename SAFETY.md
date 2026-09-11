# Child safety model

This is a whole-family device app: a young child, an older sibling, and a
parent can each have their own profile and share it. The child-safety model
below is not one mode among several — it is the only mode, applied to the
whole app regardless of which profile is active. There is no "grown-up mode"
that relaxes any of it, because a device left open on a parent's profile is
still a device a child can pick up. The design principle is therefore not
"handle children's data carefully" but **collect nothing and connect
nowhere**, so that there is no data to mishandle and no channel to misuse —
for a 4-year-old's profile or a 40-year-old's.

Every claim below is enforced by `npm run safety`, which fails the build on
violation. The rules live in `scripts/check-safety.mjs`.

## What the app does not do

| Guarantee | How it is enforced |
| --- | --- |
| No network requests of any kind | `fetch`, `XMLHttpRequest`, `WebSocket`, and `sendBeacon` are rejected in source by the safety check. Release Android builds additionally have `INTERNET` stripped from the manifest (`app.config.ts`). |
| No adverts | Every known mobile ad SDK is on the banned-dependency list, checked against both `package.json` and the full resolved lockfile. |
| No analytics, telemetry, or crash reporting | Same banned-dependency list (Segment, Amplitude, Mixpanel, PostHog, Sentry, Firebase, AppsFlyer, …). |
| No in-app purchases | Purchase and subscription SDKs are banned. There is no store, no currency, and no paid content. |
| No accounts or sign-in | There is no auth code and no social-login SDK. Nothing identifies a child. |
| No third-party trackers or ad identifiers | `AD_ID` is blocked in the manifest; IDFA/device-info packages are banned. |
| No device permissions | `app.json` must declare an empty `android.permissions` array, and must explicitly block location, camera, microphone, contacts, and advertising ID. |
| No links out of the app | `Linking.openURL` and `WebView` are rejected in source, so a child cannot be sent to a browser, a store page, or any external content. |
| No user-generated or remote content | All game content ships in the bundle. There is nothing to moderate because nothing arrives from outside. |

## What the app does store

Five keys in the device's own sandboxed storage, listed in `src/storage.ts`:

- `g4a:profiles` — each profile's name, colour, and age
- `g4a:settings` — each profile's chosen limits and toggles
- `g4a:progress` — each profile's rounds played, stars earned, and current
  adaptive level per game
- `g4a:usage` — each profile's play time today
- `g4a:freshness` — which pictures, numerals, or sorting rule each game most
  recently showed to each profile, so the next round avoids repeating it
  (see "Staying fresh round to round" in `README.md`)

Adding a profile never adds a storage key: `settings`/`progress`/`usage`/
`freshness` each hold one record keyed by profile id, so the enumerated key
list stays exactly five no matter how many people share the device
(`AppProvider`).

No identifiers, no timestamps beyond the current day, nothing about the
child beyond what a grown-up chose to enter for them — and even that is
never free text. A profile's name is picked from a fixed list of ten (see
`NAME_CHOICES` in `src/state/profiles.ts`), not typed, so there is no
keyboard anywhere in profile creation and nothing arbitrary to ever store.
`g4a:freshness` in particular holds nothing but content already visible on
screen a moment earlier. Parent Zone offers **Delete all data**, which
removes all five keys entirely — every profile, not just the active one.
Because the key list is closed and enumerated, that deletion is complete by
construction.

## Screen time

The `TIME` tab shows how long today has gone — played today, this sitting,
and what is left — and is the one destination in the app that is *not*
gated. Reading the number changes nothing, and a child who can see it is
better placed to stop on their own than one who is simply cut off. Changing
a limit still needs a grown-up.

Two independent limits, both off by default and both parent-set:

- **Per sitting** — how long one continuous session may run
- **Per day** — total play across the calendar day, reset at local midnight

Time accrues only while a game is actually on screen and the app is
foregrounded; menus and Parent Zone are free. Logic lives in
`src/safety/screenTime.ts` and is unit-tested for the cases that matter:
midnight rollover, backgrounding, and device clock changes (a clock jump
backwards or forwards cannot silently consume or refund the day's allowance).

When a limit is reached the child sees a friendly stop screen. There is no way
to dismiss it and no "watch an advert for more time" — only a grown-up can
change the limit.

## Parent gate

Settings, limits, deletion, and **switching or managing profiles** all sit
behind a gate (`src/safety/parentGate.ts`) that asks a two-digit
multiplication question, well beyond the target age band. (The `Games Hub`
design handoff asks for a PIN here instead. The question stayed: this gate
is a speed bump, not authentication, and a PIN would be a real secret to
store, forget, and reset — see the end of this section.) A wrong answer
re-rolls the question rather than allowing repeated guesses at the same one,
so trial-and-error is impractical.

Profiles are gated on the same terms as everything else in Parent Zone: a
child should never be able to hand themselves an adult's profile, an older
sibling's, or create a new one, without a grown-up passing this gate first —
see "Switching who's playing" below.

This is a **speed bump, not authentication.** It stops a child wandering into
settings. It is not a secret and deliberately guards nothing whose disclosure
would matter — worst case, a determined older child changes their own screen
time limit.

## The charter: what a game has to be

Ten principles, in one place, in `src/games/charter.ts`. That file is the
list — everything below and above in this document explains a principle, and
the principles themselves live in code so they can be run rather than only
read.

| | Principle | Rule |
| --- | --- | --- |
| 1 | Offline | Works with nothing connected, and reaches nothing outside the device. |
| 2 | Nothing to sell | No ads, purchases, accounts, analytics, third-party SDKs or device permissions. |
| 3 | It ends | A round ends on its own, at a point fixed before it started. |
| 4 | Nothing to lose | No timers, no lives, no game-over. |
| 5 | Nothing to chase | No scores, streaks, leaderboards, multipliers, daily rewards or self-starting rounds. |
| 6 | Worth the time | It practises something nameable, stated plainly enough to show a parent. |
| 7 | Honest age | Its age range is a deliberate claim about who it suits, not "everyone" by default. |
| 8 | Original | Invented here, or a format old enough to belong to everyone. |
| 9 | Plays without reading | A child who cannot read can play it, unless reading is the skill. |
| 10 | Reachable by a child | Nothing under 72dp, always escapable, and colour is never the only signal. |

### The gate runs before the game is built

The trouble with rules that live in a build script is that they fire after
someone has built the thing. The expensive moment is earlier — a brainstorm
that produces a game which should never exist.

So an idea is written down first, as a `GameProposal` (see
`src/games/catalog.ts`), and checked:

```bash
npm run propose proposals/my-idea.json
```

It reports per principle, and separates **blocks** — the idea cannot be
built as described — from **ask**, which is a question only a person can
answer and never a refusal. It catches a round that ends only when you fail,
a "skill" of *fun*, a borrowed commercial name hiding in the prior-art
field, an age range nobody set, and pieces told apart by colour alone.

A blocked idea reads like this:

```
✖ proposals/tile-rush.json — Tile Rush (3-99)
    BLOCKS IT_ENDS
           "When you run out of lives, or forever if you are good enough" describes
           a run that only stops when the player does. A round has to end on its own.
    BLOCKS NOTHING_TO_CHASE
           Mentions "high score". That mechanic works by making stopping cost something.
    BLOCKS WORTH_THE_TIME
           "Fun" is not a skill. Name what a child gets better at.
    BLOCKS REACHABLE_BY_A_CHILD
           Tells pieces apart by colour alone. Roughly one boy in twelve cannot.
    ASK    HONEST_AGE
           Spans three to ninety-nine. Is this one of the few games that genuinely
           suits a three-year-old and an adult, or is the range just unset?
```

It is not a substitute for judgement. It cannot tell you whether a game is
any good; it tells you whether it is the kind of thing that belongs here.

### Why the gate cannot rot

`GameMeta` is `GameProposal` plus presentation, so **a shipped game is a
passed proposal by construction**, and `tests/charter.test.ts` runs the same
gate over the entire live catalogue on every CI run. A principle the seven
existing games cannot satisfy is a wrong principle and fails the build
immediately. The catalogue is the gate's fixture set, which is what stops it
drifting into a document nobody applies.

## Design rules for the games themselves

Safety for this age range is as much about tone as about data. Every rule
below holds for every game in the catalogue, including "Spell It!" — the one
game where reading is the point rather than something to avoid:

- **No losing.** No timers, no lives, no game-over. A round ends when it is
  finished; a wrong answer produces a soft nudge and the child tries again.
- **No zero score.** Completing a round always earns at least one star
  (`starsForMistakes`). Stars reward effort, not perfection.
- **No engagement mechanics.** No streaks, no daily-login rewards, no
  notifications, no "come back tomorrow" pressure. Nothing here is designed to
  maximise time-in-app — the screen-time limits point the other way.
- **Reading is never required to navigate or play, except where it's the
  explicit skill.** Home, Parent Zone, and six of the seven games are
  navigated entirely by icon, colour, shape, and number — no child needs to
  read anything to use this app. "Spell It!" is the deliberate exception: it
  teaches reading and spelling, so reading its own picture clue is the task,
  not a barrier to it — see its `minAge`/`maxAge` in `src/games/catalog.ts`.
  "Sudoku" needs no reading either, just numbers a young child already
  knows — what it needs is holding a row/column/box rule in mind at once, a
  later-developing reasoning skill rather than a literacy one, which is why
  it's capped at the young end but not the old one.
- **Colour is never the only signal.** The palette is Okabe-Ito derived, and
  anything identified by colour also differs in shape, so the games work for
  colour-blind players. The interface is ink on a light ground with one
  accent red used sparingly, and colour is now kept for the two jobs where it
  actually carries meaning: telling one profile from another, and being the
  content of a round in "Sort It Out", where the task is literally to match a
  colour. Nothing else in any game depends on colour — a card is told apart
  by its picture, a tile by its glyph, an answer by its number. Pattern Play in particular gives every tile a
  distinct drawn mark — filled against hollow, square against round, up
  against down — so a sequence is followed by shape and never by colour.
- **Big targets.** Nothing tappable is under 72dp, above both platform
  minimums — and above the design handoff's own 44-52px rows, which is why
  the tab bar and the buttons are drawn taller here than the handoff draws
  them. Where this app and the handoff disagree on a touch target, this app
  wins, and only ever in the safe direction (`tests/theme.test.ts` asserts
  it). Sudoku's grid cells are the one deliberate exception (a 9x9 board
  cannot fit 72dp cells on a phone screen), and only after selecting a
  cell does the actual answer get entered on full-sized number buttons. A
  game card's pin/favourite star is visually smaller (40dp) but carries
  `hitSlop` out to a 72dp effective touch target, since it's a secondary,
  fully-reversible action rather than the card's primary "play this" tap.
- **Always escapable.** Every game has a large back control that exits
  immediately, with no confirmation dialog to read.
- **Motion is optional.** The OS "reduce motion" setting is honoured
  automatically, and can also be set per-profile in Parent Zone.

## Nothing here is built to be hard to stop

Childhood gaming addiction is real, and the mechanics that cause it are
design choices rather than accidents. This app makes them impossible to add
by accident, and `npm run safety` fails the build on any of them.

**The load-bearing property is that every round ends.** Not "ends when you
lose" and not "ends when you get bored" — ends on its own, at a point fixed
before you started: five questions answered, the grid filled, the sequence
repeated back. Every game declares that ending as a required field
(`roundEnds` in `src/games/catalog.ts`) and Parent Zone shows it, so a
parent can see for each game exactly what finishes it. A game that only ends
when you fail, or never ends at all, cannot fill that field with anything
true — which is the point of requiring it.

That matters more than the "no losing" rule it sits beside. An endless game
is one a child is always *mid-something* in, so every moment is a bad moment
to stop; a bounded one hands them a natural place to put the phone down,
several times an hour.

Also banned outright, as identifiers rather than as words — naming one in a
comment or in parent-facing copy is fine, building one is not:

| Mechanic | Why it is banned |
| --- | --- |
| High scores, personal bests | Turns stopping into losing something. There is no score in this app, only stars for finishing. |
| Streaks | Makes not playing today cost something. |
| Leaderboards | Ranks children against each other, and needs a network this app does not have. |
| Combo and score multipliers | Escalating reward for uninterrupted play — the "don't stop now" mechanic. |
| Daily rewards, bonuses, login gifts | Schedules the child's day around the app. |
| Rounds that start themselves | Removes the decision to continue. Every round here needs a deliberate tap. |
| Endless or infinite modes | Removes the ending, which is the whole safeguard. |

Two existing rules carry the same weight and are listed under "Design rules
for the games themselves" above: no timers, lives, or game-over; and no
notifications of any kind.

**Every game must also be worth the time.** Each entry declares what it
practises (`skill`), and that is shown to parents too. "It passes the time"
is not an entry in this catalogue. This applies hardest below 18, where the
whole catalogue is filtered by age: a game that exists only to be replayed
has no place in a child's list.

## Switching who's playing

A parent and each child sharing this device get their own profile
(`src/state/profiles.ts`), and switching between them — or creating, editing,
or removing one — always requires the parent gate, every time, with no
"remember this device" bypass. This holds regardless of which profile is
currently active: a child's own profile being open does not relax the gate
for switching to someone else's.

Profile identification never involves typed text: a name is chosen from a
fixed list, a colour from the palette, and age from a stepper — a profile
shows as its own initial on that colour (`Avatar.tsx`) —
see "What the app does store" above for why. Removing a profile deletes that
profile's stars, levels, and settings immediately; it does not touch anyone
else's.

## Original content, always

Every game concept, name, character, and asset in this catalogue must be
**original or genuinely public-domain** — never a copy, clone, or reskin of
someone else's copyrighted or trademarked game. This is a standing rule for
every game added from here on, not just the ones that exist today:

- **No copying a licensed game's mechanics-plus-presentation.** Building on a
  *generic, centuries-old or public-domain game type* is fine and is most of
  this catalogue already — matching-pairs ("Concentration"), sorting, sudoku,
  arithmetic, and watch-and-repeat sequence games are all public-domain
  formats with no single owner. Copying a specific *commercial* game's
  distinctive rules, level design, or visual identity (a falling-blocks game
  styled after Tetris, a candy-swapping match-3 styled after Candy Crush, a
  word-guessing grid styled after Wordle) is not — the mechanic being
  simple or old doesn't make a specific commercial implementation of it fair
  game to imitate.
- **No borrowed names or characters.** Nothing here is named after, themed
  around, or visually referencing an existing franchise, mascot, or branded
  game — no licensed characters, no trademarked game names repurposed as a
  game title. (Pattern Play, this catalogue's sequence-memory game, is
  deliberately not called "Simon" for exactly this reason — the mechanic is
  a public-domain idea, "Simon" is a trademarked product name.)
- **No borrowed assets.** Every icon is geometry the app draws at runtime
  from plain views — rectangles, circles and triangles (`Icon.tsx`) — and
  every game shape is drawn the same way (`Shape.tsx`). There are no image
  files in this repository at all, no icon font, and no icon library
  dependency to audit. This is why the design handoff's grayscale key art
  became a drawn mark rather than a shipped bitmap.

  The one asset this project ships is a typeface: **Archivo 400 and 800**
  (`assets/fonts/`), which the design system specifies. It is used under the
  **SIL Open Font License 1.1** — a licence that explicitly permits bundling
  and redistribution — and its full text ships beside it in
  `assets/fonts/OFL.txt`, as that licence requires. It is bundled rather than
  fetched, because this app makes no network requests at all: a webfont was
  never an option here, and the handoff asks for it to be local anyway.
  `tests/theme.test.ts` fails if either face or the licence goes missing.
  No copied images, no ripped audio, and no font without a licence that
  plainly allows this.
- **When in doubt, go generic.** A game named for what it teaches ("Number
  Crunch", "Sort It Out") rather than for a franchise is both safer and more
  honest about what a parent is getting.

This isn't just a legal precaution — it's consistent with the rest of this
app's model: no external dependency, no external IP, nothing that ties this
app's fate to anyone else's rights or brand.

## Reviewing a change

`npm run verify` runs the safety gate, the type checker, and the unit tests. CI
runs the same command. If you add a dependency, the lockfile check will catch a
banned package pulled in transitively — do not silence it without understanding
what it does on a child's device.
