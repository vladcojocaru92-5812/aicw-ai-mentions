import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeDomain, parseRequest } from './request.ts';

const form = (fields: Record<string, string>) => {
  const f = new FormData();
  for (const [k, v] of Object.entries(fields)) f.set(k, v);
  return f;
};

test('normalizeDomain strips protocol, www, path and case', () => {
  assert.equal(normalizeDomain('https://www.Acme.com/about?x=1'), 'acme.com');
  assert.equal(normalizeDomain('shop.acme.co.uk'), 'shop.acme.co.uk');
  assert.equal(normalizeDomain('acme'), null);
  assert.equal(normalizeDomain('not a domain.com'), null);
  assert.equal(normalizeDomain(''), null);
});

test('parseRequest accepts a valid request', () => {
  const r = parseRequest(form({ brand: ' Acme ', domain: 'acme.com', email: 'me@acme.com' }));
  assert.deepEqual(r, { ok: true, spam: false, value: { brand: 'Acme', domain: 'acme.com', email: 'me@acme.com', plan: 'free' } });
});

test('parseRequest defaults the brand to the website', () => {
  const r = parseRequest(form({ domain: 'https://www.acme.com/', email: 'me@acme.com' }));
  assert.deepEqual(r, { ok: true, spam: false, value: { brand: 'acme.com', domain: 'acme.com', email: 'me@acme.com', plan: 'free' } });
});

test('parseRequest rejects bad fields', () => {
  assert.equal(parseRequest(form({ brand: 'x'.repeat(101), domain: 'acme.com', email: 'me@acme.com' })).ok, false);
  assert.equal(parseRequest(form({ brand: 'Acme', domain: 'acme', email: 'me@acme.com' })).ok, false);
  assert.equal(parseRequest(form({ brand: 'Acme', domain: 'acme.com', email: 'nope' })).ok, false);
});

test('parseRequest keeps the offer the visitor clicked and rejects unknown ones', () => {
  const ok = parseRequest(form({ domain: 'acme.com', email: 'me@acme.com', plan: 'beat' }));
  assert.equal(ok.ok && ok.value.plan, 'beat');
  assert.equal(parseRequest(form({ domain: 'acme.com', email: 'me@acme.com', plan: 'gold' })).ok, false);
});

test('parseRequest flags the honeypot as spam', () => {
  const r = parseRequest(form({ brand: 'Acme', domain: 'acme.com', email: 'me@acme.com', website: 'http://spam' }));
  assert.equal(r.ok && r.spam, true);
});
