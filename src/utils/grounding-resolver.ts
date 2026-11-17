/**
 * Resolves provider grounding-redirect URLs to the final source URL.
 *
 * Gemini via OpenRouter returns citations as
 * vertexaisearch.cloud.google.com/grounding-api-redirect/... wrappers; the
 * citation map needs the real domains. Resolution is plain HTTP (HEAD with
 * redirect follow, GET fallback), cached on disk so rebuilds don't re-fetch.
 * Raw answer.json evidence is never modified — resolution happens where
 * annotations are consumed.
 */

import { promises as fs } from 'fs';
import path from 'path';
import { USER_CACHE_DIR } from '../config/user-paths.js';
import { logger } from './compact-logger.js';

// ponytail: only Gemini's grounding wrapper today; upgrade path = add hosts
// here if other providers start returning redirect wrappers.
const REDIRECT_HOSTS = new Set(['vertexaisearch.cloud.google.com']);
const RESOLVE_TIMEOUT_MS = 10_000;
const CONCURRENCY = 5;
const CACHE_FILE_NAME = 'grounding-resolutions.json';

export function isGroundingRedirect(url: string): boolean {
  try {
    const u = new URL(url);
    return REDIRECT_HOSTS.has(u.hostname) && u.pathname.startsWith('/grounding-api-redirect');
  } catch {
    return false;
  }
}

export type FetchLike = (
  url: string,
  init: { method: string; redirect: 'follow'; signal: AbortSignal }
) => Promise<{ url: string; status: number }>;

const defaultFetcher: FetchLike = (url, init) => fetch(url, init);

interface ResolverOptions {
  fetcher?: FetchLike;
  cacheDir?: string;
}

async function loadCache(cacheDir: string): Promise<Map<string, string>> {
  try {
    const raw = await fs.readFile(path.join(cacheDir, CACHE_FILE_NAME), 'utf-8');
    const obj = JSON.parse(raw);
    return new Map(Object.entries(obj).map(([k, v]: [string, any]) => [k, String(v?.resolved ?? v)]));
  } catch {
    return new Map();
  }
}

async function saveCache(cacheDir: string, cache: Map<string, string>): Promise<void> {
  try {
    await fs.mkdir(cacheDir, { recursive: true });
    const obj = Object.fromEntries(cache);
    await fs.writeFile(path.join(cacheDir, CACHE_FILE_NAME), JSON.stringify(obj, null, 2), 'utf-8');
  } catch (err) {
    logger.debug(`grounding-resolver: failed to persist cache: ${err}`);
  }
}

async function resolveOne(url: string, fetcher: FetchLike): Promise<string> {
  for (const method of ['HEAD', 'GET']) {
    try {
      const res = await fetcher(url, {
        method,
        redirect: 'follow',
        signal: AbortSignal.timeout(RESOLVE_TIMEOUT_MS)
      });
      const finalUrl = res?.url;
      if (finalUrl && /^https?:\/\//i.test(finalUrl) && !isGroundingRedirect(finalUrl)) {
        return finalUrl;
      }
    } catch {
      // HEAD rejected or network error — try GET once
    }
  }
  // Never lose a citation: keep the original URL when resolution fails.
  return url;
}

/**
 * Resolve a batch of citation URLs. Non-redirect URLs pass through untouched
 * (no network). Results are cached per process and persisted to cacheDir.
 */
export async function resolveCitationUrls(
  urls: string[],
  options: ResolverOptions = {}
): Promise<Map<string, string>> {
  const fetcher = options.fetcher ?? defaultFetcher;
  const cacheDir = options.cacheDir ?? USER_CACHE_DIR;
  const result = new Map<string, string>();

  const unique = [...new Set(urls.filter(Boolean))];
  const cache = await loadCache(cacheDir);
  const toResolve: string[] = [];

  for (const url of unique) {
    if (!isGroundingRedirect(url)) {
      result.set(url, url);
    } else if (cache.has(url)) {
      result.set(url, cache.get(url)!);
    } else {
      toResolve.push(url);
    }
  }

  let dirty = false;
  for (let i = 0; i < toResolve.length; i += CONCURRENCY) {
    const chunk = toResolve.slice(i, i + CONCURRENCY);
    const resolved = await Promise.all(chunk.map(url => resolveOne(url, fetcher)));
    for (let j = 0; j < chunk.length; j++) {
      const url = chunk[j];
      const finalUrl = resolved[j];
      result.set(url, finalUrl);
      if (finalUrl !== url) {
        cache.set(url, finalUrl);
        dirty = true;
      }
    }
  }

  if (dirty) {
    await saveCache(cacheDir, cache);
    logger.debug(`grounding-resolver: resolved ${toResolve.length} redirect URLs`);
  }

  return result;
}
