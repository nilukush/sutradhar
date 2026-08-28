# MEMORY.md — project memory (update after every significant change)

## Status — v0.5 snapshot, 2026-08-28 (SEO/GEO audit + GSC/Bing verified)

**Everything is live and fully autonomous. No open action items.**

- Site: https://sutradhar.nilukush.workers.dev — the PERMANENT origin (owner decision
  2026-08-24: no domain purchase ever; $0 constraint). **19 sources, corpus ~963
  articles, 1,135 pages.** Version arc: v0.1 link-out → v0.2 /read pages → v0.3
  subscribe+trending+excerpts → v0.4 automated Brevo newsletter → **v0.5 (2026-08-28):
  full SEO/GEO audit+fix, on-site search, HN trending enrichment, hub pagination,
  Meesho backfill, +3 sources (Juspay/Zerodha/ShareChat)**. Details: docs/VERIFICATION.md,
  docs/SEO-GEO-AUDIT.md (all findings resolved).
- Hourly loop: GitHub Action (`pnpm run fetch`) aggregates → bot commits on change → CF
  Workers Builds rebuilds + deploys (~15 builds/month; builds only fire on change).
- Fetch now also enriches: window-scoped HN-Algolia snapshots (articles.hn) that boost
  trending (score × min(5, 1+log10(points+1)); exact-URL matching, ≥10 points); an
  hn-only change counts as "changed" so boosts persist through quiet weeks. Cards and
  read pages show an HN badge/discussion link when a signal exists (data-aware gate check).
- On-site search (pagefind): /search with ?q= deep links; index = /read + info pages
  (grid pages de-indexed); CSP carries 'wasm-unsafe-eval' + font-src data: for it.
- Serving layer (all live-verified): Worker-first routing, https 308, custom 404s,
  slashless canonical serving (top-level `*.html` served verbatim — see gotcha below),
  security headers + charset on every response.
- Search consoles (2026-08-28): GSC URL-prefix property verified via HTML token
  (googled3cc5e1274fa98d4.html in public/), sitemap-index.xml submitted, indexing
  requested for /articles; Bing WMT imported (auto-carried the sitemap). GSC data lags
  days–weeks on a fresh property — normal.
- Subscribe: inline form → POST /api/subscribe (Worker) → Brevo (list 4 "Sutradhar") +
  owner notification. Newsletter: weekly Action (Mon 09:07 IST) auto-creates + sends a
  Brevo campaign (PROVEN W34). No manual sending, ever.
