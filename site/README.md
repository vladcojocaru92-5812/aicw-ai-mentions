# GEOX site

Astro on Cloudflare Workers. The landing form (`POST /api/request`) stores free-score requests in D1.

```bash
npm install
npx wrangler d1 migrations apply geox --local   # once, creates the local table
npm run dev                                      # http://localhost:4321
npm test                                         # form validation
```

## First deploy

```bash
npx wrangler d1 create geox                      # paste the id into wrangler.jsonc
npx wrangler d1 migrations apply geox --remote
npm run build && npx wrangler deploy
```

## Concierge flow (until scans are automatic)

```bash
# new requests
npx wrangler d1 execute geox --remote --command "SELECT id, brand, domain, email, created_at FROM requests WHERE status = 'new'"
# after you scan / after you email the link
npx wrangler d1 execute geox --remote --command "UPDATE requests SET status = 'scanned' WHERE id = 1"
npx wrangler d1 execute geox --remote --command "UPDATE requests SET status = 'sent' WHERE id = 1"
```
