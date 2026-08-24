# Research: Is the in-site excerpt UX good or bad? (2026-08-21)

Two research agents (legal + product) investigated the v0.2 `/read/` model: up to 1,200-char
attributed excerpts displayed in-site with a prominent link to the original. Full findings
below; this is the decision record. **Not legal advice — consult Indian IP counsel before launch.**

## Verdict

**The in-site reading-page concept is sound and proven; the 1,200-character length is the weak
point.** Trim to ~300–500 chars, make the page's value come from the wrapper (related stories,
topics, timeline), and add a per-source opt-out. That single adjustment moves the model from
"defensible grey zone" to "squarely inside snippet norms" on both the legal and product axes.

## Legal (India)

- **Grey-zone but defensible.** §52(1) Copyright Act 1957 is a *closed enumerated list* of fair
  dealing purposes (unlike US fair use — *Academy of General Education v. Mallya*, SC 2009).
  Best fits: §52(1)(a)(iii) *reporting current events and current affairs* (a digest of new
  posts is structurally news reporting) and §52(1)(a)(ii) *criticism or review* (needs
  evaluative commentary on the page).
- Indian courts read §52 **liberally**: *Oxford v. Narendra Publishing* (Del HC 2008) tolerated
  ~14% takings with a qualifying purpose ("short extracts and long comments may be fair");
  *Oxford v. DU Photocopy* (Del HC DB 2016) held §52 has **no quantitative caps** when the
  purpose qualifies; *ANI v. OpenAI* (Del HC, 24 Jul 2026, interim) found even LLM corpus
  training prima facie fair dealing and that commercial motive isn't disqualifying.
- **Berne Art. 10(1) quotation right** (India is a member): attributed, proportionate quotation
  compatible with fair practice is a mandatory minimum exception.
- **§52(1)(c)** provides a linking/access exception with a statutory notice-and-**21-day**
  takedown rhythm — pro-aggregator policy.
- **RSS ≠ republication licence.** Medium ToS grants nothing to third parties; Ghost ships
  full-content RSS as a *platform default*, not publisher consent. "The feed gave me full text"
  is a weak intent signal.
- Risk table: link-only cards **low**; ~280-char excerpts **low**; 1,200-char attributed
  excerpt + link-out **low–medium**; same with zero added commentary **medium**; images **medium–high**;
  full text **high**; continuing after a written objection **high**.

## Product

- The in-site excerpt-page model is **proven**: daily.dev and devblogs.sh run exactly this
  pattern — but both keep excerpts to **~one paragraph** and put the value in the wrapper
  (comments, related posts, topics). Google News = short snippet + link-out; HN/engineeringblogs.xyz
  = headline-only; full-text only survives on explicit consent (Planet Debian, Flipboard partners).
- Aggregators are **complements** to small publishers (Google News Spain shutdown cut long-tail
  publisher traffic 8–14% — Calzada & Gil 2020) — link-out is a service, not a parasite.
- **Too-good summaries suppress clicks** (Pew 2025: AI summaries reduce click-through) — which
  converts Sutradhar from referral engine to substitute: simultaneously the legal weakener
  (market-effect factor), the publisher-relations weakener, and the SEO thin-content risk
  (copied text dominating page body).
- Intermediate pages are hated when they're **tollbooths**; they earn their keep only via
  context the publisher doesn't offer.

## Adopted policy direction (owner approved 2026-08-24; implemented in src/lib/aggregate.ts)

1. Cap in-site excerpt at **min(excerptLimit, max(160, 10% of body))** chars — default
   excerptLimit 400, per-source overridable down to 0 (= headline + link-out only).
   The 160-char floor (a deliberate deviation from pure 10%) exists so summary-only
   feeds/short posts still produce a meaningful snippet; it is disclosed verbatim on
   /publishers.
2. Per-source `excerptLimit` override in `src/data/sources.ts` — `0` = headline + link-out only
   (the Google News Publisher Center degrade pattern; the §52(1)(c) opt-out posture).
3. Public **takedown/opt-out contact**; honor written complaints within **21 days** (statutory
   rhythm of §52(1)(c)).
4. Never reproduce **images/diagrams** — separate copyright, stricter norms.
5. No ads on `/read/` pages.
6. Keep attribution + visible original URL + `isBasedOn` JSON-LD (Berne 10(3) compliance).

## Sources (key)

Statute/cases: [India Code §52](https://www.indiacode.nic.in/show-data?actid=AC_CEN_9_30_00006_195714_1517807321712&orderno=70&sectionId=14572&sectionno=52) ·
[Narendra Publishing](https://indiankanoon.org/doc/138192511/) ·
[DU Photocopy DB](https://indiankanoon.org/doc/114459608/) ·
[Reuters on ANI v. OpenAI](https://www.reuters.com/legal/litigation/indian-court-rules-favor-openai-copyright-lawsuit-brought-by-news-agency-ani-2026-07-24/) ·
[SCO journal](https://www.scobserver.in/journal/public-interest-copyright-and-fair-dealing-ani-v-openai/)
Treaty: [Berne Art. 10 (WIPO)](https://www.wipo.int/wipolex/en/text/283698)
Comparables: [devblogs.sh](https://devblogs.sh/) · [daily.dev about](https://daily.dev/about) ·
[Techmeme about](https://www.techmeme.com/about) ·
[Feedly paywall policy](https://docs.feedly.com/article/124-can-i-access-content-from-paid-subscriptions-in-feedly)
Traffic studies: [Calzada & Gil (Marketing Science)](https://pubsonline.informs.org/doi/10.1287/mksc.2019.1150) ·
[Pew 2025](https://www.pewresearch.org/short-reads/2025/07/22/google-users-are-less-likely-to-click-on-links-when-an-ai-summary-appears-in-the-results/)
Platforms: [Medium ToS](https://policy.medium.com/medium-terms-of-service-9db0094a1e0f) ·
[Ghost full-content RSS default](https://ghost.org/integrations/custom-rss/)
