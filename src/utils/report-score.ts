/**
 * Visibility score section (0-100).
 *
 * The score is computed upstream and arrives in the compiled data as `score`
 * (overall + per engine + breakdown). This module only renders it: a missing or
 * malformed field omits the section instead of failing the report.
 */

export interface ScoreEngine {
  id: string;
  score: number;
}

export interface ScoreBreakdownItem {
  key: string;
  label: string;
  value: number;
  weight?: number;
}

export interface ReportScore {
  overall: number;
  engines: ScoreEngine[];
  breakdown: ScoreBreakdownItem[];
}

function esc(text: unknown): string {
  return String(text ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function toNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function clamp(value: number): number {
  return Math.max(0, Math.min(100, value));
}

function titleCase(key: string): string {
  return key.replace(/[_-]+/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

/**
 * Accept the documented contract and the obvious spelling variants, so a
 * renamed upstream field degrades to a partial score rather than a crash.
 */
export function normalizeScore(raw: unknown): ReportScore | null {
  if (!raw || typeof raw !== 'object') return null;
  const source = raw as Record<string, unknown>;
  const overall = toNumber(source.overall ?? source.total ?? source.value);
  if (overall === null) return null;

  const engines: ScoreEngine[] = [];
  const perEngine = source.perEngine ?? source.per_engine ?? source.engines;
  if (Array.isArray(perEngine)) {
    for (const entry of perEngine) {
      if (!entry || typeof entry !== 'object') continue;
      const item = entry as Record<string, unknown>;
      const id = String(item.id ?? item.engine ?? item.model ?? '').trim();
      const score = toNumber(item.score ?? item.value);
      if (id && score !== null) engines.push({ id, score: clamp(score) });
    }
  } else if (perEngine && typeof perEngine === 'object') {
    for (const [id, value] of Object.entries(perEngine as Record<string, unknown>)) {
      const score = toNumber(value);
      if (score !== null) engines.push({ id, score: clamp(score) });
    }
  }

  const breakdown: ScoreBreakdownItem[] = [];
  const rawBreakdown = source.breakdown ?? source.components;
  if (Array.isArray(rawBreakdown)) {
    for (const entry of rawBreakdown) {
      if (!entry || typeof entry !== 'object') continue;
      const item = entry as Record<string, unknown>;
      const key = String(item.key ?? item.id ?? item.label ?? item.name ?? '').trim();
      const value = toNumber(item.value ?? item.score);
      if (!key || value === null) continue;
      const weight = toNumber(item.weight);
      breakdown.push({
        key,
        label: String(item.label ?? item.name ?? titleCase(key)),
        value: clamp(value),
        ...(weight !== null && weight > 0 ? { weight } : {})
      });
    }
  }

  return { overall: clamp(overall), engines, breakdown };
}

export function scoreVerdict(overall: number): string {
  if (overall < 25) return 'Invisible';
  if (overall < 50) return 'Weak';
  if (overall < 75) return 'Present';
  return 'Strong';
}

export function generateScoreHtml(rawScore: unknown, bots: Array<{ id: string; name: string }> = []): string {
  const score = normalizeScore(rawScore);
  if (!score) return '';

  const nameOf = (id: string) => bots.find(b => b.id === id)?.name || titleCase(id);
  const overall = Math.round(score.overall);

  const engineRows = score.engines.map(engine => `
                <div class="flex items-center gap-3">
                    <span class="w-40 flex-shrink-0 text-sm text-gray-700 dark:text-gray-300 truncate" title="${esc(nameOf(engine.id))}">${esc(nameOf(engine.id))}</span>
                    <div class="flex-1 h-2 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
                        <div class="h-full bg-indigo-500" style="width: ${clamp(engine.score)}%"></div>
                    </div>
                    <span class="w-12 text-right text-sm font-semibold text-gray-900 dark:text-white">${Math.round(engine.score)}</span>
                </div>`).join('');

  const breakdownRows = score.breakdown.map(item => `
                        <tr>
                            <td class="py-1.5 pr-3 text-gray-700 dark:text-gray-300">${esc(item.label)}</td>
                            <td class="py-1.5 px-3 text-center font-medium text-gray-900 dark:text-white">${Math.round(item.value)}</td>
                            <td class="py-1.5 pl-3 text-center text-gray-500 dark:text-gray-400">${item.weight !== undefined ? `${Math.round(item.weight * 100)}%` : '—'}</td>
                        </tr>`).join('');

  return `
        <section id="geox-score" class="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-8">
            <div class="section-header">
                <i class="fas fa-gauge-high text-xl"></i>
                <h2>AI Visibility Score</h2>
            </div>
            <div class="flex flex-col md:flex-row gap-6 md:items-center">
                <div class="flex-shrink-0 text-center">
                    <div class="text-5xl font-black text-indigo-600 dark:text-indigo-400">${overall}<span class="text-xl font-semibold text-gray-400">/100</span></div>
                    <div class="mt-1 text-sm font-semibold uppercase tracking-wide text-gray-600 dark:text-gray-300">${esc(scoreVerdict(score.overall))}</div>
                </div>
                <div class="flex-1 space-y-2">${engineRows || '<p class="text-sm text-gray-500">Per-engine scores were not provided.</p>'}
                </div>
            </div>
            ${breakdownRows ? `
            <div class="mt-6 overflow-x-auto">
                <table class="w-full text-sm">
                    <thead>
                        <tr class="text-left text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700">
                            <th class="pb-2 pr-3">Component</th>
                            <th class="pb-2 px-3 text-center">Score</th>
                            <th class="pb-2 pl-3 text-center">Weight</th>
                        </tr>
                    </thead>
                    <tbody>${breakdownRows}
                    </tbody>
                </table>
            </div>` : ''}
            <p class="mt-4 text-xs text-gray-500 dark:text-gray-400">
                Scored from the same engine answers shown below. Weights and components are listed so the number can be audited.
            </p>
        </section>`;
}
