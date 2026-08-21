# AGENTS.md — operating contract for agents working on Sutradhar

## Mission

Every engineering story from India, woven into one thread. Aggregator + newsletter for Indian
engineering blogs. Beautiful, developer-friendly, SEO/GEO-first, $0 infra.

## Workflow (mirrors docs/PLAN.md)

1. **Analyze before code.** Read docs/ANALYSIS.md. New work gets a written approach first.
2. **Plan atomically.** Each step: test-first, acceptance criteria, verification method.
3. **TDD is mandatory.** Red → Green → Refactor. A bug found in review becomes a regression
   test before the fix is merged.
4. **Gates per step:** `pnpm test && pnpm build && pnpm verify:routes` — all must pass.
5. **Multi-agent pattern** (for non-trivial work): Analyzer agents research independently →
   consensus recorded → Verifier agent reviews the result → fixes → re-verify. Disagreements
   are surfaced, not averaged.
6. **Max 3 attempts** on any failing step, then stop and escalate to the human.

## Non-negotiables

- In-site reading model: `/read/<slug>` pages carry extended excerpts (≤1,200 chars stored,
  schema-capped at 1,600) with attribution and a link to the original article — never full text.
- Self-canonical pages; never canonical to external articles.
- AI crawlers allowed (GEO posture).
- No paid services in the critical path. No secrets in the repo.
- Non-standard ports for local servers (4321 is fine).
- Commit messages: conventional style; data commits from the bot never say `[skip ci]`.

## Key files

| Path | Role |
|---|---|
| `src/data/sources.ts` | The source registry — the community contribution surface |
| `src/data/articles.json` | Generated corpus (committed; regenerable via `pnpm fetch`) |
| `src/lib/` | All pure logic: schema, normalize, feeds, aggregate, digest, pipeline, view, site |
| `scripts/fetch-feeds.ts` | Hourly aggregation entrypoint |
| `docs/` | ANALYSIS, DESIGN_SYSTEM, PLAN, VERIFICATION — the decision record |

## Design system

Tokens and component contracts live in `docs/DESIGN_SYSTEM.md` ("The Loom": warm paper, ink,
saffron thread; Fraunces + Inter + IBM Plex Mono + IBM Plex Sans Devanagari). Match the
existing component style; the signature interaction is the saffron `thread-link` underline.