- wrangler OAuth-authenticated on the owner's Mac. Secret changes: `printf '%s' "$VALUE"
  | npx wrangler secret put NAME`. Runtime secrets: BREVO_API_KEY, OWNER_EMAIL (+
  BREVO_LIST_NAME text var). The stale plaintext build-var copies were deleted by the
  owner 2026-08-28 — no plaintext key display remains.
- Brevo state: folder 3, list 4, sender active, 300 emails/day free tier.

## Decisions (why)

| Decision | Rationale | Where |
|---|---|---|
| Name: **Sutradhar** | Sanskrit "thread-holder/narrator" — exact aggregator metaphor; maximal distance from InfoQ trademark. Devanagari is **सूत्रधार** with the long ā matra (corrected 2026-08-28 from सूत्रधर; verify:routes guards against regression) | docs/ANALYSIS.md §6 |
| Astro static + GitHub Actions cron + CF Workers | Only $0 option that is hourly-fresh AND SEO/GEO-perfect; public repo → free Actions minutes | docs/ANALYSIS.md §4 |
| Meesho via Ghost Content API | No RSS; public key ships in their client bundle; URL rewrite to meesho.io/blog/ verified; pagination followed (archive backfilled to 2025-06) | src/lib/pipeline.ts |
| ShareChat via public Sanity dataset; Juspay via HTML scraper; Zerodha via zerodha.tech RSS | No feeds exist. Sanity dataset is public-by-design (project id in their CDN URLs); Juspay needs ItemList+og+sitemap-lastmod scraping; owner supplied the category URLs | src/lib/scrapers.ts, src/data/sources.ts |
| In-site `/read/<slug>` pages; content = min(excerptLimit, max(160, 10% of body)), default 400; excerptLimit 0 = link-out only, honored on ALL surfaces via readHref | Owner wants in-site reading; full text = copyright (India §52(1)) + site-reputation-abuse risk; NewsArticle `isBasedOn` the original | src/lib/aggregate.ts, docs/RESEARCH-EXCERPT-POLICY.md |
| Self-canonical, never to originals | Google no longer recommends cross-domain canonicals for syndicated summaries | docs/ANALYSIS.md §5 |
| AI crawlers allowed | Citability is the moat; blocking measurably costs traffic | src/pages/robots.txt.js |
| Subscribe = inline form → own Worker → Brevo | GitHub-issue UX rejected; beehiiv Launch cannot auto-send; Brevo free 300/day. Switch: SUBSCRIBE_PROVIDER env | src/lib/subscribe.ts |
| Newsletter = automated Brevo campaigns | Owner cannot send manually; beehiiv RSS-to-Send is Max-plan-only | src/lib/newsletterCampaign.ts |
| Trending = tierWeight × 2^(−age/36h) × hnBoost, 240h window, max 2/source | deterministic, zero analytics; HN boost is conservative (log scale, capped ×5) so recency+tier still dominate | src/lib/trending.ts, src/lib/hn.ts |
| Security headers Worker-side, not _headers file | run_worker_first makes the Worker the single response path — testable, deterministic | worker/index.ts |

## Hard-won facts

- **CF assets `html_handling: drop-trailing-slash` ALSO drops `.html` extensions**:
  a top-level `/<file>.html` 307s to the extensionless URL — which Google/Bing
  site-verification checkers reject (they need an exact 200 at the literal path).
  worker/index.ts serves top-level `*.html` verbatim by proxying the extensionless
  asset bytes; tests/worker.test.ts pins the contract.
- **Wrangler 4.x does NOT inject an ASSETS binding unless `assets.binding: "ASSETS"` is
  declared** — otherwise env.ASSETS is undefined and every non-asset request dies as
  500 error 1101 (the true cause of the live 500s, 2026-08-28). `not_found_handling`
  does not rescue a Worker-routed miss — the Worker must catch the ASSETS.fetch throw
  and serve /404.html itself. run_worker_first + drop-trailing-slash + 404-page in
  wrangler.jsonc assets = correct serving layer.
- **CSP gotchas only real-browser testing finds:** (1) @fontsource inlines small subsets
  as data: URIs → `font-src 'self' data:` or fonts silently fall back; (2) pagefind is
  WASM → `script-src` needs `'wasm-unsafe-eval'`; (3) Vite wraps static-specifier
  dynamic imports in a `__VITE_PRELOAD__` helper that throws at runtime — `is:inline`
  scripts for build-artifact imports.
- **Astro gotcha: module consts are NOT visible inside getStaticPaths** in the prerender
  bundle — pageSize etc. must be literals in the paginate() call. Render-body consts fine.
- **`pnpm fetch` runs pnpm's BUILTIN, not the script** — always `pnpm run fetch` (the
  hourly Action already does).
- **Feed/source archaeology:** Medium custom domains serve `/feed/`; tag feeds at
  `medium.com/feed/tag/<t>`; publication feeds at `medium.com/feed/<pub>` (the
  `<pub>/feed` form serves HTML); tech.zerodha.com / engineering.sharechat.com do NOT
  resolve — Zerodha's blog is zerodha.tech (Hugo /index.xml); ShareChat's blog data is
  the public Sanity dataset `10qgadfo` (posts' `categories` is a SINGULAR ref — array
  queries silently return nothing); Juspay post pages expose no dates — sitemap lastmod
  is the date source, and real sitemaps put whitespace between <url> children (parse
  per-<url>-block, strict adjacency matches 0).
- **CF 2026 dashboard hides secret/text bindings** — "No connected bindings" ≠ no vars;
  the build-only "Variables and secrets" subsection collides with the runtime concept.
  Authoritative check: `npx wrangler secret list`. `keep_vars: true` preserves dashboard
  vars across config deploys.
- `sutradhar.pages.dev` belongs to a STRANGER. Owner's account has exactly ONE project:
  the Worker.
- Brevo live API: campaign send = POST /v3/emailCampaigns/{id}/**sendNow**; list
  creation REQUIRES folderId; classic campaigns auto-append unsubscribe footer.
- Workers Builds sandbox exposes NO CF API token to custom commands — manage secrets
  via local wrangler.
- `getUTCDay()` Sunday=0 vs ISO weekday=7. Astro pagination needs rest-param
  `[...page].astro`. Ghost Content API caps 15/page.
- Secrets hygiene: docs/brevo-sutradhar.md holds the Brevo key — gitignored, never
  commit, never print. GH Actions read `secrets.X || vars.X`.

## Open items

- None. 2026-08-28 closed the entire backlog in one session (24 commits, af9d47d→cc05072:
  audit+fixes, P3 polish, search, HN enrichment+badge, Meesho backfill, 3 new sources,
  owner's CF plaintext cleanup, Devanagari wordmark correction (सूत्रधार) + gate guard,
  memory/doc compaction), then a same-day follow-up session (5 commits, f86e84e→e3055bc)
  made the site search-console-official: GSC verified + sitemap submitted + Bing WMT
  imported, with the Worker fixed to serve verification files verbatim.
- Future ideas if ever wanted: IndexNow pings (Bing is a partner), scraper sources
  beyond the registry's reach, topic taxonomy growth, analytics (none today by design).
