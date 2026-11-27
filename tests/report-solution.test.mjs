import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

// Offline fixtures only: no scan, no API key, no network.
const TMP = await fs.mkdtemp(path.join(os.tmpdir(), 'geox-report-'));
process.env.AICW_DATA_FOLDER = TMP;
process.env.AICW_SKIP_UPDATE_CHECK = 'true';
delete process.env.AICW_REPORT_TIER;

const { deriveFindings, buildAssets, buildRepairPrompt, generateSolutionHtml, resolveReportTier } = await import('../dist/utils/report-solution.js');
const { selectCompetitors, buildBattlecard, generateBattlecardsHtml } = await import('../dist/utils/report-battlecards.js');
const { normalizeScore, generateScoreHtml } = await import('../dist/utils/report-score.js');
const { generateStaticMainPage } = await import('../dist/utils/report-main-static.js');
const { logger } = await import('../dist/utils/compact-logger.js');

const BOTS = [
  { id: 'openai_chatgpt', name: 'ChatGPT' },
  { id: 'google_gemini', name: 'Gemini' },
  { id: 'perplexity_ai', name: 'Perplexity' }
];
const QUESTIONS = [
  { id: '1-best-crm', text: 'What is the best CRM for a small agency?' },
  { id: '2-crm-pricing', text: 'How much does a CRM for a small agency cost?' }
];
const DATE = '2026-11-17';

function brand(value, over = {}) {
  return {
    value, type: 'brand', mentions: 4, mentionsAsPercent: 0.4, influence: 0.2,
    appearanceOrder: 2, bots: '', link: '', sources: [], mentionsByModel: {}, mentionsByPrompt: {},
    ...over
  };
}

function weakContext() {
  const subject = brand('Acme CRM', {
    link: 'https://acmecrm.com', mentions: 2, influence: 0.05, appearanceOrder: 6.4,
    mentionsByModel: { openai_chatgpt: 2 },
    mentionsByPrompt: { '1-best-crm': 2, '2-crm-pricing': 0 },
    sources: [{ url: 'https://reddit.com/r/crm/comments/acme', bots: 'openai_chatgpt' }]
  });
  const rival = brand('HubSpot', {
    link: 'https://hubspot.com', mentions: 9, influence: 0.42, appearanceOrder: 1.4,
    mentionsByModel: { openai_chatgpt: 3, google_gemini: 3, perplexity_ai: 3 },
    mentionsByPrompt: { '1-best-crm': 3, '2-crm-pricing': 3 },
    sources: [{ url: 'https://hubspot.com/pricing' }, { url: 'https://g2.com/products/hubspot/reviews' }]
  });
  return {
    subject: 'Acme CRM', brands: [subject, rival],
    linkDomains: [{ value: 'reddit.com', influence: 0.3 }, { value: 'g2.com', influence: 0.2 }],
    bots: BOTS, questions: QUESTIONS, targetDate: DATE, data: {}
  };
}

function gapOnlyContext() {
  const ctx = weakContext();
  ctx.brands[0] = brand('Acme CRM', {
    link: 'https://acmecrm.com', mentions: 6, influence: 0.6, appearanceOrder: 1.2,
    mentionsByModel: { openai_chatgpt: 3, google_gemini: 3 },
    mentionsByPrompt: { '1-best-crm': 3, '2-crm-pricing': 3 },
    sources: [{ url: 'https://acmecrm.com/pricing' }]
  });
  ctx.linkDomains = [{ value: 'acmecrm.com', influence: 0.5 }];
  return ctx;
}

function cleanContext() {
  const ctx = gapOnlyContext();
  ctx.brands[0].mentionsByModel = { openai_chatgpt: 3, google_gemini: 3, perplexity_ai: 3 };
  return ctx;
}

const ids = findings => findings.map(f => f.id).sort();
const assetIds = assets => assets.map(a => a.id).sort();

test('findings are derived from the measured scan data', () => {
  const findings = deriveFindings(weakContext());
  assert.deepEqual(ids(findings), ['buried', 'engine-gaps', 'no-owned-citations', 'outranked', 'third-party-dependence']);
  const gaps = findings.find(f => f.id === 'engine-gaps');
  assert.match(gaps.evidence, /Gemini, Perplexity/);
  assert.equal(findings.find(f => f.id === 'absent'), undefined);
});

