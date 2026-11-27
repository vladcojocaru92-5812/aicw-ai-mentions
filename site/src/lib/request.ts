export const PLANS = ['free', 'repair', 'beat'] as const;
export type Plan = (typeof PLANS)[number];
export type ScoreRequest = { brand: string; domain: string; email: string; plan: Plan };
export type Parsed = { ok: true; spam: boolean; value: ScoreRequest } | { ok: false; error: string };

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const HOST = /^(?=.{1,253}$)([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/;

// "https://www.Acme.com/about?x" -> "acme.com"
export function normalizeDomain(input: string): string | null {
  const raw = input.trim();
  if (!raw) return null;
  try {
    const host = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`).hostname.toLowerCase().replace(/^www\./, '');
    return HOST.test(host) ? host : null;
  } catch {
    return null;
  }
}

export function parseRequest(form: FormData): Parsed {
  const field = (name: string) => String(form.get(name) ?? '').trim();
  const domain = normalizeDomain(field('domain'));
  const email = field('email');
  if (!domain) return { ok: false, error: 'Enter your website, like acme.com.' };

  // The landing asks only for the website; the brand defaults to it until someone names it.
  const brand = field('brand') || domain;
  if (brand.length > 100) return { ok: false, error: 'Enter your brand name (up to 100 characters).' };
  if (email.length > 254 || !EMAIL.test(email)) return { ok: false, error: 'Enter a valid email address.' };

  const rawPlan = field('plan') || 'free';
  if (!(PLANS as readonly string[]).includes(rawPlan)) return { ok: false, error: 'Unknown report type.' };
  const plan = rawPlan as Plan;

  // Honeypot: a hidden field only bots fill. Report success so they don't retry.
  return { ok: true, spam: field('website') !== '', value: { brand, domain, email, plan } };
}
