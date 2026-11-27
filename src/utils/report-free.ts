/**
 * GEOX free tier: a standalone free.html with the score and nothing else.
 *
 * It is its own file on purpose. The paid report ships the answers, rankings and
 * citations in index.html and the *-data.js / *-answers.js files next to it, so
 * hiding sections there would still leak them. Upload free.html alone for the
 * free link, and the full report folder only after payment.
 */
import { esc, generateScoreHtml, normalizeScore } from './report-score.js';
import { deriveFindings, SolutionContext } from './report-solution.js';

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;

export function generateFreeReportHtml(ctx: SolutionContext, buyUrl: string | undefined = process.env.GEOX_BUY_URL): string {
  const score = normalizeScore(ctx.data?.score);
  if (!score) return '';

  const allBots = (Array.isArray(ctx.data?.bots) ? ctx.data.bots : ctx.bots) as Array<{ id: string; name: string }>;
  const engines = score.engines.length || ctx.bots.length;
  const findings = deriveFindings(ctx);
  const critical = findings.filter(f => f.severity === 'critical').length;

  // ponytail: counts only, no titles. Titles name rivals and gaps, which is what the paid report sells.
  const teaser = findings.length
    ? `This scan turned up ${plural(findings.length, 'finding')}${critical ? `, ${critical} of them critical` : ''}. The full report explains each one and gives you the fixes.`
    : 'The full report shows every answer, mention and citation behind this score.';

  const cta = buyUrl
    ? `<a href="${esc(buyUrl)}" class="inline-block rounded-md bg-indigo-600 px-5 py-3 font-semibold text-white hover:bg-indigo-700">Get the full report for $9</a>`
    : '<p class="font-semibold text-gray-900">To order the repair report ($9) or Beat Them ($19), reply to the email this link came in.</p>';

  const scoreHtml = generateScoreHtml(ctx.data?.score, allBots,
    `Scored from the AI answers recorded on ${esc(ctx.targetDate)}. Weights and components are listed so you can check the number.`);

  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="robots" content="noindex, nofollow">
    <title>${esc(ctx.subject)}: AI visibility score | GEOX</title>
    <!-- ponytail: same Tailwind Play CDN as the paid report (no SRI possible, it is unversioned); compile CSS once reports are served from the site -->
    <script src="https://cdn.tailwindcss.com"></script>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.2/css/all.min.css" integrity="sha512-SnH5WK+bZxgPHs44uWIX+LLJAJ9/2PkPKZ5QiAj6Ta86w+fsb2TkcmfRyVX3pBnMFcV7oQPJkl9QevSCWr3W6A==" crossorigin="anonymous" referrerpolicy="no-referrer" />
    <style>
        .section-header { display: flex; align-items: center; gap: 0.5rem; margin-bottom: 1rem; }
        .section-header h2 { font-size: 1.25rem; font-weight: 700; }
        .section-header i { color: #4f46e5; }
    </style>
</head>
<body class="bg-gray-50 text-gray-900">
    <main class="mx-auto max-w-3xl px-4 py-10">
        <p class="text-sm font-semibold uppercase tracking-wide text-indigo-600">GEOX free score</p>
        <h1 class="mt-1 text-3xl font-bold">${esc(ctx.subject)}</h1>
        <p class="mt-2 mb-8 text-gray-600">Based on ${plural(ctx.questions.length, 'buyer question')} asked to ${plural(engines, 'AI engine')} on ${esc(ctx.targetDate)}.</p>
        ${scoreHtml}
        <section id="geox-free-locked" class="rounded-lg border border-indigo-200 bg-white p-6">
            <h2 class="text-xl font-bold">What the full report adds</h2>
            <p class="mt-2 text-gray-700">${teaser}</p>
            <ul class="mt-4 list-disc space-y-1 pl-5 text-gray-700">
                <li>The buyer questions, AI answers and cited pages behind your score</li>
                <li>Each finding with the evidence behind it</li>
                <li>A repair prompt you can paste into ChatGPT or Claude</li>
                <li>Paste-ready files matched to your findings: llms.txt, robots.txt rules, FAQ schema, meta descriptions</li>
            </ul>
            <div class="mt-6">${cta}</div>
        </section>
    </main>
    <footer class="mx-auto max-w-3xl px-4 pb-10 text-sm text-gray-500">&copy; GEOX</footer>
</body>
</html>
`;
}
