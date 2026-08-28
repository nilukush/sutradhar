# Sutradhar Design System v1

**Concept — "The Loom."** Sutradhar (सूत्रधार) is the thread-holder of Sanskrit theatre: the one who weaves separate stories into one narrative. The visual language is therefore **editorial handloom**: warm hand-made paper, deep ink, a saffron thread that stitches content together, and typographic hierarchy borrowed from literary journals rather than dashboards. Indian in warmth and typography, **not** in cliché (no flag tricolor, no mandalas, no stock "ethnic" patterns).

## 1. Brand

| Token | Value |
|---|---|
| Name | **Sutradhar** |
| Devanagari | सूत्रधार (used as a subtle accent, never the primary wordmark) |
| Tagline (primary) | *Every engineering story from India, woven into one thread.* |
| Tagline (short) | *India's engineering blogs, woven into one thread.* |
| Voice | Knowledgeable, warm, precise. Celebrates the engineers behind the work. |
| Mark | A saffron thread weaving through three ink dots (articles → narrative). Inline SVG, no raster. |

## 2. Color Tokens (CSS custom properties)

### Light — "Handloom paper" (default)
```css
:root {
  --paper:        #FAF6EE;   /* page background, warm cream      */
  --paper-raised: #FFFFFF;   /* cards                            */
  --paper-sunk:   #F1EADC;   /* wells, code chips                */
  --ink:          #1C1917;   /* primary text                     */
  --ink-soft:     #57534E;   /* secondary text                   */
  --ink-faint:    #A8A29E;   /* meta text, dates                 */
  --line:         #E3DBCB;   /* hairline borders                 */
  --saffron:      #E8590C;   /* primary accent, the thread       */
  --saffron-deep: #C2410C;   /* accent hover                     */
  --saffron-wash: #FDEAD9;   /* accent tint backgrounds          */
  --teal:         #0F766E;   /* secondary accent (links, topics) */
  --teal-wash:    #D7F0EE;   /* topic pill tint                  */
  --indigo:       #3730A3;   /* tertiary accent (rare)           */
}
```

### Dark — "Night loom"
```css
:root[data-theme="dark"] {
  --paper:        #171412;
  --paper-raised: #211D1A;
  --paper-sunk:   #2A2521;
  --ink:          #EDE6DA;
  --ink-soft:     #B8AEA0;
  --ink-faint:    #7D746A;
  --line:         #322C27;
  --saffron:      #FF8A4D;
  --saffron-deep: #FFA169;
  --saffron-wash: #3A241A;
  --teal:         #4CC8BD;
  --teal-wash:    #173B38;
  --indigo:       #A5B4FC;
}
```

Rules: saffron is the **only** saturated brand color used at volume; teal marks *topical* information (tags, category labels); indigo is reserved for special states. Color contrast: all text pairs meet WCAG AA (4.5:1 body, 3:1 large).

## 3. Typography

| Role | Face | Notes |
|---|---|---|
| Display / headlines | **Fraunces** (variable, self-hosted via @fontsource) | Soft-serif literary voice; opsz axis for display sizes |
| Body / UI | **Inter** (variable) | Neutral, excellent at small sizes |
| Meta / code / dates | **IBM Plex Mono** | Engineering texture for timestamps, counts, slugs |
| Devanagari accent | **IBM Plex Sans Devanagari** | सूत्रधार in the wordmark, section eyebrows |

Type scale (1.25 ratio, clamp'd for fluid):
```
--fs-xs:   0.75rem   /* meta, dates          */
--fs-sm:   0.875rem  /* card meta, pills     */
--fs-base: 1rem      /* body                 */
--fs-md:   1.125rem  /* lede                 */
--fs-lg:   1.375rem  /* card titles          */
--fs-xl:   1.75rem   /* section headings     */
--fs-2xl:  2.25rem   /* page titles          */
--fs-3xl:  clamp(2.5rem, 5vw, 3.5rem)  /* hero */
```
Measure: 68ch max for prose. Headings tracking −0.01em; meta uppercase 0.08em letterspaced at fs-xs.

## 4. Space, Radii, Elevation

```
--space-1..8: 4 8 12 16 24 32 48 64 (px)
--radius-sm: 6px   --radius-md: 10px   --radius-lg: 16px   --radius-pill: 999px
--shadow-card: 0 1px 2px rgb(28 25 23 / 6%)
--shadow-pop:  0 8px 24px rgb(28 25 23 / 10%)
```
Cards use hairline `--line` borders + `--shadow-card` (paper-on-paper, not floating glass). Dark mode relies on surface steps, not shadows.

## 5. Components (implementation contract)

1. **SiteHeader** — sticky, paper/85 blur, wordmark left (mark + "Sutradhar"), nav (Latest, Topics, Sources, Digests, About), theme toggle right. Mobile: bottom-sheet nav.
2. **SiteFooter** — 3 columns: brand + tagline + Devanagari accent; nav; "Add a source" CTA linking to the repo. Hairline top border. RSS + newsletter links.
3. **ArticleCard** — the core unit. Top row: SourceBadge (initial-letter avatar in source color + company name) + published date (Plex Mono). Title (Fraunces, fs-lg). Excerpt (2–3 lines, ink-soft, clamped). Bottom row: TopicPills + reading origin ("medium.com" faint). Whole card is the link (`<a>` wrapper, `rel="noopener"`); hover = saffron thread underline grows under title (the "weave" interaction).
4. **TopicPill** — teal-wash bg, teal text, fs-sm, pill radius; links to `/topics/<tag>`.
5. **SourceBadge** — 28px rounded square with source initial, deterministic color from a fixed 8-hue editorial palette.
6. **SectionHeading** — eyebrow (uppercase mono, saffron) + Fraunces heading + optional "view all →".
7. **NewsletterBox** — paper-sunk well, saffron thread top-border, headline + form (email input + button) with embed-slot fallback to RSS link.
8. **DigestCard** — weekly digest: ISO-week label in mono, count of stories, N title highlights.
9. **Breadcrumb** — mono fs-xs, `Home › Topics › Backend`, mirrored by BreadcrumbList JSON-LD.
10. **EmptyState** — "No stories yet — the thread is being spun." with link to sources.

## 6. Page Blueprints

- **Home**: hero (mark, fs-3xl "Every engineering story from India, woven into one thread.", sub, search-less; stats strip: N sources · M stories · updated hourly) → Latest 24 cards → Topics strip → Sources strip → NewsletterBox.
- **/articles**: full firehose, paginated (real URLs, 24/page).
- **/topics/[tag]**: hub header (tag, description, count) + cards; CollectionPage+ItemList JSON-LD.
- **/sources** + **/sources/[company]**: directory table (the GEO page) and per-company hub (every article from that source).
- **/digest/[isoWeek]**: weekly digest page — BlogPosting JSON-LD, grouped by day, answer-shaped lede.
- **/about**, **/newsletter**, **/404**.

## 7. Motion & Interaction

- One signature animation: the **thread** — 2px saffron underline that "weaves" (width 0→100%, 240ms ease-out) under hovered/focused card titles and nav links.
- `prefers-reduced-motion`: all transitions off.
- Theme toggle: `data-theme` on `<html>`, localStorage, no FOUC (inline script in `<head>`).

## 8. Accessibility & Performance Budget

- Semantic landmarks (`header/main/nav/footer`), one `h1` per page, logical heading order.
- Focus-visible rings (2px saffron offset). Cards are single links (no nested interactive elements).
- Budget: 0 JS frameworks; inline theme script ≤ 0.5KB; total page weight (excl. fonts) < 150KB; fonts subset + `font-display: swap`; LCP element = text (no hero image).
