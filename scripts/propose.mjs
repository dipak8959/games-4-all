// Runs the charter against a game idea, before anyone builds it.
//
//   npm run propose proposals/shape-builder.json
//   npm run propose            # checks every idea in proposals/
//
// A proposal is a JSON file in `GameProposal` shape (see src/games/catalog.ts).
// The point is to fail a bad idea in the ten seconds it takes to write it
// down, rather than after a day of building it.
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, relative } from 'node:path';

import { isAccepted, principle, reviewProposal } from '../src/games/charter.ts';

const ROOT = new URL('..', import.meta.url).pathname;
const DIR = join(ROOT, 'proposals');

const args = process.argv.slice(2);
const files = args.length
  ? args
  : existsSync(DIR)
    ? readdirSync(DIR).filter((f) => f.endsWith('.json')).map((f) => join(DIR, f))
    : [];

if (files.length === 0) {
  console.error('No proposals to check. Pass a JSON file, or put one in proposals/.');
  process.exit(1);
}

const REQUIRED = ['id', 'title', 'skill', 'roundEnds', 'category', 'minAge', 'maxAge', 'origin', 'toldApartBy'];

let rejected = 0;

for (const file of files) {
  const proposal = JSON.parse(readFileSync(file, 'utf8'));
  const name = relative(ROOT, file);

  const missing = REQUIRED.filter((key) => proposal[key] === undefined);
  if (missing.length > 0) {
    console.log(`\n✖ ${name} — ${proposal.title ?? 'untitled'}`);
    console.log(`    Not reviewable yet. Missing: ${missing.join(', ')}`);
    console.log('    Every field is a question the charter needs answered.');
    rejected += 1;
    continue;
  }

  const findings = reviewProposal(proposal);
  const accepted = isAccepted(findings);
  if (!accepted) rejected += 1;

  console.log(`\n${accepted ? '✔' : '✖'} ${name} — ${proposal.title} (${proposal.minAge}-${proposal.maxAge})`);

  if (findings.length === 0) {
    console.log('    Clears every check that can be made before building.');
    console.log('    Whether it is a good game is still yours to judge.');
  }

  for (const finding of findings) {
    const mark = finding.severity === 'blocks' ? 'BLOCKS' : 'ASK   ';
    console.log(`    ${mark} ${finding.principle}`);
    console.log(`           ${finding.message}`);
    console.log(`           Rule: ${principle(finding.principle).rule}`);
  }
}

console.log(
  `\n${files.length} proposal${files.length === 1 ? '' : 's'} checked · ${files.length - rejected} accepted · ${rejected} blocked\n`,
);

process.exit(rejected > 0 ? 1 : 0);
