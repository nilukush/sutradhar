# MEMORY.md — project memory (update after every significant change)

## Status — snapshot as of 2026-08-28

**Everything is live and fully autonomous. Nothing awaits owner action.**

- Site: https://sutradhar.nilukush.workers.dev — the PERMANENT origin (owner decision
  2026-08-24: no domain purchase ever; $0 constraint). 16 sources, corpus ~832 articles.
- Hourly loop: GitHub Action aggregates feeds → bot commits on change → CF Workers Builds
  rebuilds + deploys (~15 builds/month; corpus-wide cadence ~0.5 posts/day, hourly polling
  stays — free minutes, builds only fire on change). v0.1 link-out → v0.2 /read pages →
  v0.3 subscribe+trending+excerpts → v0.4 automated Brevo newsletter (full history in
  docs/VERIFICATION.md).
- Subscribe: inline email form → POST /api/subscribe (Worker) → Brevo contact add (list 4
  "Sutradhar") + instant owner-notification email ("New Sutradhar subscriber: …").
  PROVEN live 2026-08-28: `{"ok":true}`, invalid email → friendly 400. beehiiv page
  (sutradhar.beehiiv.com) is a fallback link only.
- Newsletter: weekly Action (Mon 09:07 IST) renders digest → creates + **sends** a Brevo
  classic campaign automatically. PROVEN W34 (campaign 2, status `sent`; idempotent re-run
  skipped). No manual sending, ever.
- SEO/GEO audit 2026-08-28 (docs/SEO-GEO-AUDIT.md, 3-agent consensus) → **ALL findings
  FIXED same day across two deploys** (fbdbf81+, docs/VERIFICATION.md): serving layer
  (404s, slashless canonicals, https 308), JSON-LD escaping lib, og cards + NewsArticle
  image/dateModified, per-URL sitemap lastmod, in-site ItemList, then the full P3 batch
  (worker-side security headers + charset, RSS atom:link/lastBuildDate, llms.txt
  /publishers + corpus date, robots newer agents, h2 card titles on grids, publishers
  copy bounds, topic+source hub pagination 48/page — 913→981 pages). verify:routes now
  carries 19 audit-derived checks.
- On-site search shipped 2026-08-28 (pagefind, the pre-decided $0 tool): /search page
  (client-side, ?q= deep links), 847-page index (832 /read + info/digest pages; grid
  pages de-indexed so stories dominate results), WebSite SearchAction JSON-LD, Search
  in header nav. Functionally verified in a real browser (27 hits for "kubernetes",
  20 for "hasura", 0 console errors). Index = 5.9 MB static assets, lazy-loaded.
- Meesho archive backfill shipped 2026-08-28: Ghost adapter follows meta.pagination.next
  (cap 10 pages); first run 16 → 37 posts back to 2025-06, corpus 832 → 853. VERIFICATION
  L1 tradeoff resolved. NOTE: bare `pnpm fetch` runs pnpm's BUILTIN, not the script —
  use `pnpm run fetch` locally (the hourly Action already does).
- wrangler is OAuth-authenticated on the owner's Mac (login 2026-08-28). Secret changes:
  `printf '%s' "$VALUE" | npx wrangler secret put NAME` (pipe, never echo). Runtime secrets
  now: BREVO_API_KEY, OWNER_EMAIL (+ BREVO_LIST_NAME text var from wrangler.jsonc).
- Brevo state: folder 3, list 4 "Sutradhar", sender active, 300 emails/day free tier.

## Decisions (why)

| Decision | Rationale | Where |
|---|---|---|
| Name: **Sutradhar** | Sanskrit "thread-holder/narrator" — exact aggregator metaphor; maximal distance from InfoQ trademark | docs/ANALYSIS.md §6 |
| Astro static + GitHub Actions cron + CF Workers | Only $0 option that is hourly-fresh AND SEO/GEO-perfect; public repo → free Actions minutes | docs/ANALYSIS.md §4 |
| Meesho via Ghost Content API | No RSS exists; public key ships in their client bundle; URL rewrite to meesho.io/blog/ verified | src/data/sources.ts |
| In-site `/read/<slug>` pages; content = min(excerptLimit, max(160, 10% of body)), default 400; excerptLimit 0 = link-out only, honored on ALL surfaces via readHref | Owner wants in-site reading; full text = copyright (India §52(1) fair dealing) + site-reputation-abuse risk; NewsArticle `isBasedOn` the original | src/lib/aggregate.ts, docs/RESEARCH-EXCERPT-POLICY.md |
| Self-canonical, never to originals | Google no longer recommends cross-domain canonicals for syndicated summaries | docs/ANALYSIS.md §5 |
| AI crawlers allowed | Citability is the moat; blocking measurably costs traffic | src/pages/robots.txt.js |
| Subscribe = inline form → own Worker → Brevo | GitHub-issue UX rejected by owner ("poor UX"); beehiiv Launch cannot auto-send; Brevo free 300/day with full API. Provider switch: SUBSCRIBE_PROVIDER env (api-form default | beehiiv-embed | beehiiv-hosted | github-issue) | src/lib/subscribe.ts, src/lib/subscribe-worker.ts |
| Newsletter = automated Brevo campaigns | Owner cannot send manually; weekly Action does create+sendNow; beehiiv RSS-to-Send/Send API are Max-plan-only | src/lib/newsletterCampaign.ts, .github/workflows/newsletter.yml |
| Trending = tierWeight × 2^(−age/36h), 240h window, max 2/source | deterministic, zero analytics; window widened 120→240h after a quiet week emptied the section | src/lib/trending.ts |