test('a brand absent from every engine yields the absent finding', () => {
  const ctx = weakContext();
  ctx.brands = [ctx.brands[1]];
  const findings = deriveFindings(ctx);
  assert.ok(ids(findings).includes('absent'));
  assert.equal(findings.find(f => f.id === 'absent').severity, 'critical');
});

test('low coverage fires only when the brand misses most questions', () => {
  const ctx = weakContext();
  ctx.questions = [...QUESTIONS, { id: '3-crm-alternatives', text: 'What are alternatives to Acme CRM?' }];
  assert.ok(ids(deriveFindings(ctx)).includes('low-coverage'));
  assert.ok(!ids(deriveFindings(weakContext())).includes('low-coverage'));
});

test('assets appear only for the findings that fired', () => {
  const ctx = gapOnlyContext();
  const findings = deriveFindings(ctx);
  assert.deepEqual(ids(findings), ['engine-gaps']);
  assert.deepEqual(assetIds(buildAssets(ctx, findings)), ['meta-descriptions', 'robots-txt']);

  const weak = weakContext();
  assert.deepEqual(assetIds(buildAssets(weak, deriveFindings(weak))), ['faq-jsonld', 'llms-txt', 'meta-descriptions', 'robots-txt']);
});

test('a scan with no gaps produces no assets and no repair prompt', () => {
  const ctx = cleanContext();
  const findings = deriveFindings(ctx);
  assert.deepEqual(findings, []);
  assert.deepEqual(buildAssets(ctx, findings), []);
  const html = generateSolutionHtml(ctx);
  assert.match(html, /No blocking gaps were detected/);
  assert.doesNotMatch(html, /geox-repair-prompt/);
});

test('repair prompt is one copy-paste block carrying findings and assets', () => {
  const ctx = weakContext();
  const findings = deriveFindings(ctx);
  const assets = buildAssets(ctx, findings);
  const prompt = buildRepairPrompt(ctx, findings, assets);
  assert.equal(prompt.split('You are a senior technical SEO').length - 1, 1);
  assert.match(prompt, /BRAND: Acme CRM/);
  assert.match(prompt, /SITE: https:\/\/acmecrm\.com/);
  for (const finding of findings) assert.ok(prompt.includes(finding.title), `missing finding: ${finding.title}`);
  for (const asset of assets) assert.ok(prompt.includes(asset.filename), `missing asset: ${asset.filename}`);
  assert.match(prompt, /Do not invent facts/);
  assert.ok(prompt.includes(QUESTIONS[0].text));
});

