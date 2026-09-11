# Playtests

Three passes that play the real app in a real browser. Nothing here imports
the games' logic: each pass reads the board through the same accessibility
labels a screen reader gets, works out the answer itself, and taps. A pass
only goes green if what a child actually touches works.

| Pass | What it covers |
| --- | --- |
| `play-every-game.mjs` | Every game played to the end, then "Play again", "Back to games" and the Parent Zone's round counts. |
| `edge-cases.mjs` | Every game at a 3-year-old's level and at a 17-year-old's, wrong answers on purpose, tiles tapped before they're live, and rounds abandoned half-way. |
| `rapid-taps.mjs` | Five fast taps on one answer, and five on "Play again" — neither may count twice. |

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
