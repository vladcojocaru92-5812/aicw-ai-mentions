/**
 * On-site GEO signals: pure parsers + evidence assembly for llms.txt,
 * robots.txt (AI-bot stance), sitemaps and homepage structured data.
 *
 * Data contract (pattern ported from REM's evidence store): every fact is an
 * `observation` (seen directly at a URL) or a `derivation` (computed from
 * observations). Anything that could not be verified is an `unknown`, never
 * silently treated as absence. Verified absence (HTTP 404/410) IS an
 * observation. Interpretations belong to the report layer and should cite
 * observation ids.
 *
 * The fetch-geo-signals action merges the assembled GeoSignalsData into the
 * project's aggregated compiled data file (<date>-data.js) as `geoSignals`.
 *
 * Bot stance semantics: blocked = the bot's group contains `Disallow: /`;
 * allowed = a group names the bot without a full-site disallow (an empty
 * `Disallow:` means allow-all); unspecified = no group names the bot.
 */

export const AI_BOTS = ['GPTBot', 'OAI-SearchBot', 'ChatGPT-User', 'ClaudeBot', 'Claude-SearchBot', 'PerplexityBot', 'Google-Extended', 'CCBot', 'Applebot-Extended', 'Bytespider'];

export type BotStance = 'allowed' | 'blocked' | 'unspecified';

export interface RobotsFacts {
  sitemaps: string[];
  aiBots: Record<string, BotStance>;
  disallowCount: number;
}

export interface LlmsSection {
  name: string;
  links: number;
}

export interface LlmsFacts {
  title: string | null;
  summary: string | null;
  sections: LlmsSection[];
  linkCount: number;
  bytes: number;
}

export interface SitemapUrl {
  loc: string;
  lastmod?: string;
}

export interface SitemapSection {
  path: string;
  count: number;
  examples: string[];
  freshLast90d: number;
}

export interface SitemapAnalysis {
  totalUrls: number;
  sections: SitemapSection[];
  withLastmod: number;
  freshLast30d: number;
  freshLast90d: number;
  newestLastmod: string | null;
  oldestLastmod: string | null;
}

export interface HomepageFacts {
  title: string | null;
  description: string | null;
  jsonLdTypes: string[];
  jsonLdBlocks: number;
  jsonLdErrors: number;
}

/** Result of one HTTP fetch, decoupled from I/O so assembly is testable offline. */
export interface FetchOutcome {
  url: string;
  status?: number;
  body?: string;
  error?: string;
  truncated?: boolean;
  skipped?: string;
}

export interface SitemapFetchResult {
  urls: SitemapUrl[];
  read: string[];
  errors: string[];
  truncated: boolean;
}

export interface GeoSignalsInput {
  targetUrl: string;
  robots: FetchOutcome;
  llms: FetchOutcome;
  homepage: FetchOutcome;
  sitemaps: SitemapFetchResult;
  collectedAt?: string;
  now?: number;
}

export interface GeoObservation {
  id: string;
  source: 'geo-signals';
  kind: 'observation' | 'derivation';
  title: string;
  url?: string;
  observedAt: string;
  data: any;
}

export interface GeoUnknown {
  channel: 'geo';
  reason: string;
  manualCheck?: string;
}

export interface GeoRun {
  source: string;
  status: 'ok' | 'skipped' | 'error';
  reason?: string;
}

export interface GeoSignalsData {
  collectedAt: string;
  targetUrl: string;
  observations: GeoObservation[];
  unknowns: GeoUnknown[];
  runs: GeoRun[];
}

interface RobotsGroup {
  agents: string[];
  rules: string[];
}

