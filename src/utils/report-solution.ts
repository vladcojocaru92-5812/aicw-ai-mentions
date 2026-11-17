/**
 * GEOX "Solution" section (9 USD tier): findings derived from the scan, one
 * copy-paste AI repair prompt, and paste-ready assets keyed to the findings
 * that actually fired. Deterministic and offline - no AI calls, no site crawl.
 */

export type ReportTier = 'solution' | 'beat';

export interface SolutionFinding {
  id: string;
  severity: 'critical' | 'warning' | 'info';
  title: string;
  evidence: string;
}

export interface SolutionAsset {
  id: string;
  title: string;
  filename: string;
  language: string;
  findingIds: string[];
  instructions: string;
  content: string;
}

export interface SolutionContext {
  subject: string;
  brands: Array<Record<string, any>>;
  linkDomains: Array<Record<string, any>>;
  bots: Array<{ id: string; name: string }>;
  questions: Array<{ id: string; text: string }>;
  targetDate: string;
  data?: Record<string, any>;
}

const THIRD_PARTY_HOSTS = ['reddit.com', 'quora.com', 'g2.com', 'capterra.com', 'trustpilot.com', 'youtube.com', 'medium.com', 'wikipedia.org', 'producthunt.com', 'linkedin.com'];

export function resolveReportTier(data?: Record<string, any>): ReportTier {
  const raw = String(data?.tier ?? data?.report_tier ?? process.env.AICW_REPORT_TIER ?? 'solution').toLowerCase().trim();
  return ['beat', 'beat-them', '19', 'competitors'].includes(raw) ? 'beat' : 'solution';
}

