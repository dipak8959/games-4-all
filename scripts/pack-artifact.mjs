// Packs an exported web build into one self-contained HTML file.
//
//   npx expo export --platform web --output-dir dist-web
//   node scripts/pack-artifact.mjs dist-web out.html
//
// Used for the phone-testable preview. The two Archivo faces are embedded as
// data URIs rather than left as paths: the output is a single file with no
// companion assets, so a relative font URL silently 404s and the page falls
// back to system type — which looks like a design bug rather than a missing
// file. Everything else the app needs is already inside the JS bundle,
// because the app ships no other assets and makes no network requests.
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const [dir = 'dist-web', out = 'games-4-all.html'] = process.argv.slice(2);

const jsDir = join(dir, '_expo/static/js/web');
const jsFile = readdirSync(jsDir).find((f) => f.endsWith('.js'));
if (!jsFile) throw new Error(`no bundle in ${jsDir}`);
let js = readFileSync(join(jsDir, jsFile), 'utf8');

const fontDir = join(dir, 'assets/assets/fonts');
const faces = readdirSync(fontDir).filter((f) => f.endsWith('.ttf'));
if (faces.length !== 2) throw new Error(`expected 2 font faces, found ${faces.length}`);

for (const file of faces) {
  const data = readFileSync(join(fontDir, file)).toString('base64');
  // The bundle exports the path with a leading slash. Replace the whole
  // quoted string, or that slash is left prefixing the data URI and the
  // face fails to load.
  const quoted = `"/assets/assets/fonts/${file}"`;
  if (!js.includes(quoted)) throw new Error(`bundle has no reference to ${quoted}`);
  js = js.replaceAll(quoted, `"data:font/ttf;base64,${data}"`);
}

writeFileSync(
  out,
  `<title>Games 4 All</title>
<style>
  html, body { height: 100%; margin: 0; }
  body { overflow: hidden; background: #f3f2f2; }
  #root { display: flex; height: 100%; flex: 1; }
</style>
<div id="root"></div>
<script>
${js.replaceAll('</script', '<\\/script')}
</script>
`,
);

console.log(`packed ${faces.length} faces into ${out}`);
