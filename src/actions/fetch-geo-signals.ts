import { promises as fs } from 'fs';
import path from 'path';
import { AGGREGATED_DATA_COMPILED_DATE_DIR } from '../config/paths.js';
import { AGGREGATED_DIR_NAME } from '../config/constants.js';
import { logger } from '../utils/compact-logger.js';
import { waitForEnterInInteractiveMode, getModuleNameFromUrl } from '../utils/misc-utils.js';
import { getTargetDateFromProjectOrEnvironment, validateAndLoadProject, loadDataJs, saveDataJs, getLatestCompiledFile } from '../utils/project-utils.js';
import { callHttpWithRetry } from '../utils/http-caller.js';
import { PipelineCriticalError } from '../utils/pipeline-errors.js';
import { assembleGeoSignals, parseRobots, parseSitemap, resolveTargetUrl, robotsBlocksAll } from '../utils/geo-signals.js';
import type { FetchOutcome, SitemapFetchResult, SitemapUrl } from '../utils/geo-signals.js';

const CURRENT_MODULE_NAME = getModuleNameFromUrl(import.meta.url);

const GEO_USER_AGENT = 'Mozilla/5.0 (compatible; aicw-geo-signals/1.0; +https://github.com/aichatwatch/aicw-ai-mentions)';
const GEO_ROBOTS_TOKEN = 'aicw-geo-signals';
const FETCH_TIMEOUT_MS = 15_000;
const SITEMAP_TIMEOUT_MS = 20_000;
const MAX_BODY_BYTES = 1_000_000;
const MAX_SITEMAP_BODY_BYTES = 5_000_000;
const MAX_SITEMAPS = 25;
const MAX_URLS = 50_000;

// getProjectNameFromCommandLine would swallow --url and its value into the
// project name, so positional args are collected here instead.
function parseProjectArg(argv: string[]): string {
  const positional: string[] = [];
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--url' || argv[i] === '--date') { i++; continue; }
    positional.push(argv[i]);
  }
  return positional.join(' ').trim();
}

async function readBodyCapped(res: Response, maxBytes: number): Promise<{ text: string; truncated: boolean }> {
  if (!res.body) return { text: '', truncated: false };
  const reader = res.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > maxBytes) {
        chunks.push(value.subarray(0, value.byteLength - (total - maxBytes)));
        return { text: Buffer.concat(chunks).toString('utf8'), truncated: true };
      }
      chunks.push(value);
    }
  } finally {
    reader.cancel().catch(() => {});
  }
  return { text: Buffer.concat(chunks).toString('utf8'), truncated: false };
}

async function fetchOutcome(url: string, timeout: number, maxBytes: number): Promise<FetchOutcome> {
  try {
    const res = await callHttpWithRetry(url, { userAgent: GEO_USER_AGENT, timeout, maxRetries: 1 });
    if (res.status !== 200) return { url, status: res.status };
    const { text, truncated } = await readBodyCapped(res, maxBytes);
    return { url, status: res.status, body: text, truncated };
  } catch (error: any) {
    return { url, error: error?.message || String(error) };
  }
}

/**
 * Sitemaps declared in robots.txt first, then the usual suspects; follows one
 * index level. 404/410 is verified absence (not an error); caps mark the crawl
 * truncated so counts are reported as a lower bound.
 */
async function fetchSitemaps(origin: string, robotsSitemaps: string[]): Promise<SitemapFetchResult> {
  const seen = new Set<string>();
  const urls: SitemapUrl[] = [];
  const read: string[] = [];
  const errors: string[] = [];
  let truncated = false;

  const readQueue = async (start: string[]) => {
    const queue = [...start];
    while (queue.length) {
      if (seen.size >= MAX_SITEMAPS || urls.length >= MAX_URLS) { truncated = true; break; }
      const sm = queue.shift()!;
      if (seen.has(sm)) continue;
      seen.add(sm);
      const outcome = await fetchOutcome(sm, SITEMAP_TIMEOUT_MS, MAX_SITEMAP_BODY_BYTES);
      if (outcome.error) { errors.push(`${sm}: ${outcome.error}`); continue; }
      if (outcome.status === 404 || outcome.status === 410) continue;
      if (outcome.status !== 200 || outcome.body === undefined) { errors.push(`${sm}: HTTP ${outcome.status}`); continue; }
      if (!/<(urlset|sitemapindex)/i.test(outcome.body.slice(0, 2000))) { errors.push(`${sm}: not a sitemap XML`); continue; }
      if (outcome.truncated) truncated = true;
      const parsed = parseSitemap(outcome.body);
      read.push(sm);
      queue.push(...parsed.children.slice(0, 40));
      urls.push(...parsed.urls);
    }
  };

  await readQueue(robotsSitemaps);
  for (const fallback of ['sitemap.xml', 'sitemap_index.xml', 'sitemap-index.xml']) {
    if (urls.length) break;
    await readQueue([`${origin}/${fallback}`]);
  }
  if (urls.length > MAX_URLS) { urls.length = MAX_URLS; truncated = true; }
  return { urls, read, errors, truncated };
}

