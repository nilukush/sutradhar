# Contributing to Sutradhar

Thanks for helping weave the thread. The main contribution surface is the **source
registry** — adding an Indian engineering blog is a one-entry PR. Code fixes and design
polish are welcome too; this repo runs TDD (Red → Green → Refactor), so bug fixes arrive
with a regression test.

## Adding a source

Add one entry to [`src/data/sources.ts`](src/data/sources.ts). Entries are Zod-validated
([`src/lib/schema.ts`](src/lib/schema.ts)) — CI rejects anything malformed.

```ts
{
  id: "zerodha",                       // lowercase kebab-case, unique
  name: "Zerodha",
  siteUrl: "https://zerodha.tech/",
  feed: { type: "rss", url: "https://zerodha.tech/index.xml" },
  platform: "custom",                  // medium | ghost | wordpress | custom
  tier: 2,
  dormant: true,                       // no posts since Mar 2024 — stays listed, flagged
  topics: ["fintech-payments", "backend", "scale"],
}
```

### Fields

| Field | Required | Notes |
|---|---|---|
| `id` | ✓ | lowercase kebab-case; becomes `/sources/<id>` and the corpus `sourceId` |
| `name` | ✓ | display name |
| `siteUrl` | ✓ | the public blog home |
| `feed` | ✓ | one of the five types below |
| `platform` | ✓ | `medium` \| `ghost` \| `wordpress` \| `custom` |
| `tier` | ✓ | 1 = active, engineering-focused · 2 = verified but stale or mixed content |
| `region` |  | `india` (default) or `india-linked` (global org with heavy India contribution) |
| `topics` | ✓ | 1+ values from the closed taxonomy below |
| `dormant` |  | boolean, default false — stale sources stay listed but flagged |
| `excerptLimit` |  | 0–1200 chars, default 400; `0` = opt-out of in-site reading (headline + direct link only, no `/read` page) |
| `notes` |  | free text — gotchas future maintainers will thank you for |

### Feed types

| `type` | Config | For |
|---|---|---|
| `rss` | `url` | RSS feeds (the common case) |
| `atom` | `url` | Atom feeds (e.g. Wingify) |
| `ghost` | `url`, `ghostKey`, optional `urlRewrite: [from, to]` | sites with no feed but a public Ghost Content API (see Meesho — the content key ships in their client bundle) |
| `juspay` | `urls: string[]` | HTML scraping of feedless sites — per-category ItemLists, per-post og tags, dates from sitemap `lastmod` (see Juspay) |
| `sanity` | `projectId`, `dataset`, `categories[]`, `urlBase` | blogs whose CMS data is a public Sanity dataset (see ShareChat) |

New adapter types need an implementation in [`src/lib/feeds.ts`](src/lib/feeds.ts) or
[`src/lib/scrapers.ts`](src/lib/scrapers.ts) plus tests — open an issue first so we can
agree on the schema shape.

### Topic taxonomy (closed)

`engineering` · `backend` · `frontend` · `mobile` · `data-science` · `ai-ml` ·
`infrastructure` · `devops-sre` · `security` · `fintech-payments` · `scale` · `platform` ·
`culture` · `product-engineering`

These are the site's topic hubs; a new value is a product decision, not a PR edit.

### Guardrails your source inherits (non-negotiable)

- **Never full text**: `/read/<slug>` pages show a capped excerpt with attribution and a
  prominent link to the original — policy basis:
  [`docs/RESEARCH-EXCERPT-POLICY.md`](docs/RESEARCH-EXCERPT-POLICY.md).
- **Self-canonical pages**; never canonical to the original article.
- **AI crawlers are welcome** — don't add blocks.

## Checks your PR runs

CI ([`.github/workflows/ci.yml`](.github/workflows/ci.yml)) runs the same gates as local
development — run them before pushing:

```bash
pnpm install
pnpm test            # 158 unit/integration tests
pnpm run fetch       # note: `pnpm fetch` runs pnpm's builtin — use `run` (-- --dry-run to preview)
pnpm build           # static build → dist/ + pagefind search index
pnpm verify:routes   # post-build route + SEO inventory gate
```

For a source addition, `pnpm run fetch -- --dry-run` proving your feed yields articles is
the strongest evidence you can attach to the PR.

## Commit style

Conventional commits (`feat:`, `fix:`, `docs:`, `chore:`, `data:`). One hard rule from
operations: commit messages must never say `[skip ci]` — hosts honor it and skip deploys.

## License

By contributing you agree your code is MIT-licensed (see [LICENSE](LICENSE)). Article
metadata/excerpts in the corpus remain their publishers' property.
