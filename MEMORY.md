# MEMORY.md — project memory (update after every significant change)

## Status

- **LIVE at https://sutradhar.nilukush.workers.dev — the PERMANENT origin** (owner decision
  2026-08-24: no domain will be purchased; $0 constraint). The full autonomous loop is proven:
  hourly Action → bot data commit (73baf56) → CF rebuild. All URLs (canonicals, feeds, sitemap,
  llms.txt, UA contact string, bot commit email) now reference the workers.dev origin only.
- **Publishing cadence (computed 2026-08-24 from the 829-article corpus)**: corpus-wide ~0.52
  posts/day (92 posts/178 days); active sources median inter-post gaps ~6-28 days (freshworks
  2.6d, meesho 6.9d, browserstack 5.9d, phonepe 12.6d, groww 15.1d, razorpay 18.8d); 6 of 16
  sources dormant in 180d (hasura, wingify, jupiter, dream11, urban-company, +cred 1 post).
  **Verdict: hourly polling stays** — Actions minutes are free on the public repo and builds
  fire only on content change (~15 builds/month at any poll interval), so hourly buys ~30-min
  mean freshness at $0 marginal cost.
- v0.3 (2026-08-24): subscribe flow, trending, excerpt policy, /publishers, mobile nav,
  RSS slash fix. v0.2: in-site /read pages. v0.1: link-out model (docs/VERIFICATION.md).

## Decisions (why)

| Decision | Rationale | Where |
|---|---|---|
| Name: **Sutradhar** | Sanskrit "thread-holder/narrator" — exact aggregator metaphor; maximal distance from InfoQ trademark; permanent home sutradhar.nilukush.workers.dev (sutradhar.dev never purchased — owner decision 2026-08-24) | docs/ANALYSIS.md §6 |
| Astro static + GitHub Actions cron + CF Pages | Only $0 option that is hourly-fresh AND SEO-perfect; public repo → free Actions minutes; Vercel Hobby cron is daily-only | docs/ANALYSIS.md §4 |
| Meesho via Ghost Content API | No RSS exists; public key ships in their client bundle; URL rewrite `admin-v2.meesho.io/ → meesho.io/blog/` verified | src/data/sources.ts |
| In-site reading pages (`/read/<slug>`), extended excerpts not full text | User wants content opened in-site; full republication = copyright + Google site-reputation-abuse risk; NewsArticle JSON-LD with `isBasedOn` the original | src/pages/read/[slug].astro |
| Self-canonical, never to originals | Google no longer recommends cross-domain canonicals for syndicated summaries | docs/ANALYSIS.md §5 |
| AI crawlers allowed | Citability is the moat; blocking measurably costs traffic (Wharton/Rutgers ~7%) | src/pages/robots.txt.js |
| Newsletter = digest artifact + beehiiv free | No free RSS-to-email exists in 2026; pipeline generates the weekly HTML | docs/ANALYSIS.md §4 |

## Hard-won facts

- Feed paths: Medium custom domains serve `/feed/` (NOT `/rss/` — Cloudflare 403); Medium tag
  feeds at `medium.com/feed/tag/<tag>`; fetcher must send a browser UA.
- Zerodha/Myntra/Cleartrip/Ola/Paytm eng blogs are dead or never existed; Juspay/ShareChat
  have no feeds (scrapers would be needed).
- `getUTCDay()` Sunday=0 vs ISO weekday=7 — verifier H2 bug class.
- Astro paginated index needs `articles/[...page].astro` rest-param naming.
- Ghost Content API limit max 15/page — forward coverage complete, archive backfill capped (accepted).

| Excerpt policy (implemented 2026-08-24, owner-approved) | content = min(excerptLimit, max(160, 10% of body)), default 400; 0 = link-out only; /publishers discloses the floor; see docs/RESEARCH-EXCERPT-POLICY.md | src/lib/aggregate.ts |
| Subscribe via GitHub issue (2026-08-24) | No free RSS-to-email + $0/static: no-JS GET form → prefilled issue (subscribe.md; template param, NO labels param — permission 404 risk); beehiiv-hosted upgrade is a config switch; REPO_URL env lights it up | src/lib/subscribe.ts |
| Trending = Planet lineage (2026-08-24) | tierWeight × 2^(−age/36h), 120h window, max 2/source — deterministic, zero analytics; HN-Algolia enrichment designed (free/no-key, verified) but deferred | src/lib/trending.ts |