/** Consecutive User-agent lines share one group; a rule line closes it. */
function parseRobotsGroups(txt: string): RobotsGroup[] {
  const groups: RobotsGroup[] = [];
  let cur: RobotsGroup | null = null;
  for (const line of txt.split(/\r?\n/)) {
    const l = line.replace(/#.*/, '').trim();
    const ua = l.match(/^user-agent:\s*(.+)$/i);
    if (ua) {
      if (!cur || cur.rules.length) groups.push((cur = { agents: [], rules: [] }));
      cur.agents.push(ua[1].trim().toLowerCase());
      continue;
    }
    const rule = l.match(/^(dis)?allow:\s*(.*)$/i);
    if (rule && cur) cur.rules.push(`${rule[1] ? 'D' : 'A'}${rule[2].trim()}`);
  }
  return groups;
}

export function parseRobots(txt: string): RobotsFacts {
  const sitemaps = [...txt.matchAll(/^\s*sitemap:\s*(\S+)/gim)].map(m => m[1]).slice(0, 20);
  const groups = parseRobotsGroups(txt);
  const aiBots: Record<string, BotStance> = {};
  for (const bot of AI_BOTS) {
    const g = groups.find(x => x.agents.includes(bot.toLowerCase()));
    aiBots[bot] = !g ? 'unspecified' : g.rules.includes('D/') ? 'blocked' : 'allowed';
  }
  return {
    sitemaps,
    aiBots,
    disallowCount: groups.reduce((n, g) => n + g.rules.filter(r => r.startsWith('D') && r.length > 1).length, 0),
  };
}

// ponytail: full-site Disallow only; RFC 9309 path specificity and Allow
// overrides are not modeled. We only fetch root-level files, so this covers
// the common case; upgrade path is a full path matcher if partial blocks
// ever need per-path precision.
export function robotsBlocksAll(txt: string, userAgent: string): boolean {
  const ua = userAgent.toLowerCase();
  return parseRobotsGroups(txt).some(g =>
    (g.agents.includes('*') || g.agents.some(a => ua.includes(a))) && g.rules.includes('D/'));
}

/** llms.txt (llmstxt.org): H1 title, optional blockquote summary, H2 sections of links. */
export function parseLlmsTxt(txt: string): LlmsFacts {
  const lines = txt.split(/\r?\n/);
  const title = lines.find(l => /^#\s+/.test(l))?.replace(/^#\s+/, '').trim() ?? null;

  const summaryLines: string[] = [];
  let started = false;
  for (const line of lines) {
    if (/^##\s+/.test(line)) break;
    const q = line.match(/^>\s?(.*)$/);
    if (q) { started = true; summaryLines.push(q[1].trim()); }
    else if (started) break;
    else if (line.trim() !== '' && !/^#\s+/.test(line)) break;
  }
  const summary = summaryLines.length ? summaryLines.join(' ') : null;

  const sections: LlmsSection[] = [];
  let current: LlmsSection | null = null;
  for (const line of lines) {
    const h2 = line.match(/^##\s+(.+)$/);
    if (h2) { current = { name: h2[1].trim(), links: 0 }; sections.push(current); continue; }
    if (current) current.links += [...line.matchAll(/\[[^\]]*\]\([^)]*\)/g)].length;
  }

  const linkCount = [...txt.matchAll(/\[[^\]]*\]\([^)]*\)/g)].length;
  return { title, summary, sections, linkCount, bytes: Buffer.byteLength(txt, 'utf8') };
}

const decodeXml = (s: string) => s
  .replace(/&quot;/g, '"').replace(/&apos;/g, "'")
  .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');

export function parseSitemap(xml: string): { urls: SitemapUrl[]; children: string[] } {
  const children = /<sitemapindex/i.test(xml)
    ? [...xml.matchAll(/<sitemap>[\s\S]*?<loc>\s*([^<\s]+)\s*<\/loc>/gi)].map(m => decodeXml(m[1]))
    : [];
  const urls = children.length ? [] : [...xml.matchAll(/<url>([\s\S]*?)<\/url>/gi)].map(m => ({
    loc: decodeXml(m[1].match(/<loc>\s*([^<\s]+)\s*<\/loc>/i)?.[1] ?? ''),
    lastmod: m[1].match(/<lastmod>\s*([^<\s]+)\s*<\/lastmod>/i)?.[1],
  })).filter(u => u.loc);
  return { urls, children };
}

const LOCALE = /^[a-z]{2}(?:-[a-z]{2})?$/i;

/** Groups URLs by first path segment (page families) and measures lastmod freshness. */
export function analyzeSitemap(urls: SitemapUrl[], now: number = Date.now()): SitemapAnalysis {
  const sections = new Map<string, { count: number; examples: string[]; fresh: number }>();
  let withLastmod = 0;
  let fresh30 = 0;
  let fresh90 = 0;
  let newest: number | null = null;
  let oldest: number | null = null;
  let newestLastmod: string | null = null;
  let oldestLastmod: string | null = null;

  for (const { loc, lastmod } of urls) {
    let u: URL;
    try { u = new URL(loc); } catch { continue; }
    const path = u.pathname.toLowerCase();
    let segs = path.split('/').filter(Boolean);
    if (segs[0] && LOCALE.test(segs[0]) && segs.length > 1) segs = segs.slice(1);
    const key = segs.length > 1 ? `/${segs[0]}` : segs.length === 1 ? '/(root pages)' : '/';
    const s = sections.get(key) ?? { count: 0, examples: [], fresh: 0 };
    s.count++;
    if (s.examples.length < 4) s.examples.push(path + u.search);

    const ts = lastmod ? Date.parse(lastmod) : NaN;
    if (Number.isFinite(ts)) {
      withLastmod++;
      const ageDays = (now - ts) / 86_400_000;
      if (ageDays <= 30) fresh30++;
      if (ageDays <= 90) { fresh90++; s.fresh++; }
      if (newest === null || ts > newest) { newest = ts; newestLastmod = lastmod!; }
      if (oldest === null || ts < oldest) { oldest = ts; oldestLastmod = lastmod!; }
    }
    sections.set(key, s);
  }

  const out = [...sections.entries()]
    .map(([path, s]) => ({ path, count: s.count, examples: s.examples, freshLast90d: s.fresh }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 15);
  return { totalUrls: urls.length, sections: out, withLastmod, freshLast30d: fresh30, freshLast90d: fresh90, newestLastmod, oldestLastmod };
}

function decodeEntities(s: string): string {
  return s
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(parseInt(d, 10)))
    .replace(/&quot;/g, '"').replace(/&apos;/g, "'")
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
}

function metaContent(html: string, key: 'name' | 'property', value: string): string | null {
  for (const m of html.matchAll(/<meta\b[^>]*>/gi)) {
    const attrs: Record<string, string> = {};
    for (const a of m[0].matchAll(/([a-zA-Z-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/g)) {
      attrs[a[1].toLowerCase()] = a[2] ?? a[3] ?? a[4] ?? '';
    }
    if (attrs[key]?.toLowerCase() === value) return decodeEntities(attrs.content ?? '').trim() || null;
  }
  return null;
}

function walkJsonLd(node: any, visit: (n: any) => void, depth = 0): void {
  if (!node || typeof node !== 'object' || depth > 6) return;
  if (Array.isArray(node)) {
    for (const x of node) walkJsonLd(x, visit, depth + 1);
    return;
  }
  visit(node);
  for (const v of Object.values(node)) if (v && typeof v === 'object') walkJsonLd(v, visit, depth + 1);
}

// ponytail: regex extraction, no HTML parser dependency (aicw ships none).
// Handles the common homepage shapes; upgrade path is a real parser if
// malformed-markup edge cases ever matter.
export function parseHomepage(html: string): HomepageFacts {
  const t = html.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i);
  const title = t ? decodeEntities(t[1]).replace(/\s+/g, ' ').trim() || null : null;
  const description = metaContent(html, 'name', 'description') ?? metaContent(html, 'property', 'og:description');

  const types = new Set<string>();
  let jsonLdBlocks = 0;
  let jsonLdErrors = 0;
  for (const m of html.matchAll(/<script\b[^>]*type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
    jsonLdBlocks++;
    try {
      walkJsonLd(JSON.parse(m[1]), n => {
        const ty = n['@type'];
        for (const x of Array.isArray(ty) ? ty : [ty]) if (typeof x === 'string') types.add(x);
      });
    } catch {
      jsonLdErrors++;
    }
  }
  return { title, description, jsonLdTypes: [...types], jsonLdBlocks, jsonLdErrors };
}

const isHtmlBody = (body: string) => /<html/i.test(body.slice(0, 500));
const verifiedAbsent = (o: FetchOutcome) => o.status === 404 || o.status === 410;

export function assembleGeoSignals(input: GeoSignalsInput): GeoSignalsData {
  const collectedAt = input.collectedAt ?? new Date().toISOString();
  const now = input.now ?? Date.now();
  const observations: GeoObservation[] = [];
  const unknowns: GeoUnknown[] = [];
  const runs: GeoRun[] = [];
  let seq = 0;
  const add = (kind: GeoObservation['kind'], title: string, data: any, url?: string) =>
    observations.push({ id: `E${++seq}`, source: 'geo-signals', kind, title, url, observedAt: collectedAt, data });
  const unknown = (reason: string, manualCheck?: string) => unknowns.push({ channel: 'geo', reason, manualCheck });

  // robots.txt — AI-bot stance
  const r = input.robots;
  if (r.skipped) {
    runs.push({ source: 'robots.txt', status: 'skipped', reason: r.skipped });
    unknown(`robots.txt not fetched: ${r.skipped}`, r.url);
  } else if (r.error) {
    runs.push({ source: 'robots.txt', status: 'error', reason: r.error });
    unknown(`robots.txt unreachable: ${r.error}`, r.url);
  } else if (verifiedAbsent(r)) {
    runs.push({ source: 'robots.txt', status: 'ok' });
    const aiBots: Record<string, BotStance> = Object.fromEntries(AI_BOTS.map(b => [b, 'unspecified' as BotStance]));
    add('observation', `robots.txt absent (HTTP ${r.status}); all ${AI_BOTS.length} AI bots unspecified`,
      { present: false, status: r.status, robots: { sitemaps: [], aiBots, disallowCount: 0 } }, r.url);
  } else if (r.status !== 200 || r.body === undefined || isHtmlBody(r.body)) {
    const note = r.body !== undefined && isHtmlBody(r.body) ? ', HTML instead of plain text' : '';
    runs.push({ source: 'robots.txt', status: 'error', reason: `HTTP ${r.status}${note}` });
    unknown(`robots.txt could not be verified (HTTP ${r.status}${note})`, r.url);
  } else {
    const facts = parseRobots(r.body);
    runs.push({ source: 'robots.txt', status: 'ok' });
    const blocked = AI_BOTS.filter(b => facts.aiBots[b] === 'blocked');
    const unspecified = AI_BOTS.filter(b => facts.aiBots[b] === 'unspecified').length;
    add('observation',
      `robots.txt: ${blocked.length ? blocked.join(', ') + ' blocked' : 'no AI bots blocked'}; ${unspecified} unspecified`,
      { present: true, status: r.status, truncated: r.truncated ?? false, robots: facts }, r.url);
  }

  // llms.txt — presence and structure
  const l = input.llms;
  if (l.skipped) {
    runs.push({ source: 'llms.txt', status: 'skipped', reason: l.skipped });
    unknown(`llms.txt not fetched: ${l.skipped}`, l.url);
  } else if (l.error) {
    runs.push({ source: 'llms.txt', status: 'error', reason: l.error });
    unknown(`llms.txt unreachable: ${l.error}`, l.url);
  } else if (verifiedAbsent(l)) {
    runs.push({ source: 'llms.txt', status: 'ok' });
    add('observation', `llms.txt absent (HTTP ${l.status})`, { present: false, status: l.status }, l.url);
  } else if (l.status !== 200 || l.body === undefined || isHtmlBody(l.body)) {
    const note = l.body !== undefined && isHtmlBody(l.body) ? ', HTML instead of plain text' : '';
    runs.push({ source: 'llms.txt', status: 'error', reason: `HTTP ${l.status}${note}` });
    unknown(`llms.txt could not be verified (HTTP ${l.status}${note})`, l.url);
  } else {
    const facts = parseLlmsTxt(l.body);
    runs.push({ source: 'llms.txt', status: 'ok' });
    add('observation',
      `llms.txt present: ${facts.title ? `"${facts.title}"` : 'no title'}, ${facts.sections.length} sections, ${facts.linkCount} links`,
      { present: true, status: l.status, truncated: l.truncated ?? false, llms: facts, excerpt: l.body.slice(0, 1500) }, l.url);
  }

  // sitemap — URL count, page families, freshness (derivation over fetched URLs)
  const sm = input.sitemaps;
  const analysis = analyzeSitemap(sm.urls, now);
  add('derivation',
    sm.urls.length
      ? `Sitemap: ${analysis.totalUrls} URLs, ${analysis.sections.length} page families, ${analysis.freshLast90d} updated in 90d`
      : 'No readable sitemap found',
    { analysis, sitemapsRead: sm.read.slice(0, 10), truncated: sm.truncated }, sm.read[0]);
  runs.push({
    source: 'sitemap',
    status: sm.read.length ? 'ok' : sm.errors.length ? 'error' : 'skipped',
    reason: sm.errors.length ? sm.errors.join('; ').slice(0, 300) : undefined,
  });
  if (sm.errors.length) unknown(`sitemap fetch failed for: ${sm.errors.join('; ').slice(0, 300)}`, sm.read[0] ?? `${input.targetUrl}/sitemap.xml`);
  if (sm.truncated) unknown('sitemap crawl truncated (caps reached); URL count and freshness are a lower bound');

  // homepage — title, meta description, JSON-LD types
  const h = input.homepage;
  if (h.skipped) {
    runs.push({ source: 'homepage', status: 'skipped', reason: h.skipped });
    unknown(`homepage not fetched: ${h.skipped}`, h.url);
  } else if (h.error) {
    runs.push({ source: 'homepage', status: 'error', reason: h.error });
    unknown(`homepage unreachable: ${h.error}`, h.url);
  } else if (h.status !== 200 || h.body === undefined) {
    runs.push({ source: 'homepage', status: 'error', reason: `HTTP ${h.status}` });
    unknown(`homepage could not be verified (HTTP ${h.status})`, h.url);
  } else {
    const facts = parseHomepage(h.body);
    runs.push({ source: 'homepage', status: 'ok' });
    add('observation',
      `Homepage: ${facts.title ? `"${facts.title}"` : 'no title'}; meta description ${facts.description ? 'present' : 'absent'}; JSON-LD: ${facts.jsonLdTypes.length ? facts.jsonLdTypes.join(', ') : 'none'}`,
      { status: h.status, truncated: h.truncated ?? false, homepage: facts }, h.url);
    if (facts.jsonLdErrors > 0) unknown(`${facts.jsonLdErrors} JSON-LD block(s) failed to parse; jsonLdTypes may be incomplete`, h.url);
  }

  return { collectedAt, targetUrl: input.targetUrl, observations, unknowns, runs };
}

/** Target site URL: --url flag wins over AICW_GEO_SIGNALS_URL env var. */
export function resolveTargetUrl(argv: string[], env: Record<string, string | undefined>): string | null {
  const i = argv.indexOf('--url');
  if (i !== -1) {
    const v = argv[i + 1];
    return v && !v.startsWith('--') ? v : null;
  }
  return env.AICW_GEO_SIGNALS_URL ?? null;
}
