/**
 * GEOX "Beat Them" section (19 USD tier): battlecards for 1-3 competitors taken
 * from the same scan - side-by-side metrics, strengths and weaknesses derived
 * from those metrics, and a battle plan tied to the measured gaps.
 * Pattern adapted from danishashko/geo-aeo-tracker (MIT) competitor battlecards.
 */

import { SolutionContext, aliasesOf, domainOf, findSubjectBrand, sourceUrls } from './report-solution.js';

export interface SideMetrics {
  name: string;
  mentions: number;
  influence: number;
  position: number | null;
  citations: number;
  domains: string[];
  engines: string[];
  questionsHit: number | null;
}

export interface Battlecard {
  you: SideMetrics;
  competitor: SideMetrics;
  strengths: string[];
  weaknesses: string[];
  outreach: Array<{ domain: string; urls: string[] }>;
  missedQuestions: string[];
  plan: Array<{ action: string; why: string }>;
}

function esc(text: unknown): string {
  return String(text ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function pct(value: unknown): string {
  const n = Number(value);
  return Number.isFinite(n) ? `${(n * 100).toFixed(1)}%` : 'N/A';
}

function norm(value: unknown): string {
  return String(value ?? '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function metricsOf(brand: any, ctx: SolutionContext): SideMetrics {
  const byModel = (brand?.mentionsByModel || {}) as Record<string, number>;
  const engines = (ctx.bots || []).filter(b => Number(byModel[b.id]) > 0).map(b => b.name);
  const urls = sourceUrls(brand);
  const domains = Array.from(new Set(urls.map(domainOf).filter(Boolean))) as string[];
  const order = Number(brand?.appearanceOrder);
  const byPrompt = brand?.mentionsByPrompt as Record<string, number> | undefined;
  return {
    name: String(brand?.value ?? ''),
    mentions: Number(brand?.mentions) || 0,
    influence: Number(brand?.influence) || 0,
    position: Number.isFinite(order) && order > 0 && order < 999 ? order : null,
    citations: urls.length,
    domains,
    engines,
    questionsHit: byPrompt ? (ctx.questions || []).filter(q => Number(byPrompt[q.id]) > 0).length : null
  };
}

/** Explicit selection from the scan data wins; otherwise the strongest rivals. */
export function selectCompetitors(ctx: SolutionContext, max = 3): any[] {
  const { brand: subject } = findSubjectBrand(ctx.brands, ctx.subject, aliasesOf(ctx));
  const list = Array.isArray(ctx.brands) ? ctx.brands : [];
  const explicit = ctx.data?.competitors;
  if (Array.isArray(explicit) && explicit.length > 0) {
    const wanted = explicit.map(norm).filter(Boolean);
    const ordered = wanted
      .map(name => list.find(b => b !== subject && norm(b?.value ?? b?.code) === name))
      .filter(Boolean);
    if (ordered.length > 0) return ordered.slice(0, max);
  }
  return list
    .filter(b => b !== subject && Number(b?.mentions) > 0)
    .sort((a, b) => Number(b.influence) - Number(a.influence))
    .slice(0, max);
}

export function buildBattlecard(ctx: SolutionContext, competitorBrand: any): Battlecard {
  const { brand: subject } = findSubjectBrand(ctx.brands, ctx.subject, aliasesOf(ctx));
  const you = metricsOf(subject || { value: ctx.subject }, ctx);
  const them = metricsOf(competitorBrand, ctx);
  const engineTotal = (ctx.bots || []).length;
  const strengths: string[] = [];
  const weaknesses: string[] = [];

  if (engineTotal > 0 && them.engines.length === engineTotal) strengths.push(`Present in all ${engineTotal} tested engines.`);
  if (them.influence > you.influence) strengths.push(`Higher share of voice: ${pct(them.influence)} versus your ${pct(you.influence)}.`);
  if (them.position !== null && (you.position === null || them.position < you.position)) {
    strengths.push(`Named earlier: average position ${them.position.toFixed(1)}${you.position !== null ? ` versus your ${you.position.toFixed(1)}` : ''}.`);
  }
  if (them.mentions > you.mentions) strengths.push(`More mentions: ${them.mentions} versus your ${you.mentions}.`);
  const theirDomain = domainOf(competitorBrand?.link);
  const theirOwnedUrls = theirDomain ? sourceUrls(competitorBrand).filter(u => domainOf(u) === theirDomain) : [];
  if (theirOwnedUrls.length > 0) strengths.push(`Its own site is cited: ${theirOwnedUrls.length} page${theirOwnedUrls.length === 1 ? '' : 's'} on ${theirDomain}.`);

  if (engineTotal > 0 && them.engines.length < engineTotal) {
    const missing = (ctx.bots || []).filter(b => !them.engines.includes(b.name)).map(b => b.name);
    weaknesses.push(`Absent from ${missing.join(', ')}.`);
  }
  if (them.influence < you.influence) weaknesses.push(`Lower share of voice than you: ${pct(them.influence)} versus ${pct(you.influence)}.`);
  if (them.position !== null && you.position !== null && them.position > you.position) {
    weaknesses.push(`Named later than you: position ${them.position.toFixed(1)} versus your ${you.position.toFixed(1)}.`);
  }
  if (theirOwnedUrls.length === 0) weaknesses.push(`No citations on its own domain${theirDomain ? ` (${theirDomain})` : ''}; it relies on third-party pages.`);
  if (them.questionsHit !== null && you.questionsHit !== null && them.questionsHit < you.questionsHit) {
    weaknesses.push(`Answers fewer scanned questions: ${them.questionsHit} versus your ${you.questionsHit}.`);
  }

  const yourDomains = new Set(you.domains);
  const grouped = new Map<string, string[]>();
  for (const url of sourceUrls(competitorBrand)) {
    const domain = domainOf(url);
    // Their own domain is not an outreach target: you cannot get listed on a rival's site.
    if (!domain || domain === theirDomain || yourDomains.has(domain)) continue;
    if (!grouped.has(domain)) grouped.set(domain, []);
    grouped.get(domain)!.push(url);
  }
  const outreach = Array.from(grouped.entries())
    .sort((a, b) => b[1].length - a[1].length)
    .slice(0, 3)
    .map(([domain, urls]) => ({ domain, urls: urls.slice(0, 2) }));

  const theirByPrompt = competitorBrand?.mentionsByPrompt as Record<string, number> | undefined;
  const yourByPrompt = subject?.mentionsByPrompt as Record<string, number> | undefined;
  const missedQuestions = theirByPrompt && yourByPrompt
    ? (ctx.questions || []).filter(q => Number(theirByPrompt[q.id]) > 0 && !(Number(yourByPrompt[q.id]) > 0)).map(q => q.text)
    : [];

  const plan: Array<{ action: string; why: string }> = [];
  if (outreach.length > 0) {
    plan.push({
      action: `Get listed on ${outreach.map(o => o.domain).join(', ')}.`,
      why: `These pages cite ${them.name} and never cite you.`
    });
  }
  if (missedQuestions.length > 0) {
    plan.push({
      action: `Publish a quotable answer page for: ${missedQuestions.slice(0, 3).map(q => `"${q}"`).join('; ')}.`,
      why: `${them.name} appears in these answers and you do not.`
    });
  }
  const engineGap = (ctx.bots || []).filter(b => them.engines.includes(b.name) && !you.engines.includes(b.name)).map(b => b.name);
  if (engineGap.length > 0) {
    plan.push({ action: `Fix crawlability and quotability for ${engineGap.join(', ')}.`, why: `${them.name} is mentioned there and you are not.` });
  }
  if (theirOwnedUrls.length > 0 && you.citations === 0) {
    plan.push({
      action: `Publish primary pages equivalent to: ${theirOwnedUrls.slice(0, 2).join(' , ')}.`,
      why: `Their own domain is cited ${theirOwnedUrls.length} time${theirOwnedUrls.length === 1 ? '' : 's'}; yours is not cited at all.`
    });
  }
  if (plan.length === 0) {
    plan.push({
      action: 'Defend the lead: keep your cited pages fresh and re-run the scan after each release.',
      why: `You match or beat ${them.name} on every metric measured in this scan.`
    });
  }

  return { you, competitor: them, strengths, weaknesses, outreach, missedQuestions, plan };
}

function rowHtml(label: string, yours: string, theirs: string): string {
  return `
                        <tr class="border-b border-gray-100 dark:border-gray-700 last:border-0">
                            <td class="py-2 pr-3 text-gray-600 dark:text-gray-400">${esc(label)}</td>
                            <td class="py-2 px-3 text-center font-medium text-gray-900 dark:text-white">${esc(yours)}</td>
                            <td class="py-2 pl-3 text-center font-medium text-gray-900 dark:text-white">${esc(theirs)}</td>
                        </tr>`;
}

function cardHtml(card: Battlecard): string {
  const { you, competitor } = card;
  const position = (value: number | null) => (value === null ? 'N/A' : value.toFixed(1));
  const list = (items: string[], empty: string) => items.length > 0
    ? `<ul class="mt-2 space-y-1 text-sm text-gray-700 dark:text-gray-300 list-disc list-inside">${items.map(i => `<li>${esc(i)}</li>`).join('')}</ul>`
    : `<p class="mt-2 text-sm text-gray-500">${esc(empty)}</p>`;

  const outreachHtml = card.outreach.length > 0 ? `
                <div class="mt-4">
                    <h4 class="text-sm font-semibold text-gray-900 dark:text-white">Sources to win</h4>
                    <ul class="mt-2 space-y-1 text-sm">${card.outreach.map(o => `
                        <li><span class="font-medium text-gray-800 dark:text-gray-200">${esc(o.domain)}</span> - ${o.urls.map(u => `<a href="${esc(u)}" target="_blank" rel="noopener noreferrer" class="text-indigo-600 dark:text-indigo-400 hover:underline break-all">${esc(u)}</a>`).join(', ')}</li>`).join('')}
                    </ul>
                </div>` : '';

  return `
            <article class="geox-battlecard mt-6 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
                <h3 class="text-lg font-bold text-gray-900 dark:text-white">${esc(you.name || 'You')} vs ${esc(competitor.name)}</h3>
                <div class="overflow-x-auto mt-3">
                    <table class="w-full text-sm">
                        <thead>
                            <tr class="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700">
                                <th class="pb-2 pr-3 text-left">Metric</th>
                                <th class="pb-2 px-3 text-center">You</th>
                                <th class="pb-2 pl-3 text-center">${esc(competitor.name)}</th>
                            </tr>
                        </thead>
                        <tbody>${rowHtml('Share of voice', pct(you.influence), pct(competitor.influence))}${rowHtml('Mentions', String(you.mentions), String(competitor.mentions))}${rowHtml('Average position', position(you.position), position(competitor.position))}${rowHtml('Cited URLs', String(you.citations), String(competitor.citations))}${rowHtml('Cited domains', String(you.domains.length), String(competitor.domains.length))}${rowHtml('Engines covering', `${you.engines.length}`, `${competitor.engines.length}`)}
                        </tbody>
                    </table>
                </div>
                <div class="grid gap-4 md:grid-cols-2 mt-4">
                    <div>
                        <h4 class="text-sm font-semibold text-gray-900 dark:text-white">Why they win</h4>
                        ${list(card.strengths, 'No measured advantage over you in this scan.')}
                    </div>
                    <div>
                        <h4 class="text-sm font-semibold text-gray-900 dark:text-white">Where they are exposed</h4>
                        ${list(card.weaknesses, 'No measured weakness in this scan.')}
                    </div>
                </div>
                <div class="mt-4">
                    <h4 class="text-sm font-semibold text-gray-900 dark:text-white">Battle plan</h4>
                    <ol class="mt-2 space-y-2 text-sm text-gray-700 dark:text-gray-300 list-decimal list-inside">${card.plan.map(p => `<li><span class="font-medium">${esc(p.action)}</span> <span class="text-gray-500 dark:text-gray-400">${esc(p.why)}</span></li>`).join('')}
                    </ol>
                </div>${outreachHtml}
            </article>`;
}

export function generateBattlecardsHtml(ctx: SolutionContext): string {
  const competitors = selectCompetitors(ctx);
  const header = `
            <div class="section-header"><i class="fas fa-chess text-xl"></i><h2>Beat them</h2></div>`;

  if (competitors.length === 0) {
    return `
        <section id="geox-beat" class="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-8">${header}
            <p class="text-sm text-gray-700 dark:text-gray-300">No competitor mentions were recorded in this scan, so there is nothing to compare yet. Re-run the scan with competitor brands included to unlock the head-to-head teardown.</p>
        </section>`;
  }

  const cards = competitors.map(brand => cardHtml(buildBattlecard(ctx, brand))).join('');
  return `
        <section id="geox-beat" class="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-8">${header}
            <p class="text-sm text-gray-600 dark:text-gray-400">Head-to-head against ${competitors.length} competitor${competitors.length === 1 ? '' : 's'} from the same scan. Every strength, weakness and action below is derived from the measured answers, not from opinion.</p>${cards}
            <p class="mt-6 text-xs text-gray-500 dark:text-gray-400">A starting point, not a guarantee that you will outrank them. Answers were collected through provider APIs, which can differ from the signed-in consumer product.</p>
        </section>`;
}