## Open items / next steps

- [ ] **Root cause found (2026-08-28): TWO CF projects named "sutradhar".** An old static-only
  Pages project (sutradhar.pages.dev — stale Aug-24 build, no form, no API, POST→405) coexists
  with the live Worker (sutradhar.nilukush.workers.dev). Owner's secrets went into the PAGES
  project (no Deploy button there — matches the symptom). FIX (owner, ~2 min):
  (a) Workers & Pages → **sutradhar (Worker)** — Settings shows "Deploy Command" + workers.dev
      URL → Variables and Secrets → Add: BREVO_API_KEY as **Secret** type, OWNER_EMAIL (Text
      ok) → Save/Deploy.
  (b) Recommended: **delete the stale Pages project** (sutradhar.pages.dev) to end the
      duplicate-site confusion and wasted builds.
  (c) Then POST /api/subscribe → expect ok:true + owner notification email (verify).
  keep_vars:true shipped in wrangler.jsonc (29a1ae2) so text vars survive config deploys.
- [x] ~~Automated newsletter~~ → **PROVEN END-TO-END 2026-08-28**: workflow dispatched manually →
  "Campaign 2 sent to the Sutradhar list (week 2026-W34)" → Brevo status `sent` 10:46:50Z →
  owner's gmail received the first Sutradhar email. Idempotency proven (re-run skipped:
  "already sent"). Monday cron takes over from here. Live-discovered Brevo API facts: send
  route is **/emailCampaigns/{id}/sendNow** (NOT /send — 404s); list creation **requires
  folderId** (folder auto-resolved/created); contact add returns 201/204.
- Secrets hygiene: docs/brevo-sutradhar.md (contains the API key) is gitignored, never
  committed; GH variable migrated to masked GH **secret** (workflow reads secrets || vars).

- [x] ~~Subscribe UX~~ → **beehiiv Launch wired & live (24 Aug 2026)**: owner confirmed
  Launch plan is genuinely $0 (the 14-day screen is the Scale-trial upsell — decline it).
  Publication: **https://sutradhar.beehiiv.com**. Subscribe buttons site-wide link there
  (real email form; GitHub-issue flow demoted to BEEHIIV_URL='' fallback). Newsletter page
  copy describes beehiiv. CF Worker path shelved (tests removed).
- [x] ~~Sending workflow~~ → **`pnpm digest:email`**: renders the latest weekly digest as
  send-ready HTML + plain text in `.generated/newsletter-<week>.{html,txt}`. Weekly ~10-min
  routine: run it → open HTML in browser → select-all → paste into a beehiiv broadcast → send.
  (Launch plan: unlimited sends.)

- [x] ~~Push to public GitHub repo~~ → **github.com/nilukush/sutradhar live (2026-08-24)**: CI green,
      aggregate workflow registered + manually validated (16/16 sources, 0 errors, commit-on-change
      works), subscribe form/footer/sameAs all live via the real repoUrl.
- [x] ~~Connect Cloudflare~~ → **live via Workers deploy at sutradhar.nilukush.workers.dev** (build `pnpm build`, deploy `npx wrangler deploy`)
- [x] ~~Register `sutradhar.dev`~~ → **not planned** (owner decision 2026-08-24, $0 constraint);
      workers.dev is the permanent origin. AI-crawler note: no zone config exists on
      `*.workers.dev`; robots.txt welcomes AI bots and the site serves them. Only if a custom
      zone is ever added: allow AI crawlers under Security → Bots.
- [ ] Create beehiiv publication; switch subscribe provider in `src/lib/subscribe.ts`
- [ ] Later: HN-Algolia trending enrichment; Meesho archive backfill; scraper adapters for Zerodha/ShareChat/Juspay; search (pagefind)
