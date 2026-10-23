// The gh-pages branch contains the research website, while main contains the
// Next.js product. Build the actual website for this branch's Vercel previews.
import { cpSync, mkdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const source = new URL('../', import.meta.url);
const output = new URL('./dist/', import.meta.url);
const html = readFileSync(new URL('index.html', source), 'utf8');
if (!html.includes('https://tianfu.wang/gen-mentor/') || html.includes('tianfuwang.tech')) {
  throw new Error('Website URLs must agree with the new canonical origin.');
}
mkdirSync(output, { recursive: true });
for (const name of ['index.html', 'sitemap.xml', 'static']) {
  cpSync(new URL(name, source), new URL(name, output), { recursive: true });
}
console.log(`Built the GenMentor research website at ${fileURLToPath(output)}`);
