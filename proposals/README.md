# Proposals

Game ideas waiting on the charter, one JSON file each, in `GameProposal`
shape (see `src/games/catalog.ts`).

```bash
npm run propose                       # every idea in here
npm run propose proposals/my-idea.json
```

Write the idea down *before* building it. Every field is a question the
charter needs answered, and an idea that cannot answer them is one that
should not be built — which costs ten seconds to find out here and a day to
find out later.

A file stays here until its game ships, then the entry moves into
`GAMES_META` with an icon and colour added. Nothing else changes: `GameMeta`
is `GameProposal` plus presentation, so the fields carry over as they are.
