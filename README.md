# Sutradhar — सूत्रधर

> **Every engineering story from India, woven into one thread.**

Sutradhar is an InfoQ-style aggregator and newsletter for the engineering blogs of Indian
companies and startups — PhonePe, Razorpay, Flipkart, Swiggy, Meesho, Groww, CRED, JioHotstar,
Freshworks, Walmart Global Tech, BrowserStack, Wingify and more. In Sanskrit theatre, the
*sutradhar* is the narrator who holds the threads of the story and weaves them into one
narrative — which is exactly what this pipeline does with many blogs.

**~830 stories · 16 sources · refreshed hourly · $0 infrastructure.**

---

## How it works

```
 16 engineering blogs ──► GitHub Action (hourly, :23) ──► fetch · parse · dedupe · tag
                              │  (RSS / Atom / Ghost adapters)
                              ▼
                     src/data/articles.json  (committed corpus — the public dataset)
                              │  push (only when changed)
                              ▼
                     Astro static build ──► Cloudflare Pages (free tier)
                              │
                              ├── /                latest stories + topics + sources
                              ├── /articles        full firehose (paginated)
                              ├── /read/<slug>     in-site reading page per article
                              ├── /topics/<t>      topic hubs
                              ├── /sources/<co>    per-company hubs
                              ├── /digest/<week>   weekly digest pages
                              ├── /rss.xml /feed.json /llms.txt /robots.txt /sitemap-index.xml
                              └── newsletter       weekly email (beehiiv free tier)
```

- **Near-real-time**: a scheduled [GitHub Actions](https://github.com/features/actions) workflow
  fetches every source hourly and commits the corpus only when new articles exist — the push
  triggers a rebuild. Public repos get free Actions minutes.
- **Extensible**: sources live in one registry file — adding one is a one-line PR.
- **In-site reading pages**: every article opens at `/read/<slug>` on Sutradhar with an
  extended excerpt (~1,200 chars), attribution, related stories and a prominent
  "continue reading" link to the original. Full text is never republished (copyright +
  Google site-reputation-abuse policy).
- **SEO + GEO**: static HTML, self-canonical pages, JSON-LD (`WebSite`, `Organization`,
  `CollectionPage`+`ItemList`, `BreadcrumbList`, `BlogPosting`, `FAQPage`), sitemap with honest
  `lastmod`, `llms.txt`, and a robots.txt that explicitly welcomes AI crawlers (GPTBot,
  ClaudeBot, PerplexityBot, Google-Extended, CCBot…) — citability is the moat.

## Quickstart

```bash
pnpm install
pnpm test          # 54 unit/integration tests
pnpm fetch         # fetch all sources → src/data/articles.json (add -- --dry-run to preview)
pnpm dev           # http://localhost:4321
pnpm build         # static build → dist/
pnpm verify:routes # post-build route + SEO inventory check
```

## Adding a source

Add one entry to [`src/data/sources.ts`](src/data/sources.ts):

```ts
{
  id: "zerodha",                       // lowercase kebab-case
  name: "Zerodha",
  siteUrl: "https://zerodha.com/blog",
  feed: { type: "rss", url: "https://zerodha.com/blog/feed/" },
  platform: "custom",
  tier: 1,
  topics: ["fintech-payments", "backend"],
}
```

`feed.type` supports `rss`, `atom`, and `ghost` (for sites with no feed but a public Ghost
Content API — see the Meesho entry). CI validates every entry against the schema. That's it —
the next hourly run picks it up.

## Deploying ($0)

1. Push this repo to a **public** GitHub repo (free Actions minutes).
2. **Cloudflare Pages** (recommended): connect the repo, build command `pnpm build`, output
   `dist/`. Unlimited bandwidth; ~500 git-builds/month is ample because the pipeline only
   pushes when articles change. Alternatives: Vercel Hobby (fine as a host; its cron is
   daily-only, which is why aggregation lives in Actions), GitHub Pages.
3. **AI crawlers**: on the `*.workers.dev` deployment there is no separate zone to configure —
   the site serves all crawlers and `robots.txt` explicitly welcomes AI bots. If a custom
   domain/zone is ever added, remember Cloudflare defaults new zones to *blocking* AI crawlers
   (July 2025 policy) — allow them under Security → Bots to keep the GEO posture.
4. **Canonical origin**: `https://sutradhar.nilukush.workers.dev` is the permanent home
   (owner decision, 2026-08-24 — no domain purchase). `SITE_URL` remains as a build-time
   override for previews or a future domain.

### Ops notes

- If GitHub auto-disables the schedule after 60 days of repo inactivity (only possible when
  feeds are silent), re-run the workflow manually once or push any commit.
- Meesho's Ghost content key is public (ships in their client bundle). If it rotates, update
  `ghostKey` in the registry — the adapter fails non-fatally until then.

## Newsletter

No provider offers RSS-to-email on free tiers in 2026, so the pipeline *is* the digest: each
`/digest/<week>` page is the weekly artifact. Recommended flow (beehiiv Launch — free, 2,500
subscribers, unlimited sends): create the publication, paste the week's digest into a broadcast,
send. RSS subscription is offered side-by-side so there's never a single point of failure.

## Project docs

- [`docs/ANALYSIS.md`](docs/ANALYSIS.md) — business problem, market research, architecture
  decision record, multi-agent consensus
- [`docs/DESIGN_SYSTEM.md`](docs/DESIGN_SYSTEM.md) — "The Loom" design language
- [`docs/PLAN.md`](docs/PLAN.md) — TDD implementation plan
- [`docs/VERIFICATION.md`](docs/VERIFICATION.md) — verification record

## License

MIT