test('llms.txt and FAQ assets are built from the scan, not generic filler', () => {
  const ctx = weakContext();
  const assets = buildAssets(ctx, deriveFindings(ctx));
  const llms = assets.find(a => a.id === 'llms-txt');
  assert.match(llms.content, /# Acme CRM/);
  assert.match(llms.content, /https:\/\/acmecrm\.com\/pricing/);
  const faq = assets.find(a => a.id === 'faq-jsonld');
  const schema = JSON.parse(faq.content);
  assert.equal(schema['@type'], 'FAQPage');
  assert.deepEqual(schema.mainEntity.map(q => q.name), QUESTIONS.map(q => q.text));
  const robots = assets.find(a => a.id === 'robots-txt');
  assert.match(robots.content, /User-agent: PerplexityBot/);
  assert.match(robots.content, /User-agent: [*]\nAllow: [/]/);
  assert.match(robots.content, /User-agent: OAI-SearchBot/);
  assert.match(robots.content, /User-agent: anthropic-ai/);
  assert.match(robots.content, /User-agent: Bytespider/);
  assert.match(robots.content, /User-agent: Applebot-Extended/);
  assert.doesNotMatch(robots.content, /Claude-Web/);
  assert.match(robots.content, /Allow: \//);
});

test('score contract is normalized and missing score degrades to nothing', () => {
  const score = {
    overall: 62,
    perEngine: { openai_chatgpt: 70, google_gemini: 40 },
    breakdown: [{ key: 'mention_rate', label: 'Mention rate', value: 55, weight: 0.4 }]
  };
  const normalized = normalizeScore(score);
  assert.equal(normalized.overall, 62);
  assert.equal(normalized.engines.length, 2);
  assert.equal(normalized.breakdown[0].label, 'Mention rate');
  assert.equal(normalized.breakdown[0].weight, 0.4);

  assert.equal(normalizeScore(undefined), null);
  assert.equal(normalizeScore(null), null);
  assert.equal(normalizeScore({}), null);
  assert.equal(normalizeScore({ overall: 'not-a-number' }), null);
  assert.equal(generateScoreHtml(undefined, BOTS), '');
  assert.equal(generateScoreHtml({ perEngine: { openai_chatgpt: 10 } }, BOTS), '');

  const html = generateScoreHtml(score, BOTS);
  assert.match(html, /AI Visibility Score/);
  assert.match(html, />62</);
  assert.match(html, /ChatGPT/);
  assert.match(html, /Mention rate/);
  assert.match(html, /40%/);
});

test('score tolerates array form and clamps out-of-range values', () => {
  const normalized = normalizeScore({ overall: 140, perEngine: [{ engine: 'google_gemini', score: -5 }], breakdown: [{ id: 'citations', score: 200 }] });
  assert.equal(normalized.overall, 100);
  assert.equal(normalized.engines[0].score, 0);
  assert.equal(normalized.breakdown[0].value, 100);
  assert.equal(normalized.breakdown[0].label, 'Citations');
});

test('competitors come from the scan, capped at three, explicit selection wins', () => {
  const ctx = weakContext();
  ctx.brands.push(brand('Pipedrive', { mentions: 5, influence: 0.3 }), brand('Zoho', { mentions: 3, influence: 0.25 }), brand('Salesforce', { mentions: 2, influence: 0.1 }));
  const auto = selectCompetitors(ctx);
  assert.deepEqual(auto.map(b => b.value), ['HubSpot', 'Pipedrive', 'Zoho']);
  assert.ok(!auto.some(b => b.value === 'Acme CRM'));

  ctx.data = { competitors: ['Zoho', 'Pipedrive'] };
  assert.deepEqual(selectCompetitors(ctx).map(b => b.value), ['Zoho', 'Pipedrive']);
});

test('battlecard strengths, weaknesses and plan are derived from the metrics', () => {
  const ctx = weakContext();
  const card = buildBattlecard(ctx, ctx.brands[1]);
  assert.equal(card.competitor.name, 'HubSpot');
  assert.equal(card.you.name, 'Acme CRM');
  assert.ok(card.strengths.some(s => /Higher share of voice/.test(s)));
  assert.ok(card.strengths.some(s => /Its own site is cited/.test(s)));
  assert.ok(card.weaknesses.some(w => /No citations on its own domain/.test(w)) === false);
  assert.deepEqual(card.outreach.map(o => o.domain), ['g2.com']);
  assert.ok(!card.outreach.some(o => o.domain === 'acmecrm.com'));
  assert.deepEqual(card.missedQuestions, [QUESTIONS[1].text]);
  assert.ok(card.plan.length >= 2);
  assert.ok(card.plan.some(p => /Get listed on/.test(p.action)));
  assert.ok(card.plan.every(p => p.why.length > 0));

  const html = generateBattlecardsHtml(ctx);
  assert.match(html, /Beat them/);
  assert.match(html, /Acme CRM vs HubSpot/);
  assert.match(html, /Battle plan/);
});

test('battlecards degrade gracefully when the scan has no competitors', () => {
  const ctx = weakContext();
  ctx.brands = [ctx.brands[0]];
  assert.deepEqual(selectCompetitors(ctx), []);
  const html = generateBattlecardsHtml(ctx);
  assert.match(html, /No competitor mentions were recorded/);
  assert.doesNotMatch(html, /geox-battlecard/);
});

test('tier resolves from data, then environment, then defaults to solution', () => {
  assert.equal(resolveReportTier({}), 'solution');
  assert.equal(resolveReportTier({ tier: 'beat' }), 'beat');
  assert.equal(resolveReportTier({ report_tier: '19' }), 'beat');
  process.env.AICW_REPORT_TIER = 'beat';
  assert.equal(resolveReportTier({}), 'beat');
  assert.equal(resolveReportTier({ tier: 'solution' }), 'solution');
  delete process.env.AICW_REPORT_TIER;
});

await logger.initialize(import.meta.url, 'Acme CRM');

let sequence = 0;
async function render(data) {
  const dir = path.join(TMP, `case-${++sequence}`);
  const outDir = path.join(dir, 'out');
  await fs.mkdir(outDir, { recursive: true });
  const dataFile = path.join(dir, `${DATE}-data.js`);
  await fs.writeFile(dataFile, `window.AppData20261117 = ${JSON.stringify(data)};\n`);
  const ok = await generateStaticMainPage({
    project: 'Acme CRM',
    targetDate: DATE,
    outputDir: outDir,
    templateDir: path.join(process.cwd(), 'src/config/data/templates/report/html/projects/project/question'),
    enrichedDataFile: dataFile,
    isAggregate: true,
    questions: QUESTIONS
  });
  const read = name => fs.readFile(path.join(outDir, name), 'utf8').catch(() => null);
  return { ok, html: ok ? await read('index.html') : '', free: await read('free.html') };
}

function compiled(ctx, extra = {}) {
  return { brands: ctx.brands, linkDomains: ctx.linkDomains, bots: BOTS, ...extra };
}

const SCORE = { overall: 62, perEngine: { openai_chatgpt: 70, google_gemini: 40, perplexity_ai: 0 }, breakdown: [{ key: 'mention_rate', label: 'Mention rate', value: 55, weight: 0.4 }] };

test('report renders score, solution and battlecards on the 19 USD tier', async () => {
  const { ok, html } = await render(compiled(weakContext(), { score: SCORE, tier: 'beat' }));
  assert.equal(ok, true);
  assert.match(html, /id="geox-score"/);
  assert.match(html, /id="geox-solution"/);
  assert.match(html, /id="geox-beat"/);
  assert.match(html, /id="geox-repair-prompt"/);
  assert.match(html, /geox-asset-llms-txt/);
  assert.match(html, /Acme CRM vs HubSpot/);
  assert.doesNotMatch(html, /\{\{STATIC_/);
});

test('report without a score hides the score section and still generates', async () => {
  const { ok, html } = await render(compiled(weakContext(), { tier: 'beat' }));
  assert.equal(ok, true);
  assert.doesNotMatch(html, /id="geox-score"/);
  assert.match(html, /id="geox-solution"/);
  assert.match(html, /id="geox-beat"/);
  assert.doesNotMatch(html, /\{\{STATIC_/);
});

test('default 9 USD tier renders the solution but no battlecards', async () => {
  const { ok, html } = await render(compiled(weakContext(), { score: SCORE }));
  assert.equal(ok, true);
  assert.match(html, /id="geox-solution"/);
  assert.doesNotMatch(html, /id="geox-beat"/);
  assert.doesNotMatch(html, /\{\{STATIC_/);
});

test('an empty scan still generates a report with the absent finding', async () => {
  const { ok, html } = await render({ brands: [], linkDomains: [], bots: BOTS });
  assert.equal(ok, true);
  assert.match(html, /id="geox-solution"/);
  assert.match(html, /does not appear in AI answers/);
  assert.doesNotMatch(html, /id="geox-score"/);
  assert.doesNotMatch(html, /\{\{STATIC_/);
});

test('free.html shows the score and leaks nothing the paid report sells', async () => {
  const { free } = await render(compiled(weakContext(), { score: SCORE, tier: 'beat' }));
  assert.match(free, /id="geox-score"/);
  assert.match(free, /id="geox-free-locked"/);
  assert.match(free, /\d+ findings?/);
  assert.match(free, /reply to the email/);
  for (const paid of [/HubSpot/, /reddit\.com/, /geox-repair-prompt/, /geox-solution/, /geox-beat/, /What is the best CRM/]) {
    assert.doesNotMatch(free, paid);
  }
});

test('no score means no free.html', async () => {
  const { ok, free } = await render(compiled(weakContext()));
  assert.equal(ok, true);
  assert.equal(free, null);
});

test.after(() => fs.rm(TMP, { recursive: true, force: true }));
