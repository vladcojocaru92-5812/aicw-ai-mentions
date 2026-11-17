import test from 'node:test';
import assert from 'node:assert/strict';

import { calculateVisibilityScore } from '../dist/utils/visibility-score.js';

const bots = [{ id: 'm1', name: 'Model One' }, { id: 'm2', name: 'Model Two' }];

function brand(value, opts = {}) {
  return {
    value,
    mentions: opts.mentions ?? 0,
    mentionsByModel: opts.mentionsByModel ?? {},
    appearanceOrderByModel: opts.appearanceOrderByModel ?? {},
    sources: opts.sources ?? []
  };
}

const src = (url, botsStr) => ({ url, bots: botsStr });

test('dominant brand scores high and stays within 0-100', () => {
  const data = {
    bots,
    brands: [
      brand('TopBrand', {
        mentions: 10,
        mentionsByModel: { m1: 5, m2: 5 },
        appearanceOrderByModel: { m1: 1, m2: 1 },
        sources: [src('top.com', 'm1,m2'), src('blog.top.com', 'm1')]
      }),
      brand('Other', { mentions: 2, mentionsByModel: { m1: 2 }, appearanceOrderByModel: { m1: 4 }, sources: [src('other.com', 'm1')] })
    ]
  };
  const score = calculateVisibilityScore(data, 'TopBrand');
  assert.equal(score.matched, true);
  assert.ok(score.overall >= 80 && score.overall <= 100, `overall ${score.overall}`);
  assert.equal(score.perEngine.m1, 100);
  assert.ok(score.perEngine.m2 > 0);
  const weightSum = score.breakdown.reduce((s, c) => s + c.weight, 0);
  assert.ok(Math.abs(weightSum - 1) < 1e-9);
  for (const c of score.breakdown) assert.ok(c.value >= 0 && c.value <= 100);
});

test('absent subject scores 0 with matched:false', () => {
  const data = {
    bots,
    brands: [brand('SomeoneElse', { mentions: 3, mentionsByModel: { m1: 3 }, appearanceOrderByModel: { m1: 1 }, sources: [src('x.com', 'm1')] })]
  };
  const score = calculateVisibilityScore(data, 'GhostBrand');
  assert.equal(score.matched, false);
  assert.equal(score.overall, 0);
  assert.deepEqual(score.perEngine, { m1: 0, m2: 0 });
  for (const c of score.breakdown) assert.equal(c.value, 0);
});

test('no brands or no bots returns null', () => {
  assert.equal(calculateVisibilityScore({ bots, brands: [] }, 'X'), null);
  assert.equal(calculateVisibilityScore({ bots: [], brands: [brand('X')] }, 'X'), null);
  assert.equal(calculateVisibilityScore({}, 'X'), null);
});

test('position decays 20 points per rank and floors at 6th', () => {
  const mk = order => ({
    bots: [bots[0]],
    brands: [brand('B', { mentions: 1, mentionsByModel: { m1: 1 }, appearanceOrderByModel: { m1: order }, sources: [src('b.com', 'm1')] })]
  });
  const pos = order => calculateVisibilityScore(mk(order), 'B').breakdown.find(c => c.key === 'position').value;
  assert.equal(pos(1), 100);
  assert.equal(pos(2), 80);
  assert.equal(pos(4.5), 30);
  assert.equal(pos(6), 0);
  assert.equal(pos(20), 0);
});

test('coverage reflects share of engines mentioning the brand', () => {
  const data = {
    bots,
    brands: [brand('Half', { mentions: 2, mentionsByModel: { m1: 2 }, appearanceOrderByModel: { m1: 1 }, sources: [src('h.com', 'm1')] })]
  };
  const score = calculateVisibilityScore(data, 'Half');
  assert.equal(score.breakdown.find(c => c.key === 'coverage').value, 50);
  assert.equal(score.perEngine.m2, 0);
});

test('subject matches case-insensitively and partially', () => {
  const data = { bots, brands: [brand('Praxio App', { mentions: 1, mentionsByModel: { m1: 1 }, appearanceOrderByModel: { m1: 1 } })] };
  assert.equal(calculateVisibilityScore(data, 'praxio app').matched, true);
  assert.equal(calculateVisibilityScore(data, 'Praxio').matched, true);
});

test('zero-mention field guards do not divide by zero', () => {
  const data = { bots, brands: [brand('A'), brand('B')] };
  const score = calculateVisibilityScore(data, 'A');
  assert.equal(score.matched, true);
  assert.equal(score.overall, 0);
});
