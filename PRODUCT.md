# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

Marketing site in `site/`: Astro on Cloudflare Workers, form requests stored in D1. The scan and report engine is the Node CLI in this repo (`src/`).

## Users

Small business owners who run their own website and marketing. They have heard that buyers now ask ChatGPT, Gemini and similar assistants for recommendations, and want to know whether their business shows up in those answers and what to change if it doesn't.

## Product Purpose

GEOX asks AI models the questions a buyer would ask in the owner's category, records which brands get named, in what order, and which pages get cited, and turns that into:

- a free visibility score (0-100, per model, with its components and weights);
- a $9 repair report: the questions, answers and cited pages behind the score, findings in order, one brief to paste into an AI editor or hand to a developer, and paste-ready files matched to the findings (llms.txt, robots.txt rules for AI crawlers, FAQ markup, meta titles and descriptions);
- a $19 Beat Them report: everything in the repair report plus a side-by-side with up to three competitors the models named, their cited pages and domains, the third-party sites that send buyers to them, and a plan to close the gap.

Success: the visitor leaves their website and email for the free score, then buys the repair report.

## Positioning

Every number and finding traces back to a real AI answer the owner can read. The score is deterministic (no AI grades the AI). One-time price per report, no subscription.

## Operating Context

- Free score is delivered by email as a link "within a few hours"; scans are run by hand at first (concierge), automated later.
- The scan uses model APIs (currently 2 engines: GPT-5.4 Nano and Gemini 3 Flash with web search), so a buyer's own chat can show a different answer.
- The owner applies the edits themselves, with an AI editor, or through a developer.

## Capabilities and Constraints

- Payments are not live yet; the $9 and $19 calls to action collect the same request as the free check for now.
- No sentiment measurement.
- Copy for the landing lives in `landing/landing-copy.txt` (English).

## Brand Commitments

- Name: GEOX (working name; a rename and trademark check are pending).
- Copy voice: plain, specific, honest about limits ("a buyer's chat may show a different answer").

## Evidence on Hand

- A real scan of Praxio (mypraxio.ro), 17 Nov 2026: score 58/100 ("Present"); GPT-5.4 Nano 53, Gemini 3 Flash 67. For "What are the best practice management software options for psychologists…?" Gemini named SimplePractice, TherapyNotes, Sessions Health and Jane App, and not Praxio; for the same need asked in Romanian it listed Praxio first and linked mypraxio.ro. Data: `.test-data-geox-probe/`.
- The owner does not want Praxio (or any real client) shown on the landing. The landing uses an illustrative example instead: "Maple & Main Bakery", made-up competitor bakeries on reserved `.example` domains, labeled as an example wherever it appears.
- No customers, testimonials, logos, press or usage numbers yet. Do not invent any.

## Product Principles

1. Show the problem with a concrete answer (real data, or a clearly labeled example), not a claim about AI.
2. Every promise on the page must exist in the report today.
3. Free first, then one small one-time payment; never a subscription.
4. Concrete edits over advice.
