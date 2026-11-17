/**
 * Visibility score (0-100) for the subject brand, computed deterministically
 * from the compiled scan data. No LLM calls: every component is explainable
 * and reproducible from the saved answers.
 *
 * Components (weights sum to 1):
 * - mentions:  brand mention volume vs the top brand in the scan
 * - position:  average appearance rank (1st = 100, -20 per rank, 0 at 6th+)
 * - coverage:  share of engines that mention the brand
 * - citations: brand cited-source count vs the top brand
 *
 * Sentiment is intentionally absent (would need a paid LLM judge); the
 * breakdown labels document what is and isn't measured.
 */

export interface ScoreComponent {
  key: string;
  label: string;
  value: number;
  weight: number;
}

export interface VisibilityScore {
  subject: string;
  matched: boolean;
  overall: number;
  perEngine: Record<string, number>;
  breakdown: ScoreComponent[];
}

const WEIGHTS = { mentions: 0.35, position: 0.25, coverage: 0.2, citations: 0.2 };
const POSITION_DECAY = 20;

function clamp100(n: number): number {
  return Math.max(0, Math.min(100, Math.round(n)));
}

function positionScore(order: number | undefined): number {
  if (!order || order <= 0) return 0;
  return clamp100(100 - (order - 1) * POSITION_DECAY);
}

function sourceBots(source: any): string[] {
  return String(source?.bots || '').split(',').map(s => s.trim()).filter(Boolean);
}

function weighted(parts: { mentions: number; position: number; coverage: number; citations: number }): number {
  return clamp100(
    WEIGHTS.mentions * parts.mentions +
    WEIGHTS.position * parts.position +
    WEIGHTS.coverage * parts.coverage +
    WEIGHTS.citations * parts.citations
  );
}

/**
 * Calculate the visibility score for the subject brand.
 * Returns null when there is nothing to score (no brands or no bots).
 * An absent subject scores 0 with matched:false (free tier shows "Invisible").
 */
export function calculateVisibilityScore(data: any, subjectName: string): VisibilityScore | null {
  const brands: any[] = Array.isArray(data?.brands) ? data.brands : [];
  const bots: any[] = Array.isArray(data?.bots) ? data.bots : [];
  if (!brands.length || !bots.length) return null;

  const needle = (subjectName || '').toLowerCase().trim();
  let subject = brands.find(b => (b.value || '').toLowerCase() === needle);
  if (!subject && needle) {
    subject = brands.find(b => {
      const v = (b.value || '').toLowerCase();
      return v && (v.includes(needle) || needle.includes(v));
    });
  }

  const maxMentions = Math.max(0, ...brands.map(b => b.mentions || 0));
  const maxSources = Math.max(0, ...brands.map(b => (b.sources || []).length));

  const perEngine: Record<string, number> = {};
  for (const bot of bots) {
    const id = bot.id;
    const mentionCount = subject?.mentionsByModel?.[id] || 0;
    const maxEngineMentions = Math.max(0, ...brands.map(b => b.mentionsByModel?.[id] || 0));
    const engineSources = (subject?.sources || []).filter((s: any) => sourceBots(s).includes(id)).length;
    const maxEngineSources = Math.max(0, ...brands.map(b => (b.sources || []).filter((s: any) => sourceBots(s).includes(id)).length));
    perEngine[id] = weighted({
      mentions: maxEngineMentions > 0 ? (mentionCount / maxEngineMentions) * 100 : 0,
      position: positionScore(subject?.appearanceOrderByModel?.[id]),
      coverage: mentionCount > 0 ? 100 : 0,
      citations: maxEngineSources > 0 ? (engineSources / maxEngineSources) * 100 : 0
    });
  }

  const presentOrders = bots
    .map(bot => subject?.appearanceOrderByModel?.[bot.id])
    .filter((o: any) => o > 0);
  const mentionedBots = bots.filter(bot => (subject?.mentionsByModel?.[bot.id] || 0) > 0).length;

  const parts = {
    mentions: maxMentions > 0 ? ((subject?.mentions || 0) / maxMentions) * 100 : 0,
    // Absent engines contribute 0, so coverage and position both penalize gaps.
    position: presentOrders.length
      ? presentOrders.reduce((sum: number, o: number) => sum + positionScore(o), 0) / bots.length
      : 0,
    coverage: (mentionedBots / bots.length) * 100,
    citations: maxSources > 0 ? ((subject?.sources || []).length / maxSources) * 100 : 0
  };

  const zero = { mentions: 0, position: 0, coverage: 0, citations: 0 };
  const overallParts = subject ? parts : zero;

  return {
    subject: subject?.value || subjectName,
    matched: Boolean(subject),
    overall: weighted(overallParts),
    perEngine: subject ? perEngine : Object.fromEntries(bots.map(b => [b.id, 0])),
    breakdown: [
      { key: 'mentions', label: 'Mentions vs top brand', value: clamp100(overallParts.mentions), weight: WEIGHTS.mentions },
      { key: 'position', label: 'Appearance position', value: clamp100(overallParts.position), weight: WEIGHTS.position },
      { key: 'coverage', label: 'Engine coverage', value: clamp100(overallParts.coverage), weight: WEIGHTS.coverage },
      { key: 'citations', label: 'Cited sources vs top brand', value: clamp100(overallParts.citations), weight: WEIGHTS.citations }
    ]
  };
}
