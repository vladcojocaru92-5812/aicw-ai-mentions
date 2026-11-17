import test from 'node:test';
import assert from 'node:assert/strict';

import {
  AI_BOTS,
  parseRobots,
  robotsBlocksAll,
  parseLlmsTxt,
  parseSitemap,
  analyzeSitemap,
  parseHomepage,
  assembleGeoSignals,
  resolveTargetUrl,
} from '../dist/utils/geo-signals.js';

const ROBOTS_MIXED = `# robots for example.com
User-agent: GPTBot
Disallow: /

User-agent: PerplexityBot
Disallow:

User-agent: ClaudeBot
User-agent: Claude-SearchBot
Disallow: /private

User-agent: *
Disallow: /admin

Sitemap: https://example.com/sitemap.xml
Sitemap: https://example.com/sitemap-news.xml
`;

const LLMS = `# Example Corp

> Example Corp builds widgets for teams.

## Products
- [Widget Pro](https://example.com/pro): flagship
- [Widget Lite](https://example.com/lite): free tier

## Docs
- [Getting started](https://example.com/docs/start)
`;

const SITEMAP_URLSET = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>https://example.com/</loc><lastmod>2026-11-01</lastmod></url>
  <url><loc>https://example.com/blog/post-a?x=1&amp;y=2</loc><lastmod>2026-09-01</lastmod></url>
  <url><loc>https://example.com/blog/post-b</loc></url>
  <url><loc>https://example.com/pricing</loc><lastmod>2025-01-01</lastmod></url>
</urlset>`;

const SITEMAP_INDEX = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <sitemap><loc>https://example.com/sitemap-posts.xml</loc></sitemap>
  <sitemap><loc>https://example.com/sitemap-pages.xml</loc></sitemap>
</sitemapindex>`;

const HOMEPAGE_CLEAN = `<!doctype html><html lang="en"><head>
<title>Example Corp — Widgets for teams</title>
<meta name="description" content="We build widgets.">
<script type="application/ld+json">{"@context":"https://schema.org","@graph":[{"@type":"Organization","name":"Example Corp"},{"@type":["WebSite","Product"],"name":"x"}]}</script>
</head><body><h1>Hi</h1></body></html>`;

const HOMEPAGE_WITH_BAD_LD = HOMEPAGE_CLEAN.replace('</head>', '<script type="application/ld+json">{invalid json}</script></head>');

const NOW = Date.parse('2026-11-17T00:00:00Z');
const ok = (url, body) => ({ url, status: 200, body });

function happyInput() {
  return {
    targetUrl: 'https://example.com',
    collectedAt: '2026-11-17T00:00:00.000Z',
    now: NOW,
    robots: ok('https://example.com/robots.txt', ROBOTS_MIXED),
    llms: ok('https://example.com/llms.txt', LLMS),
    homepage: ok('https://example.com/', HOMEPAGE_CLEAN),
    sitemaps: {
      urls: parseSitemap(SITEMAP_URLSET).urls,
      read: ['https://example.com/sitemap.xml'],
      errors: [],
      truncated: false,
    },
  };
}

test('parseRobots classifies the 10 AI bots as blocked/allowed/unspecified', () => {
  const facts = parseRobots(ROBOTS_MIXED);
  assert.equal(Object.keys(facts.aiBots).length, 10);
  assert.deepEqual(Object.keys(facts.aiBots), [...AI_BOTS]);
  assert.equal(facts.aiBots.GPTBot, 'blocked');
  assert.equal(facts.aiBots.PerplexityBot, 'allowed'); // empty Disallow means allow-all
  assert.equal(facts.aiBots.ClaudeBot, 'allowed'); // partial disallow is not a full block
  assert.equal(facts.aiBots['Claude-SearchBot'], 'allowed'); // shared group
  assert.equal(facts.aiBots.OAI_SearchBot ?? facts.aiBots['OAI-SearchBot'], 'unspecified');
  assert.equal(facts.aiBots.Bytespider, 'unspecified');
  assert.equal(facts.disallowCount, 3);
  assert.deepEqual(facts.sitemaps, ['https://example.com/sitemap.xml', 'https://example.com/sitemap-news.xml']);
});

test('parseRobots ignores comments and matches user-agents case-insensitively', () => {
  const facts = parseRobots('USER-AGENT: gptbot # crawler\nDISALLOW: / # everything\n');
  assert.equal(facts.aiBots.GPTBot, 'blocked');
});

test('robotsBlocksAll honors wildcard and named groups but not partial disallows', () => {
  assert.equal(robotsBlocksAll('User-agent: *\nDisallow: /\n', 'aicw-geo-signals'), true);
  assert.equal(robotsBlocksAll(ROBOTS_MIXED, 'aicw-geo-signals'), false);
  assert.equal(robotsBlocksAll(ROBOTS_MIXED, 'GPTBot'), true);
  assert.equal(robotsBlocksAll('User-agent: *\nDisallow: /admin\n', 'aicw-geo-signals'), false);
});

