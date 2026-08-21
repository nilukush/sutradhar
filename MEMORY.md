# MEMORY.md — project memory (update after every significant change)

## Status

- **v0.2 complete & verified** (2026-08-21): in-site reading model. Every article now opens at
  `/read/<slug>-<id16>` on Sutradhar (extended excerpt ≤1,200 chars + attribution + prominent
  "continue reading" link to the original + related stories). All cards, digest links, ItemLists,
  RSS (internal link, original in description) and JSON Feed (`external_url`) point in-site.
  65 tests green, 909 pages built (829 reading pages), 829/829 articles carry extended content.
- v0.1 (2026-08-21): link-out model, 57 tests, verifier-reviewed (docs/VERIFICATION.md).

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

| Excerpt policy research (2026-08-21) | /read/ model legally grey-zone-defensible (§52(1)(a)(iii) + Berne 10(1); RSS ≠ licence); product-wise 1,200 chars is long — recommended ~400 cap + per-source opt-out + 21-day takedown; see docs/RESEARCH-EXCERPT-POLICY.md | pending owner sign-off |

## Open items / next steps

- [ ] Register `sutradhar.dev`, set `SITE_URL`, update `sameAs` with real socials
- [ ] Create beehiiv publication; paste embed into NewsletterBox slot
- [ ] Push to public GitHub repo; connect Cloudflare Pages; **allow AI crawlers on the zone**
- [ ] Replace `TODO-OWNER` in `src/lib/site.ts` with the real GitHub org
- [ ] Later: Meesho archive backfill via Ghost pagination; scraper adapters for Zerodha/ShareChat/Juspay
- [ ] Later: search (pagefind), source logos, editorial blurbs on digests
