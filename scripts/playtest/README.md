# Playtests

Five passes that play the real app in a real browser. Nothing here imports
the games' logic: each pass reads the board through the same accessibility
labels a screen reader gets, works out the answer itself, and taps. A pass
only goes green if what a child actually touches works.

| Pass | What it covers |
| --- | --- |
| `play-every-game.mjs` | Every game played to the end, then "Play again", "Back to games" and the Parent Zone's round counts. |
| `edge-cases.mjs` | Every game at a 3-year-old's level and at a 17-year-old's, wrong answers on purpose, tiles tapped before they're live, and rounds abandoned half-way. |
| `rapid-taps.mjs` | Five fast taps on one answer, and five on "Play again" — neither may count twice. |
| `tap-targets.mjs` | Every screen on a 320x568 phone — Home, search, TIME, the gate, Parent Zone, Profiles, the editor, and every game at level 1 and 6 — measured for 72dp targets, sideways scrolling, and buttons that can't be reached. |
| `screen-time.mjs` | The limits a grown-up sets, on a clock the pass moves on: a sitting spans games, the stop screen stays until a grown-up changes the limit, and a new day brings a new allowance. |

## Running them

Playwright is deliberately not a dependency of this project: the app ships
with a minimal dep surface on purpose (see `SAFETY.md`), and a browser driver
has no business in it. Install it wherever you run these, then:

```sh
npx expo export --platform web --output-dir dist-web
python3 -m http.server 8099 --directory dist-web &
node scripts/playtest/play-every-game.mjs
node scripts/playtest/edge-cases.mjs
node scripts/playtest/rapid-taps.mjs
node scripts/playtest/screen-time.mjs
node scripts/playtest/tap-targets.mjs
```

`PLAYTEST_URL` overrides where the build is served from; `PLAYTEST_CHROME`
points at a Chromium binary if Playwright's own download isn't on the machine.
Each pass exits non-zero if it finds a bug or the page logs an error.

## What they have caught

- Pattern Play's reveal started on the same frame the screen mounted, so the
  first tile lit during the tap that opened the game and again the instant
  "Play again" dismissed the round-complete card. Step one was effectively
  invisible. Fixed with a lead-in pause (`REVEAL_LEAD_IN_MS`).
- A lit Pattern Play tile was signalled by its accent fill and nothing else:
  `accessibilityState.selected` is not a valid ARIA state on a button, so
  react-native-web dropped it and the web build had no accessible equivalent.
  The lit state is now part of the tile's accessible name.
- Puddle Hop lost quick taps on the web. react-native-web holds back
  `onPressIn` for 50ms by default, and a tap released inside that window is
  never reported, so the hop never happened — and every hop that did landed
  50ms after the child meant it. The stage now asks for presses at once.
- The sitting limit never held. Leaving a game ended the sitting, so going
  Home and into another game started the count again — and when a limit was
  reached mid-game, the app's own trip back to Home ended the sitting too,
  and the break screen cleared itself the moment it appeared. Leaving a game
  now only stops the clock. The same pass found that a day's stop screen,
  left open overnight, was still there in the morning.
- On a 320dp phone, four 72dp tiles and their rules don't fit between the
  gutters: four-wide grids wrapped to three columns (Tile Slide, Memory
  Grid), Treasure Hunt's map spilled up over the Back button, and the arrow
  pads wrapped "right" under "up". Grids and arrow rows now shrink to the
  minimum first and may use the gutters (`fitTiles`, `useKeyRow`).
- Home and the grown-up screens had never been measured, and broke the 72dp
  floor in several places. The pin star on every game card was 26dp; its
  `hitSlop` reached 58dp on a phone and does nothing on the web, while
  SAFETY.md said 72. "Clear search" was 16dp, and the search field was a
  33dp line inside its 72dp box. Also under 72dp: the profile button,
  Parent Zone's limit chips and switches, and the profile editor's colours
  and names.
- A finished round left by the arrow at the top of the screen was never
  recorded. The round-complete card covers the game but not its header, and
  only the card's own "Back to games" saved the stars and moved the level.
  Every way out (the arrow, and Android's back) now goes through the card
  while it is up.
- react-native-web ignores `accessibilityState`, so on the web a screen
  reader heard no selected or checked state at all: not which limit was
  set, which colour or name was chosen, or whether a switch was on. These
  now use `aria-checked` and `aria-selected`, which React Native maps to
  the same state on phones. Sudoku's cells were only "empty cell" or a
  digit; they now say their row and column.
- Walking through as a family rather than a script found four things no
  pass was looking for:
  - A time limit arrived with no warning: the game vanished mid-round. The
    last two minutes now show a small clock and the minutes left in the
    game's header (screen-time.mjs checks it).
  - Home forgot where a child was after every game: back at the top, the
    kind of game they'd picked cleared (edge-cases.mjs checks it).
  - Treasure Hunt's diagonal clue, a chevron turned 45°, read as a corner
    ("┐"), not an arrow. It has a shaft now.
  - On the web, react-native-web drew the "on" switches' thumbs in its own
    teal.
