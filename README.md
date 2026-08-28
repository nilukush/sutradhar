# Sutradhar — सूत्रधार

> **Every engineering story from India, woven into one thread.**

Sutradhar is an InfoQ-style aggregator and newsletter for the engineering blogs of Indian
companies and startups — PhonePe, Razorpay, Flipkart, Swiggy, Meesho, Groww, CRED, JioHotstar,
Freshworks, Walmart Global Tech, BrowserStack, Wingify and more. In Sanskrit theatre, the
*sutradhar* is the narrator who holds the threads of the story and weaves them into one
narrative — which is exactly what this pipeline does with many blogs.

**963 stories · 19 sources · refreshed hourly · $0 infrastructure.**

---

## How it works

```
 19 engineering blogs ──► GitHub Action (hourly, :23) ──► fetch · parse · dedupe · tag
                              │  (RSS / Atom / Ghost / HTML-scraper / Sanity adapters)
                              ▼
                     src/data/articles.json  (committed corpus — the public dataset)
                              │  push (only when changed)
                              ▼
                     Astro static build ──► Cloudflare Worker (free tier)
                              │
                              ├── /                latest + trending + topics + sources
                              ├── /articles        full firehose (paginated)
                              ├── /read/<slug>     in-site reading page per article
                              ├── /search          on-site full-text search (pagefind)
                              ├── /topics/<t>      topic hubs (paginated)
                              ├── /sources/<co>    per-company hubs (paginated)
                              ├── /digest/<week>   weekly digest pages
                              ├── /publishers /about /newsletter
                              ├── /rss.xml /feed.json /llms.txt /robots.txt /sitemap-index.xml
                              └── /api/subscribe   Worker endpoint → Brevo list;
                                  newsletter       weekly email, auto-sent via Brevo
```

- **Near-real-time**: a scheduled [GitHub Actions](https://github.com/features/actions) workflow
  fetches every source hourly and commits the corpus only when new articles exist — the push
  triggers a rebuild. Public repos get free Actions minutes.
- **Extensible**: sources live in one registry file — adding one is a one-line PR
  (see [CONTRIBUTING.md](CONTRIBUTING.md)).
- **In-site reading pages**: every article opens at `/read/<slug>` on Sutradhar with an
  extended excerpt (~1,200 chars), attribution, related stories and a prominent
  "continue reading" link to the original. Full text is never republished (copyright +
  Google site-reputation-abuse policy).
- **HN-aware trending**: each fetch enriches the corpus with Hacker News engagement
  (Algolia API); stories with real discussion get a `▲ N` badge on cards and read pages,
  and a conservative log-scale boost in the trending ranking.
- **On-site search**: a pagefind WASM index built over the reading pages — `/search`
  with `?q=` deep links, zero server cost.
- **Worker serving layer**: the Cloudflare Worker adds https redirects, security headers
  (CSP, HSTS…), custom 404s and the `/api/subscribe` endpoint on top of the static assets.
- **SEO + GEO**: static HTML, self-canonical pages, JSON-LD (`WebSite`, `Organization`,
  `CollectionPage`+`ItemList`, `BreadcrumbList`, `BlogPosting`, `FAQPage`), sitemap with honest
  `lastmod`, `llms.txt`, and a robots.txt that explicitly welcomes AI crawlers (GPTBot,
  ClaudeBot, PerplexityBot, Google-Extended, CCBot…) — citability is the moat.

## Quickstart

```bash
pnpm install
pnpm test          # 158 unit/integration tests
pnpm run fetch     # fetch all sources → src/data/articles.json (`pnpm fetch` runs pnpm's builtin — use `run`; add -- --dry-run to preview)
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
  siteUrl: "https://zerodha.tech/",
  feed: { type: "rss", url: "https://zerodha.tech/index.xml" },
  platform: "custom",
  tier: 2,
  dormant: true,                       // no posts since Mar 2024 — stays listed, flagged
  topics: ["fintech-payments", "backend", "scale"],
}
```

`feed.type` supports `rss`, `atom`, `ghost` (public Ghost Content API — see Meesho), `juspay`
(HTML scraper for sites with no feed of any kind) and `sanity` (public Sanity dataset — see
ShareChat). CI validates every entry against the schema — the full field reference, tier
semantics and the closed topic taxonomy live in [CONTRIBUTING.md](CONTRIBUTING.md). That's
it — the next hourly run picks it up.

## Deploying ($0)

1. Push this repo to a **public** GitHub repo (free Actions minutes).
2. **Cloudflare Workers** (what this repo does): create a Worker in the Cloudflare dashboard
   and connect the repo via **Workers Builds** — build command `pnpm build`, deploy with
   `npx wrangler deploy`. `wrangler.jsonc` serves `dist/` as static assets with the Worker in
   front (`run_worker_first`) for security headers, the http→https redirect, custom 404s and
   the `/api/subscribe` endpoint. Builds only fire when the pipeline pushes new articles
   (~15/month in practice), far inside the free allowance. Plain static hosts (Pages, GitHub
   Pages) also work but lose the Worker layer.
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

Fully automated — no human in the loop. A weekly GitHub Action (Mondays 09:07 IST) creates
and sends a **Brevo** email campaign from the week's digest (`scripts/send-newsletter.ts`,
idempotent against double-sends; proven in production since W34 2026). Subscribers sign up
via the inline form at `/newsletter`, which posts to the Worker's `/api/subscribe` and lands
in a Brevo list (free tier, 300 emails/day). RSS subscription is offered side-by-side so
there's never a single point of failure.

## Contributing

Adding a source is a one-entry PR — [`CONTRIBUTING.md`](CONTRIBUTING.md) has the full field
reference, feed types and the checks your PR will run.

## License

MIT for this project's own code and documentation. Article titles and excerpts in
[`src/data/articles.json`](src/data/articles.json) remain the property of their original
publishers, carried with attribution and a link to the original — excerpt lengths are
schema-capped (`excerptLimit`, max 1,200 chars).
