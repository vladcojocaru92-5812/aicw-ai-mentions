import test from 'node:test';
import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { isGroundingRedirect, resolveCitationUrls } from '../dist/utils/grounding-resolver.js';

const REDIRECT = 'https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQHabc123=';
const FINAL = 'https://mypraxio.ro/blog/facturare-pentru-psihologi-ghid-complet/';

async function tempDir() {
  return fs.mkdtemp(path.join(os.tmpdir(), 'geox-resolver-'));
}

test('isGroundingRedirect matches only the Gemini grounding wrapper', () => {
  assert.equal(isGroundingRedirect(REDIRECT), true);
  assert.equal(isGroundingRedirect(FINAL), false);
  assert.equal(isGroundingRedirect('https://vertexaisearch.cloud.google.com/other-path'), false);
  assert.equal(isGroundingRedirect('https://evil.com/grounding-api-redirect/x'), false);
  assert.equal(isGroundingRedirect('not a url'), false);
  assert.equal(isGroundingRedirect(''), false);
});

test('non-redirect URLs pass through without any fetch', async () => {
  const dir = await tempDir();
  const fetcher = async () => { throw new Error('must not fetch non-redirect URLs'); };
  const map = await resolveCitationUrls([FINAL, 'https://example.com/a'], { fetcher, cacheDir: dir });
  assert.equal(map.get(FINAL), FINAL);
  assert.equal(map.get('https://example.com/a'), 'https://example.com/a');
});

test('redirect resolves via HEAD to the final URL and persists to cache', async () => {
  const dir = await tempDir();
  let calls = 0;
  const fetcher = async (url, init) => {
    calls++;
    assert.equal(init.method, 'HEAD');
    assert.equal(init.redirect, 'follow');
    return { url: FINAL, status: 200 };
  };
  const map = await resolveCitationUrls([REDIRECT, REDIRECT], { fetcher, cacheDir: dir });
  assert.equal(map.get(REDIRECT), FINAL);
  assert.equal(calls, 1, 'duplicate URLs resolved once');
  const cached = JSON.parse(await fs.readFile(path.join(dir, 'grounding-resolutions.json'), 'utf-8'));
  assert.equal(cached[REDIRECT], FINAL);

  // Second call hits the disk cache: fetcher must not run.
  const noFetch = async () => { throw new Error('cache miss'); };
  const map2 = await resolveCitationUrls([REDIRECT], { fetcher: noFetch, cacheDir: dir });
  assert.equal(map2.get(REDIRECT), FINAL);
});

test('HEAD failure falls back to GET', async () => {
  const dir = await tempDir();
  const methods = [];
  const fetcher = async (url, init) => {
    methods.push(init.method);
    if (init.method === 'HEAD') throw new Error('405');
    return { url: FINAL, status: 200 };
  };
  const map = await resolveCitationUrls([REDIRECT], { fetcher, cacheDir: dir });
  assert.deepEqual(methods, ['HEAD', 'GET']);
  assert.equal(map.get(REDIRECT), FINAL);
});

test('total failure keeps the original URL (citation never lost)', async () => {
  const dir = await tempDir();
  const fetcher = async () => { throw new Error('network down'); };
  const map = await resolveCitationUrls([REDIRECT], { fetcher, cacheDir: dir });
  assert.equal(map.get(REDIRECT), REDIRECT);
});

test('resolution that lands on another redirect is rejected', async () => {
  const dir = await tempDir();
  const fetcher = async () => ({ url: 'https://vertexaisearch.cloud.google.com/grounding-api-redirect/other=', status: 200 });
  const map = await resolveCitationUrls([REDIRECT], { fetcher, cacheDir: dir });
  assert.equal(map.get(REDIRECT), REDIRECT);
});
