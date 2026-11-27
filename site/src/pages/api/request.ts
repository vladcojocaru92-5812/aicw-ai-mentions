import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { parseRequest } from '../../lib/request.ts';

export const prerender = false;

export const POST: APIRoute = async ({ request, redirect }) => {
  const parsed = parseRequest(await request.formData());
  // ponytail: browsers validate the form natively, so this plain 400 is only seen by people bypassing it
  if (!parsed.ok) return new Response(parsed.error, { status: 400 });

  if (!parsed.spam) {
    const { brand, domain, email, plan } = parsed.value;
    await env.DB.prepare('INSERT INTO requests (brand, domain, email, plan) VALUES (?, ?, ?, ?)').bind(brand, domain, email, plan).run();
  }
  return redirect('/thanks', 303);
};
