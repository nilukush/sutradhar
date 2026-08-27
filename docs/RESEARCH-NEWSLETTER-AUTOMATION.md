# Research: inline subscribe + automated sending at $0 (2026-08-27)

Analyzer-agent findings (live-verified where noted). Question: can users subscribe *on our site*
(enter email → click → done) and then *automatically* receive the newsletter — all at $0, no domain?

## Q1 — beehiiv inline embed (capture on our site): YES, free-plan supported

- Dashboard path (2026 UI): **Subscribers → Subscribe forms → "Create new form"** — NOT "Forms"
  or "Grow" (older tutorials mislead). Available on Launch; only cross-publication duplication is
  Enterprise-gated. Source: [beehiiv support](https://www.beehiiv.com/support/article/12977090590487-creating-an-embedded-subscribe-form).
- Embed = `<script src="https://subscribe-forms.beehiiv.com/embed.js">` + `<iframe src="https://subscribe-forms.beehiiv.com/<form-uuid>">`
  (verified live: embed.js exists, form URLs 200, slug-only URLs 404 — the UUID is per-form and
  must come from the dashboard).
- Implemented: `BEEHIIV_EMBED_URL` env activates the inline iframe in SubscribeForm (precedence:
  embed > hosted page > GitHub fallback). Double opt-in + bot protection handled by beehiiv.

## Q2 — automatic sending on Launch: NO

| Capability | Launch (free) | Scale | Max |
|---|---|---|---|
| Manual broadcasts | ✅ unlimited sends, ≤2,500 subs | ✅ | ✅ |
| Schedule for later | ✅ | ✅ | ✅ |
| Automations / sequences | ❌ | ✅ | ✅ |
| RSS-to-Send | ❌ | ❌ | ✅ |
| API (add subscribers) | ✅ | ✅ | ✅ |
| Send API (create+send posts) | ❌ | ❌ | ✅ |

So: subscribing is instant (subscriber list auto-managed); the weekly **send** on Launch is a
manual paste — HTML Snippet block → paste `pnpm digest:email` output → "Schedule for later"
(≈2 min/week). Sources: [pricing](https://www.beehiiv.com/pricing), [Send API article](https://www.beehiiv.com/support/article/36759164012439-using-the-send-api-and-create-post-endpoint), [HTML in posts](https://www.beehiiv.com/support/article/4413248700439-using-html-in-beehiiv-posts).

## Q3 — fully-automated $0 without a domain: possible, but a bad trade today

Viable stack: inline form → CF Worker → ESP API; weekly GitHub Action → ESP campaign API.
Best free tiers (permanent, not trials): **Sender.net** (2,500 subs / 15,000 mo, no daily cap),
**Brevo** (300/day, 100k contacts), SendPulse (500 subs), Elastic Email (3k/mo). Excluded as
trials/fakes: SendGrid (free retired Jul 2025), Moosend (30-day trial), Resend (needs owned domain).

Honest caveats (why we're NOT doing this now):
1. No owned domain → no SPF/DKIM alignment → shared-pool sender (Brevo rewrites From to
   @brevosend.com) → measurably worse inbox placement than beehiiv's authenticated sending.
2. Unsubscribe + DPDP Act 2023 consent-withdrawal machinery becomes our code (§6 duty).
3. ESP free tiers shrink (MailerLite 1,000→500→250 subs in 2025); architecture must stay portable.

## Decision (REVISED 2026-08-27 — same day, owner directive)

Owner cannot send manually ("I am sorry I cannot send newsletter manually"). beehiiv cannot
auto-send below Max, so the manual-paste option is dead. **Adopted: the automated Brevo path**
(previously listed as fallback):

- **Capture**: inline form on our site → CF Worker `/api/subscribe` → Brevo contacts
  ("Sutradhar" list auto-created) + instant owner notification email per signup.
- **Sending**: weekly GitHub Action (Mon 03:37 UTC) → Brevo classic campaign of the last
  completed ISO week (unsubscribe footer + List-Unsubscribe automatic; idempotent).
- **Visibility**: Brevo dashboard (Contacts), owner notification emails, Actions run logs.
- Accepted caveats: shared-DKIM deliverability (no domain), 300 emails/day cap (campaigns to
  larger lists roll over days), Brevo sender must remain confirmed, free-tier portability risk
  (list stays exportable; `send:newsletter` is ESP-swappable by design).
- beehiiv publication retained as fallback capture (SUBSCRIBE_PROVIDER=beehiiv-embed/hosted).

The original 2026-08-27 morning decision (manual paste) is superseded; see git history.
