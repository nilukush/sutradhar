# Sutradhar — Implementation Plan (Part 2)

Binding contract for implementation. Every step is atomic, test-first (Red→Green→Refactor), and independently verifiable. Regression gate after each step: `pnpm test && pnpm build`. Max 3 attempts per step, then stop for human guidance (per process safeguards; note: session ran autonomously — all steps below completed within limits).

> **Status: completed 2026-08-21** (all steps). Since then three terms of this contract
> changed: hosting is a Cloudflare **Worker** (not Pages); the newsletter is automated
> **Brevo**; and data commits must NEVER say `[skip ci]` (Step 11's rule is inverted —
> hosts honor the tag and skip deploys). Current gates and state: MEMORY.md.

**Stack (decided per docs/ANALYSIS.md §4):** Astro 5 (static) · TypeScript strict · Zod (schema) · fast-xml-parser (feeds) · Vitest (unit) · tsx (script runner) · GitHub Actions (cron aggregation + CI) · Cloudflare Pages (or any static host).

---

### Step 1: Project scaffold + toolchain
- **Objective**: runnable Astro site with Vitest wired.
- **Test first**: smoke test asserting the site's domain constants module resolves (proves aliasing + vitest config).
- **Implementation**: package.json, astro.config.mjs (sitemap, site URL), tsconfig (strict, `@/*` alias), vitest.config.ts, minimal src/pages/index.astro, global.css with design tokens from DESIGN_SYSTEM.md.
- **Acceptance**: `pnpm test` green, `pnpm build` produces dist/.
- **Verification**: build output exists; no TS errors.

### Step 2: Domain schemas (`src/lib/schema.ts`)
- **Test first** (unit): valid Source passes; missing/invalid fields reject; Article validates; topic enum enforced.
- **Implementation**: Zod schemas — `Source` (id, name, siteUrl, feed {type: rss|atom|ghost, url, ghostKey?}, platform, tier, topics[], region, notes), `Article` (id, title, url, sourceId, publishedAt, excerpt≤400, topics[], authors[]), `ArticleFile` envelope with `generatedAt`.
- **Acceptance**: schema tests pass; importable from Astro + scripts.
- **Verification**: `pnpm vitest run`.

### Step 3: Source registry (`src/data/sources.ts`)
- **Test first**: every registered source parses against the Source schema (registry-level guard — adding a bad source fails CI).
- **Implementation**: the 16 launch sources from ANALYSIS.md §3 (12 Tier-1 incl. Meesho ghost adapter + 4 active Tier-2).
- **Acceptance**: registry test green.
- **Verification**: `pnpm vitest run tests/sources.test.ts`.

### Step 4: Normalization utilities (`src/lib/normalize.ts`)
- **Test first**: URL canonicalization strips `utm_*`, hash, trailing-slash + `/amp`, lowercases host, keeps case-sensitive path; slugify handles Devanagari/emoji/nbsp; HTML→text stripping removes tags/entities/scripts and collapses whitespace; excerpt truncation respects word boundary ≤ 400 chars.
- **Implementation**: pure functions, no I/O.
- **Acceptance**: all unit tests green.
- **Verification**: `pnpm vitest run tests/normalize.test.ts`.

### Step 5: Feed parsing (`src/lib/feeds.ts`)
- **Test first**: parse RSS 2.0 fixture (PhonePe-style, CDATA, content:encoded); Atom fixture (Wingify-style); Ghost JSON fixture (Meesho-style) → common `RawItem` shape; malformed XML throws typed error; date parsing RFC822 + ISO.
- **Implementation**: fast-xml-parser based RSS/Atom mapper + Ghost API mapper; per-adapter export.
- **Acceptance**: fixture tests green.
- **Verification**: `pnpm vitest run tests/feeds.test.ts`.

### Step 6: Aggregation core (`src/lib/aggregate.ts`)
- **Test first**: merge new items into existing corpus dedupes by canonical URL; stable ids survive; sort publishedAt desc; topic inference (source defaults + feed categories + title keywords); corrupt/undated items dropped non-fatally; corpus cap 2000; unchanged-corpus detection (for commit-on-change).
- **Implementation**: `mergeArticles(existing, incoming)`, `inferTopics()`, `buildCorpus()`.
- **Acceptance**: aggregation tests green.
- **Verification**: `pnpm vitest run tests/aggregate.test.ts`.

