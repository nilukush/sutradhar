# CLAUDE.md — project guide for AI coding agents

## What this is

**Sutradhar** (सूत्रधार) — an InfoQ-style aggregator website + newsletter for engineering blogs of
Indian companies/startups. Static Astro site + hourly GitHub Actions aggregation pipeline.
$0 infrastructure. See README.md for the architecture diagram and docs/ for the full decision record.

## Commands

```bash
pnpm install
pnpm test            # vitest — 154 tests (MUST be green before any commit)
pnpm fetch           # CAREFUL: pnpm's builtin shadows the script — use `pnpm run fetch`
pnpm run fetch       # fetch all sources → src/data/articles.json (-- --dry-run to preview)
pnpm dev             # dev server on :4321 (non-standard port per project convention)
pnpm build           # static build → dist/ + pagefind search index (chained)
pnpm og:generate     # regenerate public/og-default.png from The Loom tokens
pnpm verify:routes   # post-build route + SEO inventory gate (CI runs this too)
```

## Architecture in one paragraph

`src/data/sources.ts` (the registry — one entry per blog, Zod-validated in CI; feed
types: rss / atom / ghost / juspay-scraper / sanity) → `scripts/fetch-feeds.ts` (run
by the hourly Action) → `src/lib/pipeline.ts` fetches with a browser UA (Cloudflare-
fronted feeds 403 bare bots); Ghost follows pagination, `src/lib/scrapers.ts` covers
Juspay's ItemList/og-tag HTML and ShareChat's public Sanity dataset →
`src/lib/aggregate.ts` canonicalizes URLs, dedupes by content-hash id, infers topics →
`src/data/articles.json` (committed corpus, atomic write) → `src/lib/hn.ts` enriches
in-window articles with Hacker News engagement (trending boost) → Astro pages in
`src/pages/` read it via `src/lib/view.ts`. Digests are derived at build time by
`src/lib/digest.ts`; `pnpm build` chains the pagefind search index over `<main data-pagefind-body>`.

## Critical conventions

- **Never republish full article text** — `/read/<slug>` pages show an extended excerpt
  (≤1,200 chars stored, `ArticleSchema.content` hard-caps at 1,600) + attribution + link to the
  original (copyright + Google site-reputation-abuse policy).
- **All cards/feeds link to `/read/<slug>` in-site pages**, which carry the outbound link.
- **Never cross-domain-canonical** to source articles; every page is self-canonical.
- **AI crawlers are welcome** (robots.txt, GEO posture) — don't add blocks.
- Adding a source = one entry in `src/data/sources.ts`; CI validates the schema. Ghost sources
  need `ghostKey` + optional `urlRewrite` (see Meesho).
- `src/lib/site.ts` is the single source of identity truth; entity strings must stay
  byte-identical across site/README/socials (GEO entity consistency).
- JSON-LD is emitted via `safeJsonLd()` in Base.astro — always escape `<`/`>` (verifier H3).
- Article routes: `articleSlug()` in `src/lib/read.ts` = slugified title + 16-hex id.
  Every link to an article MUST go through `readHref()`/`absoluteReadHref()` — sources with
  `excerptLimit: 0` have no /read page (link goes to the original; a raw /read link 404s).
- Subscribe flow is provider-switched in `src/lib/subscribe.ts`; GitHub prefill must send
  `template` but NEVER `labels` (outsiders lack permission → GitHub 404s).
- Trending is deterministic (tier × 2^(−age/36h), 120h window, max 2/source) — no
  `new Date()`-dependent assertions in tests; verify-routes mirrors eligibility from corpus age.
- Data commits from the bot must NOT contain `[skip ci]` (hosts honor it and skip deploys).
- Tests are written before implementation (Red→Green→Refactor); regressions found in review
  become regression tests.

## Gotchas learned (from verification)

- `getUTCDay()` returns 0 for Sunday; ISO weekday is 7. Always `(day || 7)` in week math.
- fast-xml-parser runs with `removeNSPrefix: true` — `dc:creator` arrives as `creator`.
- Ghost Content API caps `limit=15`; forward coverage is complete but archive backfill is not
  (accepted tradeoff, see docs/VERIFICATION.md L1).
- Astro pagination for "/articles + /articles/N" requires the rest-param filename
  `articles/[...page].astro`.

## Environments

Local only (this repo). Production = the `sutradhar` Cloudflare Worker (Workers
static assets, wrangler.jsonc) at https://sutradhar.nilukush.workers.dev, built from
`main` by CF Workers Builds. See MEMORY.md "Hard-won facts" for the assets-binding
gotcha before touching wrangler.jsonc.
`SITE_URL` env overrides the canonical origin at build time. No secrets in repo (the Meesho
Ghost content key is public by design — it ships in their client bundle).
