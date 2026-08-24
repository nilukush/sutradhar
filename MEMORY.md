# MEMORY.md — project memory (update after every significant change)

## Status

- **v0.3 complete & verified** (2026-08-24): working subscribe flow (no-JS GitHub issue form,
  provider-switchable via src/lib/subscribe.ts; activates automatically when REPO_URL is set),
  deterministic Trending (tier × 2^(−age/36h), 5-day window, max 2/source) alongside Latest,
  excerpt policy live (min(400, max(160, 10%)) content, per-source excerptLimit incl. 0 =
  link-out-only honored across every surface), /publishers opt-out & 21-day-takedown page,
  mobile nav disclosure menu, RSS trailing-slash fix, TODO-OWNER link guards.
  87 tests green, 910 pages, verifier-reviewed (2 rounds).
- v0.2 (2026-08-21): in-site /read pages. v0.1: link-out model + verifier review
  (docs/VERIFICATION.md).

## Decisions (why)

| Decision | Rationale | Where |
|---|---|---|
| Name: **Sutradhar** | Sanskrit "thread-holder/narrator" — exact aggregator metaphor; `sutradhar.dev` unregistered (RDAP 2026-08-21); maximal distance from InfoQ trademark | docs/ANALYSIS.md §6 |
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

- [ ] Register `sutradhar.dev`, set `SITE_URL`, update `sameAs` with real socials
- [ ] Create beehiiv publication; paste embed into NewsletterBox slot
- [ ] Push to public GitHub repo; connect Cloudflare Pages; **allow AI crawlers on the zone**
- [ ] Replace `TODO-OWNER` in `src/lib/site.ts` with the real GitHub org
- [ ] Later: Meesho archive backfill via Ghost pagination; scraper adapters for Zerodha/ShareChat/Juspay
- [ ] Later: search (pagefind), source logos, editorial blurbs on digests