async function main(): Promise<void> {
  const argv = process.argv.slice(2);
  const project = parseProjectArg(argv);
  if (!project) {
    throw new PipelineCriticalError(
      'Project was not specified! Usage: fetch-geo-signals <ProjectName> [--url https://brand-site] [--date YYYY-MM-DD]',
      CURRENT_MODULE_NAME
    );
  }

  await logger.initialize(import.meta.url, project);
  const projectConfig = await validateAndLoadProject(project);
  if (!projectConfig) {
    throw new PipelineCriticalError(`Project "${project}" is not valid. Create it first or fix project.json.`, CURRENT_MODULE_NAME, project);
  }
  const targetDate = await getTargetDateFromProjectOrEnvironment(project);

  const url = resolveTargetUrl(argv, process.env);
  if (!url) {
    logger.warn('No target URL configured. Pass --url https://brand-site or set AICW_GEO_SIGNALS_URL. Skipping GEO signals.');
    await logger.showSummary();
    return;
  }

  let origin: string;
  try {
    const u = new URL(url);
    if (u.protocol !== 'http:' && u.protocol !== 'https:') throw new Error('only http/https supported');
    origin = u.origin;
  } catch {
    throw new PipelineCriticalError(`Invalid target URL "${url}". Use an absolute http(s) URL, e.g. https://brand.com`, CURRENT_MODULE_NAME, project);
  }

  logger.info(`Collecting on-site GEO signals for ${origin} (project "${project}", date ${targetDate})`);

  const robots = await fetchOutcome(`${origin}/robots.txt`, FETCH_TIMEOUT_MS, MAX_BODY_BYTES);
  const robotsParsed = robots.status === 200 && robots.body !== undefined && !/<html/i.test(robots.body.slice(0, 500))
    ? parseRobots(robots.body)
    : null;

  // Respect robots: a full-site disallow for our UA (or *) skips site content.
  // Sitemaps are still read: they are crawler-declared metadata and we never
  // fetch the pages they list.
  const blockedAll = robotsParsed ? robotsBlocksAll(robots.body!, GEO_ROBOTS_TOKEN) : false;
  const skipReason = 'robots.txt disallows all crawling for our user-agent';
  if (blockedAll) logger.warn(`robots.txt disallows all crawling for ${GEO_ROBOTS_TOKEN}; skipping llms.txt and homepage`);

  const llms: FetchOutcome = blockedAll
    ? { url: `${origin}/llms.txt`, skipped: skipReason }
    : await fetchOutcome(`${origin}/llms.txt`, FETCH_TIMEOUT_MS, MAX_BODY_BYTES);
  const homepage: FetchOutcome = blockedAll
    ? { url: `${origin}/`, skipped: skipReason }
    : await fetchOutcome(`${origin}/`, FETCH_TIMEOUT_MS, MAX_BODY_BYTES);
  const sitemaps = await fetchSitemaps(origin, robotsParsed?.sitemaps ?? []);

  const geo = assembleGeoSignals({ targetUrl: origin, robots, llms, homepage, sitemaps });

  // Merge into the aggregated compiled data file as the geoSignals section.
  const file = await getLatestCompiledFile(project, AGGREGATED_DIR_NAME, targetDate);
  if (file) {
    const { data, dataKey } = await loadDataJs(file);
    data.geoSignals = geo;
    await saveDataJs(file, dataKey, data);
    logger.info(`geoSignals merged into ${file}`);
  } else {
    const dir = AGGREGATED_DATA_COMPILED_DATE_DIR(project, targetDate);
    await fs.mkdir(dir, { recursive: true });
    const key = `AppData${targetDate.replace(/-/g, '')}`;
    const data = { report_date: targetDate, report_question_id: AGGREGATED_DIR_NAME, geoSignals: geo };
    const newFile = path.join(dir, `${targetDate}-data.js`);
    await saveDataJs(newFile, key, data);
    logger.info(`geoSignals written to ${newFile} (no compiled data file existed yet)`);
  }

  for (const o of geo.observations) logger.info(`  ${o.id} [${o.kind}] ${o.title}`);
  for (const u of geo.unknowns) logger.warn(`  unknown: ${u.reason}`);
  logger.success(`GEO signals: ${geo.observations.length} observations, ${geo.unknowns.length} unknowns`);

  await logger.showSummary();
  await waitForEnterInInteractiveMode();
}

main().catch(err => {
  logger.error(err.message || err.toString());
  throw err;
});