## Hard-won facts

- **Astro gotcha: module-level consts are NOT visible inside getStaticPaths in the
  prerender bundle** ("PAGE_SIZE is not defined" at build) — pageSize and siblings
  must be literals in the paginate() call. Render body consts are fine.
- **CSP gotchas found by real-browser testing (curl-only checks miss all three):**
  (1) @fontsource inlines small font subsets as data: URIs → `font-src 'self' data:`
  required, else fonts silently fall back to system fonts; (2) pagefind's engine is
  WASM → `script-src` needs `'wasm-unsafe-eval'`; (3) Vite wraps static-specifier
  dynamic imports (`import("/pagefind/pagefind.js")`) in a `__VITE_PRELOAD__` helper
  that throws at runtime — use an `is:inline` script for build-artifact imports.
- **Wrangler 4.x (4.127.0 confirmed) does NOT inject an ASSETS binding unless the
  assets block declares `"binding": "ASSETS"` explicitly** — without it the Worker
  sees env.ASSETS undefined and every non-asset request dies as 500 error 1101.
  This was the TRUE root cause of the live 500s (2026-08-28), not just missing
  not_found_handling. Also: `not_found_handling` does not rescue a Worker-routed
  miss — the Worker must catch the ASSETS.fetch throw and serve /404.html itself
  (worker/index.ts serveAsset). run_worker_first routes everything through the
  Worker so its http→https 308 covers asset URLs too.
- **CF 2026 dashboard hides secret/text bindings.** The Bindings tab shows only external
  resources ("No connected bindings" ≠ no vars). Settings shows a build-only "Variables and
  secrets" subsection — the SAME label as the runtime concept; the name collision caused the
  multi-day 503 saga. Authoritative check: `npx wrangler secret list`. Build vars are
  build-only and display plaintext; runtime Secrets stay masked. `keep_vars: true` in
  wrangler.jsonc (29a1ae2) makes secrets survive config deploys — verified live.
- `sutradhar.pages.dev` belongs to a STRANGER (title "frontend"; pages.dev names are
  globally unique across ALL CF accounts). Owner's account has exactly ONE project: the
  Worker. The earlier "two projects" theory was retracted 2026-08-28.
- Brevo live API facts: campaign send = POST /v3/emailCampaigns/{id}/**sendNow** (NOT
  /send — 404s "Invalid route"); list creation REQUIRES folderId; contacts add 201/204;
  classic campaigns auto-append unsubscribe footer.
- Workers Builds sandbox exposes NO CF API token to custom commands (deploy-step auth is
  internal-only) — build-time self-healing of secrets is impossible; manage via local
  wrangler.
- Feed paths: Medium custom domains serve `/feed/` (NOT `/rss/`); Medium tag feeds at
  `medium.com/feed/tag/<tag>`; fetcher must send a browser UA.
- Zerodha/Myntra/Cleartrip/Ola/Paytm eng blogs dead or never existed; Juspay/ShareChat
  have no feeds (scrapers would be needed).
- `getUTCDay()` Sunday=0 vs ISO weekday=7 — verifier bug class. Astro pagination needs
  `articles/[...page].astro` rest-param. Ghost Content API caps at 15/page.
- Secrets hygiene: docs/brevo-sutradhar.md holds the Brevo key — gitignored, never commit,
  never print. GH Actions read `secrets.X || vars.X`.

## Open items

- [ ] Optional (owner, 2 clicks): delete the two stale plaintext copies in CF Settings →
      Builds → Variables and secrets (BREVO_API_KEY, OWNER_EMAIL — now redundant runtime
      Secrets exist; removing kills the only plaintext display of the key).
- [ ] Later: HN-Algolia trending enrichment (needs scoring-design decision); scraper
      adapters for Zerodha/ShareChat/Juspay. (Search + Meesho backfill shipped 2026-08-28.)