function esc(text: unknown): string {
  return String(text ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function pct(value: unknown): string {
  const n = Number(value);
  return Number.isFinite(n) ? `${(n * 100).toFixed(1)}%` : 'N/A';
}

export function domainOf(url: unknown): string | null {
  const raw = String(url ?? '').trim();
  if (!raw) return null;
  try {
    return new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`).hostname.replace(/^www\./, '').toLowerCase();
  } catch {
    return null;
  }
}

export function sourceUrls(item: any): string[] {
  const raw = item?.sources;
  if (!Array.isArray(raw)) return [];
  return raw.map((s: any) => (typeof s === 'string' ? s : String(s?.url ?? ''))).filter(Boolean);
}

function normalizeName(value: unknown): string {
  return String(value ?? '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

export function aliasesOf(ctx: SolutionContext): string[] {
  const raw = ctx.data?.aliases ?? ctx.data?.subject_aliases;
  return Array.isArray(raw) ? raw.map(String) : [];
}

export function findSubjectBrand(brands: Array<Record<string, any>>, subject: string, aliases: string[] = []): { brand: any; match: 'exact' | 'partial' | 'none' } {
  const names = [subject, ...aliases].map(normalizeName).filter(Boolean);
  const list = Array.isArray(brands) ? brands : [];
  for (const brand of list) {
    const value = normalizeName(brand?.value ?? brand?.code);
    if (value && names.includes(value)) return { brand, match: 'exact' };
  }
  for (const brand of list) {
    const value = normalizeName(brand?.value ?? brand?.code);
    if (value.length < 4) continue;
    if (names.some(name => name.length >= 4 && (value.includes(name) || name.includes(value)))) return { brand, match: 'partial' };
  }
  return { brand: null, match: 'none' };
}

export function topRival(brands: Array<Record<string, any>>, subject: any): any {
  return (Array.isArray(brands) ? brands : [])
    .filter(b => b !== subject && Number(b?.mentions) > 0 && Number(b?.influence) > Number(subject?.influence ?? 0))
    .sort((a, b) => Number(b.influence) - Number(a.influence))[0] || null;
}

export function deriveFindings(ctx: SolutionContext): SolutionFinding[] {
  const findings: SolutionFinding[] = [];
  const { brand: subject, match } = findSubjectBrand(ctx.brands, ctx.subject, aliasesOf(ctx));
  const bots = ctx.bots || [];
  const questions = ctx.questions || [];
  const mentionsByModel = (subject?.mentionsByModel || {}) as Record<string, number>;
  const covered = bots.filter(b => Number(mentionsByModel[b.id]) > 0);
  const missing = bots.filter(b => !(Number(mentionsByModel[b.id]) > 0));
  const mentions = Number(subject?.mentions) || 0;

  if (!subject || mentions === 0) {
    findings.push({
      id: 'absent',
      severity: 'critical',
      title: `${ctx.subject} does not appear in AI answers`,
      evidence: bots.length
        ? `0 mentions across ${bots.length} engines (${bots.map(b => b.name).join(', ')}) over ${questions.length} scanned question${questions.length === 1 ? '' : 's'}.`
        : 'No engine answers were available in this scan.'
    });
  } else {
    if (match === 'partial') {
      findings.push({ id: 'name-variant', severity: 'info', title: 'AI uses a different name variant', evidence: `Matched "${subject.value}" to "${ctx.subject}" loosely. Confirm the canonical brand name and its aliases.` });
    }
    if (bots.length > 0 && missing.length > 0) {
      findings.push({ id: 'engine-gaps', severity: 'warning', title: `Missing from ${missing.length} of ${bots.length} engines`, evidence: `Present in ${covered.map(b => b.name).join(', ') || 'none'}; absent from ${missing.map(b => b.name).join(', ')}.` });
    }
    const order = Number(subject.appearanceOrder);
    if (Number.isFinite(order) && order > 3) {
      findings.push({ id: 'buried', severity: 'warning', title: 'Mentioned late in answers', evidence: `Average appearance position ${order.toFixed(1)}. Models name other brands before you.` });
    }
    const rival = topRival(ctx.brands, subject);
    if (rival) {
      findings.push({ id: 'outranked', severity: 'warning', title: `${rival.value} outranks you`, evidence: `Share of voice ${pct(rival.influence)} versus yours at ${pct(subject.influence)}.` });
    }
    const urls = sourceUrls(subject);
    const ownDomain = domainOf(subject.link);
    const owned = ownDomain ? urls.filter(u => domainOf(u) === ownDomain) : [];
    if (urls.length === 0 || owned.length === 0) {
      findings.push({
        id: 'no-owned-citations',
        severity: 'warning',
        title: 'AI does not cite your own site',
        evidence: urls.length === 0
          ? `No citation URLs were attached to ${ctx.subject} in the scanned answers.`
          : `${urls.length} citation${urls.length === 1 ? '' : 's'} about you, none on ${ownDomain}.`
      });
    }
    const byPrompt = subject.mentionsByPrompt as Record<string, number> | undefined;
    if (byPrompt && questions.length > 1) {
      const hit = questions.filter(q => Number(byPrompt[q.id]) > 0).length;
      if (hit / questions.length < 0.5) {
        findings.push({ id: 'low-coverage', severity: 'warning', title: 'Absent from most scanned questions', evidence: `Mentioned in ${hit} of ${questions.length} questions.` });
      }
    }
  }

  const thirdParty = (ctx.linkDomains || [])
    .filter(d => THIRD_PARTY_HOSTS.some(host => String(d?.value ?? '').toLowerCase().includes(host)))
    .sort((a, b) => Number(b.influence) - Number(a.influence));
  if (thirdParty.length > 0) {
    findings.push({ id: 'third-party-dependence', severity: 'info', title: 'Answers lean on third-party platforms', evidence: `Most cited: ${thirdParty.slice(0, 3).map(d => `${d.value} (${pct(d.influence)})`).join(', ')}. These are the pages to get listed in.` });
  }
  return findings;
}

function llmsTxt(ctx: SolutionContext, domain: string): string {
  return [
    `# ${ctx.subject}`,
    '',
    `> TODO: one factual, quotable sentence - what ${ctx.subject} is, who it serves, and the one thing it does better than alternatives.`,
    '',
    'Key pages:',
    `- [Home](https://${domain}/): what ${ctx.subject} is and who it is for`,
    `- [Pricing](https://${domain}/pricing): plans, limits and what each plan includes`,
    `- [Documentation](https://${domain}/docs): how the product works, with concrete examples`,
    `- [About](https://${domain}/about): company, team and contact details`,
    '',
    '## Optional',
    `- [Comparisons](https://${domain}/vs): honest side-by-side pages against named alternatives`,
    `- [Changelog](https://${domain}/changelog): dated, factual release notes`,
    '',
    '## Notes for editors',
    '- Delete every page above that does not exist. Do not publish dead links.',
    '- Replace each TODO with a verifiable fact from the live site.',
    '- Keep this file plain text, served at /llms.txt with Content-Type text/plain.',
    ''
  ].join('\n');
}

function robotsTxt(): string {
  return [
    '# Baseline: allow crawling by default.',
    'User-agent: *',
    'Allow: /',
    '',
    '# AI search crawlers - these index pages for AI answers and citations.',
    'User-agent: OAI-SearchBot',
    'Allow: /',
    '',
    'User-agent: PerplexityBot',
    'Allow: /',
    '',
    'User-agent: Claude-SearchBot',
    'Allow: /',
    '',
    'User-agent: Applebot',
    'Allow: /',
    '',
    'User-agent: Bingbot',
    'Allow: /',
    '',
    'User-agent: Googlebot',
    'Allow: /',
    '',
    '# AI assistants that fetch a page live while answering a user.',
    'User-agent: ChatGPT-User',
    'Allow: /',
    '',
    'User-agent: Perplexity-User',
    'Allow: /',
    '',
    'User-agent: Claude-User',
    'Allow: /',
    '',
    'User-agent: meta-externalfetcher',
    'Allow: /',
    '',
    '# Training crawlers. Allowed by default; blocking them is a separate decision',
    '# and does not remove you from AI search answers.',
    'User-agent: GPTBot',
    'Allow: /',
    '',
    'User-agent: ClaudeBot',
    'Allow: /',
    '',
    'User-agent: anthropic-ai',
    'Allow: /',
    '',
    'User-agent: CCBot',
    'Allow: /',
    '',
    'User-agent: Bytespider',
    'Allow: /',
    '',
    '# Google-Extended and Applebot-Extended are robots.txt-only opt-out tokens,',
    '# not user agents you will see in server logs.',
    'User-agent: Google-Extended',
    'Allow: /',
    '',
    'User-agent: Applebot-Extended',
    'Allow: /',
    '',
    '# To opt out of training only, replace the matching Allow block above with:',
    '# User-agent: CCBot',
    '# Disallow: /',
    '',
    'Sitemap: https://YOUR-DOMAIN/sitemap.xml',
    ''
  ].join('\n');
}

function faqJsonLd(ctx: SolutionContext): string {
  const questions = (ctx.questions || []).slice(0, 5);
  const items = questions.length > 0 ? questions : [{ id: 'q1', text: `What is ${ctx.subject} and who is it for?` }];
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: items.map(q => ({
      '@type': 'Question',
      name: q.text,
      acceptedAnswer: {
        '@type': 'Answer',
        text: `TODO: answer "${q.text}" in 2-4 sentences that name ${ctx.subject} explicitly, state a verifiable fact, and can be quoted verbatim by an AI engine.`
      }
    }))
  };
  return JSON.stringify(schema, null, 2) + '\n';
}

function metaDescriptions(ctx: SolutionContext): string {
  const questions = (ctx.questions || []).slice(0, 3);
  const items = questions.length > 0 ? questions : [{ id: 'q1', text: `What is ${ctx.subject}?` }];
  const lines: string[] = [];
  items.forEach((q, index) => {
    lines.push(`Page ${index + 1} - targets: "${q.text}"`);
    lines.push(`  title (<= 60 chars): ${ctx.subject}: TODO short answer to the question`);
    lines.push(`  meta description (<= 155 chars): ${ctx.subject} - TODO one sentence that answers the question with a verifiable fact and names the brand.`);
    lines.push('');
  });
  lines.push('Rules: no keyword stuffing, no invented claims, one intent per page, brand name written exactly as customers search it.');
  return lines.join('\n') + '\n';
}

export function buildAssets(ctx: SolutionContext, findings: SolutionFinding[]): SolutionAsset[] {
  const has = (id: string) => findings.some(f => f.id === id);
  const { brand: subject } = findSubjectBrand(ctx.brands, ctx.subject, aliasesOf(ctx));
  const domain = domainOf(subject?.link) || 'YOUR-DOMAIN';
  const assets: SolutionAsset[] = [];

  if (has('absent') || has('no-owned-citations')) {
    assets.push({
      id: 'llms-txt', title: 'llms.txt', filename: 'llms.txt', language: 'text',
      findingIds: findings.filter(f => ['absent', 'no-owned-citations'].includes(f.id)).map(f => f.id),
      instructions: `Publish at https://${domain}/llms.txt. Replace every TODO with a fact from your site and delete pages that do not exist.`,
      content: llmsTxt(ctx, domain)
    });
  }
  if (has('absent') || has('engine-gaps')) {
    assets.push({
      id: 'robots-txt', title: 'robots.txt rules for AI crawlers', filename: 'robots.txt', language: 'text',
      findingIds: findings.filter(f => ['absent', 'engine-gaps'].includes(f.id)).map(f => f.id),
      instructions: 'Merge into your existing robots.txt, keeping your current rules. Replace YOUR-DOMAIN in the Sitemap line. Also remove any noai, noimageai or nosnippet meta tags or X-Robots-Tag headers from pages you want cited.',
      content: robotsTxt()
    });
  }
  if (has('buried') || has('outranked') || has('low-coverage') || has('absent')) {
    assets.push({
      id: 'faq-jsonld', title: 'FAQ block + FAQPage JSON-LD', filename: 'faq.jsonld.json', language: 'json',
      findingIds: findings.filter(f => ['buried', 'outranked', 'low-coverage', 'absent'].includes(f.id)).map(f => f.id),
      instructions: 'Write the real answers first, render them as a visible FAQ section on the page, then inject this JSON-LD into the same page head. Schema must match visible content.',
      content: faqJsonLd(ctx)
    });
  }
  if (has('absent') || has('buried') || has('engine-gaps')) {
    assets.push({
      id: 'meta-descriptions', title: 'Meta titles and descriptions', filename: 'meta-descriptions.txt', language: 'text',
      findingIds: findings.filter(f => ['absent', 'buried', 'engine-gaps'].includes(f.id)).map(f => f.id),
      instructions: 'Apply to the page that should win each scanned question. One intent per page.',
      content: metaDescriptions(ctx)
    });
  }
  return assets;
}

const FIX_TASKS: Record<string, (ctx: SolutionContext, findings: SolutionFinding[]) => string> = {
  absent: ctx => `Make ${ctx.subject} identifiable: rewrite the first 100 words of the homepage and about page to state who you are, what you do and who it is for. Add Organization JSON-LD with name, url, logo and sameAs.`,
  'engine-gaps': (_ctx, findings) => `Close the engine gaps (${findings.find(f => f.id === 'engine-gaps')?.evidence}). Check robots.txt and meta robots for blocks, confirm the pages are indexed by Google and Bing, then apply the robots.txt and llms.txt assets below.`,
  buried: () => 'Move the answer to the top: first sentence of each target page answers the question directly, H2/H3 mirror the question wording, add a comparison table and a 2-3 sentence quotable summary.',
  outranked: (_ctx, findings) => `Publish an honest comparison page against the brand that outranks you (${findings.find(f => f.id === 'outranked')?.title}). Use real, verifiable differences - no invented claims.`,
  'no-owned-citations': ctx => `Publish primary sources models can cite about ${ctx.subject}: pricing, documentation, methodology, about. Add Article or Product JSON-LD and stable section anchors.`,
  'low-coverage': () => 'Create one dedicated, quotable answer page per scanned question where the brand is absent. Use the question wording in the H1.',
  'third-party-dependence': (_ctx, findings) => `Get listed where models already look (${findings.find(f => f.id === 'third-party-dependence')?.evidence}). Pitch an accurate entry with a link back to your site.`,
  'name-variant': () => 'Make the canonical brand name identical everywhere: title, H1, Organization schema, sameAs profiles and directory listings.'
};

export function buildRepairPrompt(ctx: SolutionContext, findings: SolutionFinding[], assets: SolutionAsset[]): string {
  const { brand: subject } = findSubjectBrand(ctx.brands, ctx.subject, aliasesOf(ctx));
  const domain = domainOf(subject?.link);
  const lines: string[] = [
    'You are a senior technical SEO and GEO engineer working on my website.',
    '',
    `BRAND: ${ctx.subject}`,
    `SITE: ${domain ? `https://${domain}` : 'not detected in the scan - ask me for the URL before editing'}`,
    `SCAN DATE: ${ctx.targetDate}`,
    `ENGINES TESTED: ${(ctx.bots || []).map(b => b.name).join(', ') || 'none recorded'}`,
    'QUESTIONS TESTED:',
    ...((ctx.questions || []).length > 0 ? ctx.questions.map((q, i) => `${i + 1}. "${q.text}"`) : ['(no question list was recorded)']),
    '',
    'MEASURED FINDINGS (from real engine answers, not guesses):',
    ...findings.map(f => `- [${f.severity.toUpperCase()}] ${f.title} - ${f.evidence}`),
    '',
    'YOUR TASK',
    'Apply the fixes below in this order. For each change show me the file or URL you edited, the exact diff, and which finding it addresses.',
    ''
  ];
  findings.forEach((f, i) => {
    const task = FIX_TASKS[f.id];
    if (task) lines.push(`${i + 1}. ${task(ctx, findings)}`);
  });
  lines.push(
    '',
    'PASTE-READY ASSETS (apply them, then replace every TODO with a fact you can verify on my site; delete anything you cannot verify):',
    ...(assets.length > 0 ? assets.map(a => `- ${a.filename}: ${a.instructions}`) : ['- none were generated for these findings']),
    '',
    'CONSTRAINTS',
    '- Do not invent facts, prices, customers, awards or statistics.',
    '- Do not keyword-stuff. Write sentences an AI engine can quote verbatim.',
    '- Every claim must be verifiable on my site or cite its source.',
    '- Do not block AI search crawlers.',
    '- Preserve existing URLs; no redirect chains.',
    '',
    'VERIFY WHEN DONE',
    `- Re-ask each scanned question and record whether ${ctx.subject} appears, at which position, and which URL is cited.`,
    '- Report before and after per finding. If a fix cannot move a finding, say so plainly.',
    '',
    'OUTPUT',
    'A checklist of changes applied, the files touched, and the findings you could not fix.'
  );
  return lines.join('\n');
}

const COPY_SCRIPT = `
        <script>
        window.geoxCopyBlock = window.geoxCopyBlock || function (btn) {
            var block = btn.closest('.geox-block');
            var pre = block && block.querySelector('pre');
            if (!pre) return;
            var text = pre.innerText;
            var label = btn.textContent;
            var done = function () { btn.textContent = 'Copied'; setTimeout(function () { btn.textContent = label; }, 1500); };
            var fallback = function () {
                var ta = document.createElement('textarea');
                ta.value = text; ta.setAttribute('readonly', ''); ta.style.position = 'fixed'; ta.style.opacity = '0';
                document.body.appendChild(ta); ta.select();
                try { document.execCommand('copy'); done(); } catch (e) { /* clipboard unavailable */ }
                document.body.removeChild(ta);
            };
            if (navigator.clipboard && navigator.clipboard.writeText) { navigator.clipboard.writeText(text).then(done, fallback); } else { fallback(); }
        };
        </script>`;

function blockHtml(id: string, title: string, subtitle: string, content: string, open: boolean): string {
  return `
            <details class="geox-block mt-4 rounded-lg border border-gray-200 dark:border-gray-700"${open ? ' open' : ''}>
                <summary class="cursor-pointer px-4 py-3 font-semibold text-gray-900 dark:text-white">${esc(title)}</summary>
                <div class="px-4 pb-4">
                    <p class="text-sm text-gray-600 dark:text-gray-400 mb-2">${esc(subtitle)}</p>
                    <button type="button" onclick="geoxCopyBlock(this)" class="mb-2 px-3 py-1.5 text-xs font-semibold rounded-md border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 bg-white dark:bg-gray-800 hover:bg-indigo-50 dark:hover:bg-indigo-950">Copy</button>
                    <pre id="${esc(id)}" class="overflow-x-auto text-xs leading-relaxed p-3 rounded-md bg-gray-50 dark:bg-gray-900 text-gray-800 dark:text-gray-200 whitespace-pre-wrap">${esc(content)}</pre>
                </div>
            </details>`;
}

export function generateSolutionHtml(ctx: SolutionContext): string {
  const findings = deriveFindings(ctx);
  if (findings.length === 0) {
    return `
        <section id="geox-solution" class="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-8">
            <div class="section-header"><i class="fas fa-screwdriver-wrench text-xl"></i><h2>Your solution</h2></div>
            <p class="text-sm text-gray-700 dark:text-gray-300">No blocking gaps were detected in this scan: ${esc(ctx.subject)} appears across the tested engines with cited sources. Keep the cited pages fresh and re-run after your next content release.</p>
        </section>`;
  }

  const assets = buildAssets(ctx, findings);
  const prompt = buildRepairPrompt(ctx, findings, assets);
  const severityClass: Record<string, string> = {
    critical: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
    warning: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200',
    info: 'bg-sky-100 text-sky-800 dark:bg-sky-900 dark:text-sky-200'
  };

  const findingItems = findings.map(f => `
                <li class="py-3 border-b border-gray-100 dark:border-gray-700 last:border-0">
                    <div class="flex items-start gap-3">
                        <span class="mt-0.5 px-2 py-0.5 text-xs font-semibold rounded-full ${severityClass[f.severity]}">${esc(f.severity)}</span>
                        <div class="min-w-0">
                            <div class="font-medium text-gray-900 dark:text-white">${esc(f.title)}</div>
                            <div class="text-sm text-gray-600 dark:text-gray-400">${esc(f.evidence)}</div>
                        </div>
                    </div>
                </li>`).join('');

  const assetBlocks = assets.map(a => blockHtml(`geox-asset-${a.id}`, `${a.title} (${a.filename})`, a.instructions, a.content, true)).join('');

  return `
        <section id="geox-solution" class="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-8">
            <div class="section-header"><i class="fas fa-screwdriver-wrench text-xl"></i><h2>Your solution</h2></div>
            <p class="text-sm text-gray-600 dark:text-gray-400 mb-4">What the scan measured, one prompt that fixes it, and the files to paste. Every item below is tied to a finding above it.</p>
            <h3 class="font-semibold text-gray-900 dark:text-white">Diagnostic</h3>
            <ul class="mt-2 mb-6">${findingItems}
            </ul>
            <h3 class="font-semibold text-gray-900 dark:text-white">AI repair prompt</h3>
            <p class="text-sm text-gray-600 dark:text-gray-400">Copy this single prompt into ChatGPT, Claude or Cursor together with access to your site or repository. It carries the measured findings, so the agent fixes what was actually observed.</p>
            ${blockHtml('geox-repair-prompt', 'Copy-paste repair prompt', 'One prompt, all findings, in execution order.', prompt, true)}
            ${assets.length > 0 ? `<h3 class="mt-6 font-semibold text-gray-900 dark:text-white">Paste-ready assets</h3>${assetBlocks}` : ''}
            <p class="mt-6 text-xs text-gray-500 dark:text-gray-400">These are a starting point, not a ranking guarantee. Answers were collected through provider APIs, which can differ from what a signed-in user sees in the consumer product.</p>
        </section>${COPY_SCRIPT}`;
}
