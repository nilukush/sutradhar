# SEO + GEO Audit — 2026-08-28

Three-agent consensus audit (Analyzer = codebase, Debugger = live production probes,
Verifier = 2026 standards + false-positive control), cross-validated by the coordinator
against the repo and the live origin. Evidence sources: source files (file:line),
live curl probes on https://sutradhar.nilukush.workers.dev, and the project gate
(`pnpm build && pnpm verify:routes` → **PASS**: 913 pages built, "32 required routes +
832 reading pages present, SEO checks passed").

**Headline: the site's SEO/GEO *content* posture is excellent — every project
non-negotiable verified intact. The defects are all in the *serving layer* (wrangler
assets config + worker), which the internal gate cannot see. Two keys in
wrangler.jsonc fix the P0 and the largest P1.**

## Consensus scores

| Category | Score | Consensus basis |
|---|---|---|
| Technical SEO | 6.5/10 | Canonical/sitemap/robots/feeds impeccable in code, docked for live-layer: 500-on-404, trailing-slash 307 mismatch, no HTTP→HTTPS redirect |
| On-page SEO | 7/10 | Unique titles, real descriptions, single h1; docked: no og:image, og:type never `article`, duplicate meta description across /articles/N |
| Structured data | 7/10 | NewsArticle+isBasedOn, BreadcrumbList, ItemList, WebSite, Organization all live-valid; docked: Breadcrumbs escaping bypass, missing NewsArticle image/dateModified |
| Feeds | 9/10 | RSS + JSON Feed valid, absolute URLs, real dates; only atom:link self/lastBuildDate missing |
| GEO posture | 8.5/10 | 13 AI bots explicitly allowed, spec-correct llms.txt, single-source entity identity, outbound citations everywhere, hourly freshness |

## P0 — Critical (fix immediately)

### A1. No 404 handling: every unknown URL returns HTTP 500 (Workers error 1101)
- **Consensus:** Analyzer (predicted from config) + Debugger (proven live) + coordinator (re-verified).
- **Evidence:** `wrangler.jsonc:8-10` — `assets` block has no `not_found_handling` (default `"none"`).
  `worker/index.ts:21` falls through to `env.ASSETS.fetch(request)`, which throws on unmatched
  paths → 1101. Live: `/no-such-page`, `/articles/36` (out-of-range pagination), `/favicon.ico`,
  `/read/<nonexistent>` all → `HTTP 500, error code: 1101`. The crafted `src/pages/404.astro`
  never renders in production.
- **Impact:** Google retries 500s for weeks (crawl waste on an unbounded URL space); no 404
  signal to de-index junk URLs; users get a dead error screen; `/articles/36`-style URLs are
  trivially discoverable by incrementing.
- **Fix:** `wrangler.jsonc` → `"assets": { "directory": "./dist", "not_found_handling": "404-page" }`
  (Astro emits `dist/404.html`). Verify live after deploy: unknown URL must return 404 + the
  custom page; `/articles/<beyond-last>` must 404, not 500.

## P1 — High

### B1. Trailing-slash mismatch: canonicals point at 307-redirecting URLs
- **Consensus:** Debugger found live; Analyzer had marked code "internally consistent"
  (both true — resolution: production behavior wins); coordinator re-verified
  (`GET /articles` → `307, location: /articles/`).
- **Evidence:** Workers assets default `html_handling: "auto-trailing-slash"` serves `/articles/`
  and 307s the slashless form — but every canonical (`src/lib/view.ts:113`), all 912 sitemap URLs,
  RSS/JSON Feed items, and llms.txt links are slashless. Each canonical target costs one redirect
  hop per crawl (912+ per full crawl); 307 is *temporary*, so both forms may stay indexed.
- **Fix:** `wrangler.jsonc` → add `"html_handling": "drop-trailing-slash"` to the assets block.
  Served URLs then match the existing slashless canonicals exactly (redirect becomes 308 onto the
  canonical form). No code changes needed — the codebase is already consistently slashless.

### B2. Plain HTTP serves the full site; no HTTPS redirect, no HSTS
- **Consensus:** Debugger (curl: `http://…/` → 200 full HTML) + coordinator (re-verified).
- **Impact:** http/https duplicate URLs split signals; weak security posture.
- **Fix ($0):** in `worker/index.ts`, before the asset fallthrough:
  `if (request.headers.get("x-forwarded-proto") === "http") return Response.redirect(url.toString().replace("http://", "https://"), 308);`
  Absolute https canonicals already limit the damage in the meantime.

### B3. Breadcrumbs JSON-LD bypasses safeJsonLd escaping (latent injection)
- **Consensus:** Analyzer; coordinator verified the code.
- **Evidence:** `src/components/Breadcrumbs.astro:45` — `set:html={JSON.stringify(jsonLd)}`
  (raw), while `Base.astro:47-49` escapes `<`/`>` precisely so feed-sourced titles can't break
  out of a `<script>` block. The last crumb `name` is the feed-sourced article title.
  Latent today (0 of 832 titles contain `<`), but it violates the project's own invariant and
  any hourly corpus refresh could trip it.
- **Fix:** export `safeJsonLd` from a lib (e.g. `src/lib/jsonld.ts`), use in both Base and
  Breadcrumbs. Add a regression test with a `</script>` in a title (TDD: red first).

## P2 — Medium

| ID | Finding | Evidence | Fix |
|---|---|---|---|
| C1 | No `og:image`/`twitter:image` sitewide; `twitter:card summary`; `og:type=website` even on articles | `Base.astro:64-72`; live-confirmed; Analyzer+Debugger+Verifier (3/3) | One branded 1200×630 og:image; `summary_large_image`; `og:type` prop |
| C2 | NewsArticle missing recommended `image` and `dateModified`; no `article:published_time` | `src/pages/read/[slug].astro:38-54`; 3/3 consensus | Add image + dateModified=publishedAt (aggregator doesn't edit) |
| C3 | Sitemap lastmod = uniform build timestamp on all 912 URLs (incl. immutable pages) | `astro.config.mjs:16-18`; live-confirmed; 3/3 | Per-URL lastmod via `serialize`: read pages → `publishedAt`, hubs → newest article |
| C4 | `/articles` pagination ItemList links to external publisher URLs, unlike every other hub | `src/pages/articles/[...page].astro:32` (`url: a.url`) vs `index.astro:33` (`absoluteReadHref`); coordinator verified | Use `absoluteReadHref(a)` |
| C5 | Duplicate meta description across all `/articles/N` pages (titles ARE unique) | live `/articles`, `/articles/2`, `/articles/35`; 2/3 | Append "— page N" to description for pages ≥ 2 |

## P3 — Low / polish (single-agent, verified or low-risk)

- No `_headers` file: no HSTS/X-Content-Type-Options/Referrer-Policy/X-Frame-Options/CSP; `content-type: text/html` without `charset=utf-8` (meta charset present, so browsers recover).
- RSS missing `atom:link rel="self"` + `lastBuildDate` (W3C validator warning).
- Heading skips h1→h3 in card grids (`ArticleCard.astro:28`).
- Digest `BlogPosting` future-dates the live week (`datePublished: digest.endDate`, `digest/[week].astro:36-37`).
- `publishers.astro:18,45` says "at most 400 characters" but schema allows `excerptLimit` ≤ 1,200 — text/policy drift risk.
- llms.txt: missing `/publishers` section, no generation date (format itself spec-correct).
- Hub pages cap at 48 cards without pagination (topics shows an honest "showing X of Y"; sources doesn't).
- robots.txt explicit roster omits newer agents (Perplexity-User, DuckAssistBot, cohere-ai) — covered by `User-agent: *` Allow; purely optional.

## Verified GOOD (all 3 agents + gate agree — do not touch)

- **Non-negotiable 1 (excerpts):** schema caps enforced (`schema.ts:60,76`: excerptLimit ≤ 1,200, content ≤ 1,600); measured corpus: all 832 articles ≤ 400 chars stored; live /read pages show excerpt + attribution + "Continue reading on <publisher>"; `isBasedOn` → original URL. No full text anywhere.
- **Non-negotiable 2 (self-canonical):** every page type self-canonical on the correct host; never to originals.
- **Non-negotiable 3 (AI crawlers):** robots.txt allows `*` + 13 named AI bots (GPTBot, OAI-SearchBot, ChatGPT-User, ClaudeBot, Claude-Web, Claude-SearchBot, PerplexityBot, Google-Extended, Applebot-Extended, Meta-ExternalAgent, Amazonbot, Bytespider, CCBot); zero Disallows; absolute Sitemap line.
- **Non-negotiable 4 (entity consistency):** `site.ts` single identity source; SITE_URL identical in astro.config and site.ts; sameAs only lists real profiles.
- Zero client-side JS, single 18.5 KB stylesheet, `font-display: swap`, TTFB ~0.6 s at edge, 54.5 KB HTML — excellent crawl/render profile.
- Titles unique per page; single h1; `lang="en-IN"`, `og:locale en_IN`, `inLanguage: en-IN`; both feeds valid with absolute URLs; `verify:routes` CI gate green.

## False positives — do NOT "fix" (Verifier, sourced)

1. **llms.txt is not a standard** (llmstxt.org proposal v2) — presence is upside, absence is not a defect.
2. **Don't block AI crawlers** — citation visibility is the strategy; allowing Google-Extended costs nothing (it doesn't affect Search).
3. **workers.dev is not "penalized"** — free-subdomain hosts carry a spam-associated trust ceiling (Mueller), a slower/lower ceiling, not a penalty; $0 decision stands, clean technical SEO is the mitigation.
4. **Sitemap changefreq/priority tuning is dead weight** — Google ignores both.
5. **NewsArticle publisher/isBasedOn are correct as-is** — no Google-required properties exist for Article; naming the original source as publisher + `isBasedOn` is accurate semantics. Keep.
6. **FAQPage won't get rich results** (restricted to gov/health since Aug 2023) — markup still serves GEO; not a bug.
7. **"Excerpt aggregator = parasite SEO" is wrong** — site-reputation-abuse policy targets riding an *established* host's signals and names syndicated/wire-style sharing as non-violations. The honest risk lens is *scaled content abuse* (832 near-template pages), currently mitigated by per-page curation (topics, related, source hubs, digests) — keep strengthening per-page value as the corpus grows.

## Recommended next steps (consensus order)

1. **wrangler.jsonc assets block** (fixes A1 + B1 in one deploy):
   `"not_found_handling": "404-page"`, `"html_handling": "drop-trailing-slash"`.
   Verify live: unknown URL → 404 custom page; `/articles` served 200 (no 307); `/articles/36` → 404.
2. **worker/index.ts http→https 308 redirect** (B2). TDD: unit test the fetch handler.
3. **safeJsonLd lib + Breadcrumbs migration + `</script>`-in-title regression test** (B3).
4. **Social/rich-result metadata bundle** (C1+C2): og:image asset, og:type prop, article:published_time, NewsArticle image/dateModified.
5. **Per-URL sitemap lastmod via `serialize`** (C3) + `absoluteReadHref` in /articles ItemList (C4) + page-N meta descriptions (C5).
6. P3 polish batch as opportunistic follow-ups; extend `verify-routes.ts` to cover read-page NewsArticle/isBasedOn and BreadcrumbList (gate gaps found by this audit).

## Fix log — 2026-08-28 (same day)

Steps 1–6 executed (commits fbdbf81 onward), TDD-first; full details in
docs/VERIFICATION.md. **STATUS: A1, B1, B2, B3, C1–C5 FIXED**; P3 digest
future-dating also fixed (datePublished = week Monday, dateModified = newest
sourced story). Fixing A1 surfaced the *true* root cause of the live 500s:
wrangler 4.x never injected an ASSETS binding without an explicit
`"binding": "ASSETS"` — the deployed Worker was calling `undefined.fetch`.
Remaining P3 polish (security `_headers`, charset header, RSS atom:link,
heading levels, llms.txt /publishers + date, hub pagination) is still open
but optional.