### Step 7: Weekly digest computation (`src/lib/digest.ts`)
- **Test first**: ISO-8601 week computation (incl. year-boundary weeks 52/53 → w01); bucketing articles by publish week; digest id format `2026-W34`; empty weeks skipped.
- **Implementation**: pure date math on UTC.
- **Acceptance**: digest tests green.
- **Verification**: `pnpm vitest run tests/digest.test.ts`.

### Step 8: Fetch pipeline script (`scripts/fetch-feeds.ts`)
- **Test first**: integration-ish test with fixture feeds over injected fetcher (no network in unit tests): full run → merged corpus JSON; one failing source doesn't abort the run; browser UA header present.
- **Implementation**: tsx script — reads registry, fetches (15s timeout, 2 retries, browser UA), parses via adapters, merges, writes `src/data/articles.json` only when changed; `--dry-run` flag; exit code 0 on partial failure, 1 only on total failure.
- **Acceptance**: fixture test green; live run against real feeds produces corpus with ≥ 10 sources' items.
- **Verification**: `pnnpm dlx tsx scripts/fetch-feeds.ts --dry-run` then real run; inspect articles.json.

### Step 9: Live seed + site pages
- **Objective**: the actual website — layouts, components, all routes per DESIGN_SYSTEM.md §6.
- **Test first**: build-level assertions (vitest importing page modules is impractical in Astro SSG; gate = `astro build` success + route inventory check in CI script).
- **Implementation**: Base layout (meta, JSON-LD, theme script), Header/Footer, ArticleCard/TopicPill/SourceBadge/SectionHeading/NewsletterBox/DigestCard; pages: `/`, `/articles` (+pagination), `/topics/[tag]`, `/sources`, `/sources/[company]`, `/digest/[week]`, `/about`, `/newsletter`, `/404`.
- **Acceptance**: `pnpm build` succeeds; all expected routes in dist/; regression: tests still green.
- **Verification**: route listing + local preview.

### Step 10: SEO/GEO layer
- **Implementation**: rss.xml + feed.json (@astrojs/rss), sitemap via plugin with honest lastmod, robots.txt (allow all AI crawlers explicitly), llms.txt (static), canonical + OG/Twitter meta, JSON-LD (WebSite, Organization+sameAs, CollectionPage+ItemList, BreadcrumbList, BlogPosting on digests).
- **Acceptance**: build succeeds; dist contains rss.xml, robots.txt, llms.txt, sitemap-index.xml; JSON-LD present in HTML.
- **Verification**: grep dist output.

### Step 11: Automation (GitHub Actions)
- **Implementation**: `.github/workflows/aggregate.yml` (cron `23 * * * *` + dispatch; commit-on-change with `[skip ci]` data commits) and `ci.yml` (install → test → build). README deploy guide (Cloudflare Pages recommended; Vercel/GH Pages alternatives).
- **Acceptance**: YAML valid (`actionlint`-style eyeball); CI green locally equivalent.
- **Verification**: `pnpm test && pnpm build` clean.

### Step 12: Verification & documentation
- **Implementation**: run full suite + build; deploy independent **verifier agent** (code review) over the codebase; fix findings; write README, CLAUDE.md, AGENTS.md, MEMORY.md; persist project state to memory graph.
- **Acceptance**: verifier findings resolved or documented; all tests green; build green.
- **Verification**: final `pnpm test && pnpm build` + docs present.

---

## Regression Protection

- Unit tests (Steps 2–8) cover all pure logic; site steps gate on build success + route inventory.
- After every step: `pnpm vitest run && pnpm build`.
- Any failure → stop, assess, max 3 attempts, then surface to human (none occurred; see docs/VERIFICATION.md).

## Rollback

Whole project is a fresh git repo; per-step commits allow `git revert`. Data (articles.json) is regenerable at any time via the fetch script — no destructive state exists.
