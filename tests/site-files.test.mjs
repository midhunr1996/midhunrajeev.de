// Deployment integrity: the published folder carries the files GitHub Pages and search engines need,
// and the page points at its real public address.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const site = (name) => fileURLToPath(new URL(`../site/${name}`, import.meta.url));
const read = (name) => readFileSync(site(name), 'utf8');
const ORIGIN = 'https://midhunrajeev.de';

test('CNAME holds the bare domain for GitHub Pages', () => {
  assert.equal(read('CNAME').trim(), 'midhunrajeev.de');
});

test('.nojekyll and a 404 page exist', () => {
  assert.ok(existsSync(site('.nojekyll')));
  assert.ok(read('404.html').includes('<title>'));
});

test('index.html declares the public origin as canonical and Open Graph URL', () => {
  const html = read('index.html');
  assert.ok(html.includes(`<link rel="canonical" href="${ORIGIN}/">`));
  assert.ok(html.includes(`<meta property="og:url" content="${ORIGIN}/">`));
  assert.ok(html.includes(`<meta property="og:image" content="${ORIGIN}/assets/img/og-card.jpg">`));
  assert.equal(html.includes('ts.net'), false, 'no leftover Tailscale address');
  assert.equal(/served from my own laptop/i.test(html), false, 'footer no longer claims laptop hosting');
});

test('index.html embeds Person structured data with the public links', () => {
  const html = read('index.html');
  const match = /<script type="application\/ld\+json">([\s\S]*?)<\/script>/.exec(html);
  assert.ok(match, 'JSON-LD block present');
  const data = JSON.parse(match[1]);
  assert.equal(data['@type'], 'Person');
  assert.equal(data.name, 'Midhun Rajeev');
  assert.equal(data.url, `${ORIGIN}/`);
  assert.ok(data.sameAs.some((url) => url.includes('linkedin.com/in/midhun-rajeev1060')));
  assert.ok(data.sameAs.some((url) => url.includes('github.com/midhunr1996')));
});

test('robots.txt allows crawling and names the sitemap', () => {
  const robots = read('robots.txt');
  assert.match(robots, /^User-agent: \*$/m);
  assert.match(robots, /^Allow: \/$/m);
  assert.match(robots, new RegExp(`^Sitemap: ${ORIGIN}/sitemap\.xml$`, 'm'));
});

test('sitemap.xml lists the home page with an ISO date', () => {
  const sitemap = read('sitemap.xml');
  assert.ok(sitemap.includes(`<loc>${ORIGIN}/</loc>`));
  assert.match(sitemap, /<lastmod>\d{4}-\d{2}-\d{2}<\/lastmod>/);
});