test('parseLlmsTxt extracts title, blockquote summary and sections with link counts', () => {
  const facts = parseLlmsTxt(LLMS);
  assert.equal(facts.title, 'Example Corp');
  assert.equal(facts.summary, 'Example Corp builds widgets for teams.');
  assert.deepEqual(facts.sections, [
    { name: 'Products', links: 2 },
    { name: 'Docs', links: 1 },
  ]);
  assert.equal(facts.linkCount, 3);
  assert.ok(facts.bytes > 0);
});

test('parseLlmsTxt handles empty and title-only files', () => {
  assert.deepEqual(parseLlmsTxt(''), { title: null, summary: null, sections: [], linkCount: 0, bytes: 0 });
  const facts = parseLlmsTxt('# Just a title\n');
  assert.equal(facts.title, 'Just a title');
  assert.equal(facts.summary, null);
  assert.deepEqual(facts.sections, []);
});

test('parseSitemap reads urlset loc/lastmod and decodes XML entities', () => {
  const { urls, children } = parseSitemap(SITEMAP_URLSET);
  assert.equal(urls.length, 4);
  assert.deepEqual(children, []);
  assert.equal(urls[1].loc, 'https://example.com/blog/post-a?x=1&y=2');
  assert.equal(urls[0].lastmod, '2026-11-01');
  assert.equal(urls[2].lastmod, undefined);
});

test('parseSitemap returns children for sitemapindex and no urls', () => {
  const { urls, children } = parseSitemap(SITEMAP_INDEX);
  assert.deepEqual(urls, []);
  assert.deepEqual(children, ['https://example.com/sitemap-posts.xml', 'https://example.com/sitemap-pages.xml']);
});

test('parseSitemap handles an empty urlset', () => {
  const { urls, children } = parseSitemap('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"></urlset>');
  assert.deepEqual(urls, []);
  assert.deepEqual(children, []);
});

test('analyzeSitemap groups page families and measures lastmod freshness', () => {
  const a = analyzeSitemap(parseSitemap(SITEMAP_URLSET).urls, NOW);
  assert.equal(a.totalUrls, 4);
  assert.equal(a.withLastmod, 3);
  assert.equal(a.freshLast30d, 1);
  assert.equal(a.freshLast90d, 2);
  assert.equal(a.newestLastmod, '2026-11-01');
  assert.equal(a.oldestLastmod, '2025-01-01');
  const blog = a.sections.find(s => s.path === '/blog');
  assert.equal(blog.count, 2);
  assert.equal(blog.freshLast90d, 1);
  assert.deepEqual(blog.examples, ['/blog/post-a?x=1&y=2', '/blog/post-b']);
  assert.ok(a.sections.find(s => s.path === '/'));
  assert.ok(a.sections.find(s => s.path === '/(root pages)'));
});

test('analyzeSitemap strips locale prefixes before grouping families', () => {
  const a = analyzeSitemap([
    { loc: 'https://example.com/ro/blog/x' },
    { loc: 'https://example.com/en/blog/y' },
  ], NOW);
  assert.equal(a.sections.length, 1);
  assert.equal(a.sections[0].path, '/blog');
  assert.equal(a.sections[0].count, 2);
});

test('parseHomepage extracts title, meta description and JSON-LD types incl @graph', () => {
  const facts = parseHomepage(HOMEPAGE_CLEAN);
  assert.equal(facts.title, 'Example Corp — Widgets for teams');
  assert.equal(facts.description, 'We build widgets.');
  assert.deepEqual(facts.jsonLdTypes, ['Organization', 'WebSite', 'Product']);
  assert.equal(facts.jsonLdBlocks, 1);
  assert.equal(facts.jsonLdErrors, 0);
});

test('parseHomepage handles reversed meta attribute order and single quotes', () => {
  const facts = parseHomepage("<head><meta content='Reverse order' name='description'><title>T</title></head>");
  assert.equal(facts.description, 'Reverse order');
});

test('parseHomepage counts invalid JSON-LD blocks without losing valid ones', () => {
  const facts = parseHomepage(HOMEPAGE_WITH_BAD_LD);
  assert.equal(facts.jsonLdBlocks, 2);
  assert.equal(facts.jsonLdErrors, 1);
  assert.deepEqual(facts.jsonLdTypes, ['Organization', 'WebSite', 'Product']);
});

