# MEMORY.md — project memory (update after every significant change)

## Status — snapshot as of 2026-08-28

**Everything is live and fully autonomous. Nothing awaits owner action.**

- Site: https://sutradhar.nilukush.workers.dev — the PERMANENT origin (owner decision
  2026-08-24: no domain purchase ever; $0 constraint). 16 sources, corpus ~832 articles.
- Hourly loop: GitHub Action aggregates feeds → bot commits on change → CF Workers Builds
  rebuilds + deploys (~15 builds/month; corpus-wide cadence ~0.5 posts/day, hourly polling
  stays — free minutes, builds only fire on change). v0.1 link-out → v0.2 /read pages →
  v0.3 subscribe+trending+excerpts → v0.4 automated Brevo newsletter (full history in
  docs/VERIFICATION.md).
- Subscribe: inline email form → POST /api/subscribe (Worker) → Brevo contact add (list 4
  "Sutradhar") + instant owner-notification email ("New Sutradhar subscriber: …").
  PROVEN live 2026-08-28: `{"ok":true}`, invalid email → friendly 400. beehiiv page
  (sutradhar.beehiiv.com) is a fallback link only.
- Newsletter: weekly Action (Mon 09:07 IST) renders digest → creates + **sends** a Brevo
  classic campaign automatically. PROVEN W34 (campaign 2, status `sent`; idempotent re-run
  skipped). No manual sending, ever.
- wrangler is OAuth-authenticated on the owner's Mac (login 2026-08-28). Secret changes:
  `printf '%s' "$VALUE" | npx wrangler secret put NAME` (pipe, never echo). Runtime secrets
  now: BREVO_API_KEY, OWNER_EMAIL (+ BREVO_LIST_NAME text var from wrangler.jsonc).
- Brevo state: folder 3, list 4 "Sutradhar", sender active, 300 emails/day free tier.

## Decisions (why)

| Decision | Rationale | Where |
|---|---|---|
| Name: **Sutradhar** | Sanskrit "thread-holder/narrator" — exact aggregator metaphor; maximal distance from InfoQ trademark | docs/ANALYSIS.md §6 |
| Astro static + GitHub Actions cron + CF Workers | Only $0 option that is hourly-fresh AND SEO/GEO-perfect; public repo → free Actions minutes | docs/ANALYSIS.md §4 |
| Meesho via Ghost Content API | No RSS exists; public key ships in their client bundle; URL rewrite to meesho.io/blog/ verified | src/data/sources.ts |
| In-site `/read/<slug>` pages; content = min(excerptLimit, max(160, 10% of body)), default 400; excerptLimit 0 = link-out only, honored on ALL surfaces via readHref | Owner wants in-site reading; full text = copyright (India §52(1) fair dealing) + site-reputation-abuse risk; NewsArticle `isBasedOn` the original | src/lib/aggregate.ts, docs/RESEARCH-EXCERPT-POLICY.md |
| Self-canonical, never to originals | Google no longer recommends cross-domain canonicals for syndicated summaries | docs/ANALYSIS.md §5 |
| AI crawlers allowed | Citability is the moat; blocking measurably costs traffic | src/pages/robots.txt.js |
| Subscribe = inline form → own Worker → Brevo | GitHub-issue UX rejected by owner ("poor UX"); beehiiv Launch cannot auto-send; Brevo free 300/day with full API. Provider switch: SUBSCRIBE_PROVIDER env (api-form default | beehiiv-embed | beehiiv-hosted | github-issue) | src/lib/subscribe.ts, src/lib/subscribe-worker.ts |
| Newsletter = automated Brevo campaigns | Owner cannot send manually; weekly Action does create+sendNow; beehiiv RSS-to-Send/Send API are Max-plan-only | src/lib/newsletterCampaign.ts, .github/workflows/newsletter.yml |
| Trending = tierWeight × 2^(−age/36h), 240h window, max 2/source | deterministic, zero analytics; window widened 120→240h after a quiet week emptied the section | src/lib/trending.ts |

## Hard-won facts

- **CF 2026 dashboard hides secret/text bindings.** The Bindings tab shows only external
  resources ("No connected bindings" ≠ no vars). Settings shows a build-only "Variables and
  secrets" subsection — the SAME label as the runtime concept; the name collision caused the
  multi-day 503 saga. Authoritative check: `npx wrangler secret list`. Build vars are
  build-only and display plaintext; runtime Secrets stay masked. `keep_vars: true` in
  wrangler.jsonc (29a1ae2) makes secrets survive config deploys — verified live.
- `sutradhar.pages.dev` belongs to a STRANGER (title "frontend"; pages.dev names are
  globally unique across ALL CF accounts). Owner's account has exactly ONE project: the
  Worker. The earlier "two projects" theory was retracted 2026-08-28.
- Brevo live API facts: campaign send = POST /v3/emailCampaigns/{id}/**sendNow** (NOT
  /send — 404s "Invalid route"); list creation REQUIRES folderId; contacts add 201/204;
  classic campaigns auto-append unsubscribe footer.
- Workers Builds sandbox exposes NO CF API token to custom commands (deploy-step auth is
  internal-only) — build-time self-healing of secrets is impossible; manage via local
  wrangler.
- Feed paths: Medium custom domains serve `/feed/` (NOT `/rss/`); Medium tag feeds at
  `medium.com/feed/tag/<tag>`; fetcher must send a browser UA.
- Zerodha/Myntra/Cleartrip/Ola/Paytm eng blogs dead or never existed; Juspay/ShareChat
  have no feeds (scrapers would be needed).
- `getUTCDay()` Sunday=0 vs ISO weekday=7 — verifier bug class. Astro pagination needs
  `articles/[...page].astro` rest-param. Ghost Content API caps at 15/page.
- Secrets hygiene: docs/brevo-sutradhar.md holds the Brevo key — gitignored, never commit,
  never print. GH Actions read `secrets.X || vars.X`.

## Open items

- [ ] Optional (owner, 2 clicks): delete the two stale plaintext copies in CF Settings →
      Builds → Variables and secrets (BREVO_API_KEY, OWNER_EMAIL — now redundant runtime
      Secrets exist; removing kills the only plaintext display of the key).
- [ ] Later: HN-Algolia trending enrichment; Meesho archive backfill; scraper adapters for
      Zerodha/ShareChat/Juspay; on-site search (pagefind).