test('parseHomepage returns nulls for a bare page', () => {
  const facts = parseHomepage('<html><body>hi</body></html>');
  assert.equal(facts.title, null);
  assert.equal(facts.description, null);
  assert.deepEqual(facts.jsonLdTypes, []);
});

test('assembleGeoSignals emits observations/derivation with ids and ok runs on the happy path', () => {
  const geo = assembleGeoSignals(happyInput());
  assert.equal(geo.targetUrl, 'https://example.com');
  assert.equal(geo.collectedAt, '2026-11-17T00:00:00.000Z');
  assert.deepEqual(geo.observations.map(o => o.id), ['E1', 'E2', 'E3', 'E4']);
  assert.deepEqual(geo.observations.map(o => o.kind), ['observation', 'observation', 'derivation', 'observation']);
  assert.ok(geo.observations.every(o => o.source === 'geo-signals' && o.observedAt === geo.collectedAt));
  assert.match(geo.observations[0].title, /GPTBot/);
  assert.equal(geo.observations[1].data.present, true);
  assert.equal(geo.observations[2].data.analysis.totalUrls, 4);
  assert.deepEqual(geo.unknowns, []);
  assert.deepEqual(geo.runs.map(r => r.status), ['ok', 'ok', 'ok', 'ok']);
});

test('assembleGeoSignals treats verified absence as observation, not unknown', () => {
  const input = happyInput();
  input.llms = { url: 'https://example.com/llms.txt', status: 404 };
  input.sitemaps = { urls: [], read: [], errors: [], truncated: false };
  const geo = assembleGeoSignals(input);
  assert.equal(geo.observations[1].data.present, false);
  assert.match(geo.observations[2].title, /No readable sitemap/i);
  assert.deepEqual(geo.unknowns, []);
});

test('assembleGeoSignals records unknowns for failures, robots skips and parse errors', () => {
  const input = happyInput();
  input.robots = { url: 'https://example.com/robots.txt', error: 'fetch failed' };
  input.homepage = { url: 'https://example.com/', skipped: 'robots.txt disallows all crawling' };
  input.sitemaps = { urls: [], read: [], errors: ['https://example.com/sitemap.xml: HTTP 500'], truncated: false };
  input.homepage = { url: 'https://example.com/', status: 200, body: HOMEPAGE_WITH_BAD_LD };
  const geo = assembleGeoSignals(input);
  // robots unreachable, homepage JSON-LD parse error, sitemap fetch error
  assert.equal(geo.unknowns.length, 3);
  assert.ok(geo.unknowns.some(u => u.manualCheck === 'https://example.com/robots.txt'));
  assert.ok(geo.unknowns.every(u => u.channel === 'geo' && u.reason.length > 0));
  assert.equal(geo.runs.find(r => r.source === 'robots.txt').status, 'error');
  assert.equal(geo.observations.length, 3); // no robots observation when unreachable
});

test('assembleGeoSignals records an unknown when homepage is skipped by robots', () => {
  const input = happyInput();
  input.homepage = { url: 'https://example.com/', skipped: 'robots.txt disallows all crawling' };
  const geo = assembleGeoSignals(input);
  assert.ok(geo.unknowns.some(u => /robots/i.test(u.reason)));
  assert.equal(geo.runs.find(r => r.source === 'homepage').status, 'skipped');
  assert.equal(geo.observations.length, 3);
});

test('assembleGeoSignals flags truncated sitemap crawls as a lower bound', () => {
  const input = happyInput();
  input.sitemaps.truncated = true;
  const geo = assembleGeoSignals(input);
  assert.ok(geo.unknowns.some(u => /lower bound|truncat/i.test(u.reason)));
});

test('assembleGeoSignals treats an HTML robots response as unverifiable', () => {
  const input = happyInput();
  input.robots = ok('https://example.com/robots.txt', '<!doctype html><html><body>SPA</body></html>');
  const geo = assembleGeoSignals(input);
  assert.ok(geo.unknowns.some(u => /robots/i.test(u.reason)));
  assert.equal(geo.observations.length, 3);
});

test('resolveTargetUrl prefers --url flag over env and rejects missing values', () => {
  assert.equal(resolveTargetUrl(['proj', '--url', 'https://x.com'], {}), 'https://x.com');
  assert.equal(resolveTargetUrl(['proj'], { AICW_GEO_SIGNALS_URL: 'https://y.com' }), 'https://y.com');
  assert.equal(resolveTargetUrl(['proj', '--url', 'https://x.com'], { AICW_GEO_SIGNALS_URL: 'https://y.com' }), 'https://x.com');
  assert.equal(resolveTargetUrl([], {}), null);
  assert.equal(resolveTargetUrl(['proj', '--url'], {}), null);
  assert.equal(resolveTargetUrl(['proj', '--url', '--date', '2026-01-01'], {}), null);
});
