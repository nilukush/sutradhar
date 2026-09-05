import { SourceSchema, type Source } from "@/lib/schema";
import type { z } from "zod";

/**
 * The source registry — adding a source is a one-entry change here (or a PR).
 * Feed URLs verified live on 2026-08-21 (see docs/ANALYSIS.md §3) and re-audited
 * live (3-agent consensus) on 2026-09-05: every URL reachable; Swiggy corrected
 * to the Swiggy Bytes publication feed; engineering-only category denylists added
 * to mixed feeds (BrowserStack, PhonePe, Jupiter). See docs/SOURCE-AUDIT-2026-09.md.
 * Registry integrity is enforced in CI by tests/sources.test.ts.
 *
 * Entries are written as SourceInput (optional fields may be omitted) and
 * parsed through the schema, so defaults like excerptLimit: 400 materialize
 * exactly once, here.
 */
type SourceInput = z.input<typeof SourceSchema>;

const REGISTRY: SourceInput[] = [
  // ---------- Tier 1: active, engineering-focused ----------
  {
    id: "phonepe",
    name: "PhonePe",
    siteUrl: "https://tech.phonepe.com/",
    feed: {
      type: "rss",
      url: "https://tech.phonepe.com/rss.xml",
      excludeCategories: ["Product", "People Stories"],
    },
    platform: "custom",
    tier: 1,
    topics: ["fintech-payments", "backend", "scale"],
    notes: "Mostly engineering; denylist drops the occasional Product/People Stories posts.",
  },
  {
    id: "razorpay",
    name: "Razorpay",
    siteUrl: "https://engineering.razorpay.com/",
    feed: { type: "rss", url: "https://engineering.razorpay.com/feed/" },
    platform: "medium",
    tier: 1,
    topics: ["fintech-payments", "backend", "data-science"],
    notes: "Medium custom domain; /rss/ is Cloudflare-403 — /feed/ works.",
  },
  {
    id: "flipkart",
    name: "Flipkart",
    siteUrl: "https://blog.flipkart.tech/",
    feed: { type: "rss", url: "https://blog.flipkart.tech/feed/" },
    platform: "medium",
    tier: 1,
    topics: ["backend", "scale", "platform"],
  },
  {
    id: "swiggy",
    name: "Swiggy",
    siteUrl: "https://medium.com/swiggy-bytes",
    feed: { type: "rss", url: "https://medium.com/feed/swiggy-bytes" },
    platform: "medium",
    tier: 1,
    topics: ["backend", "scale", "data-science"],
    notes: "Swiggy Bytes — Tech Blog (official publication). Was the /feed/tag/swiggy-engineering tag feed, which aggregated third-party interview-prep/PM posts; corrected 2026-09-05. Deliberately no category filter: 4/10 recent engineering posts carry no tags, so an allowlist would drop them.",
  },
  {
    id: "meesho",
    name: "Meesho",
    siteUrl: "https://www.meesho.io/blog",
    feed: {
      type: "ghost",
      url: "https://admin-v2.meesho.io/ghost/api/v3/content/posts/",
      ghostKey: "023c10be2282a550a5c7d1d75f",
      urlRewrite: ["https://admin-v2.meesho.io/", "https://www.meesho.io/blog/"],
    },
    platform: "ghost",
    tier: 1,
    topics: ["backend", "mobile", "scale"],
    notes: "No RSS — headless Ghost Content API; public key ships in their client bundle. Rewrite admin URLs to meesho.io/blog.",
  },
  {
    id: "groww",
    name: "Groww",
    siteUrl: "https://tech.groww.in/",
    feed: { type: "rss", url: "https://tech.groww.in/feed/" },
    platform: "medium",
    tier: 1,
    topics: ["fintech-payments", "backend", "data-science"],
  },
  {
    id: "cred",
    name: "CRED",
    siteUrl: "https://engineering.cred.club/",
    feed: { type: "rss", url: "https://engineering.cred.club/feed/" },
    platform: "medium",
    tier: 1,
    topics: ["backend", "mobile", "fintech-payments"],
  },
  {
    id: "jiohotstar",
    name: "JioHotstar",
    siteUrl: "https://blog.hotstar.com/",
    feed: { type: "rss", url: "https://blog.hotstar.com/feed/" },
    platform: "medium",
    tier: 1,
    topics: ["scale", "infrastructure", "mobile"],
  },
  {
    id: "freshworks",
    name: "Freshworks",
    siteUrl: "https://medium.com/freshworks-engineering-blog",
    feed: { type: "rss", url: "https://medium.com/feed/freshworks-engineering-blog" },
    platform: "medium",
    tier: 1,
    topics: ["platform", "frontend", "culture"],
  },
  {
    id: "walmart-global-tech",
    name: "Walmart Global Tech",
    siteUrl: "https://medium.com/walmartglobaltech",
    feed: { type: "rss", url: "https://medium.com/feed/walmartglobaltech" },
    platform: "medium",
    tier: 1,
    region: "india-linked",
    topics: ["data-science", "platform", "scale"],
    notes: "Global org with heavy Chennai/Bengaluru contribution — flagged india-linked.",
  },
  {
    id: "browserstack",
    name: "BrowserStack",
    siteUrl: "https://www.browserstack.com/blog/",
    feed: {
      type: "rss",
      url: "https://www.browserstack.com/blog/feed/",
      excludeCategories: ["Newsletter", "Breakpoint", "Breakpoint Spotlight", "Company", "Community"],
    },
    platform: "wordpress",
    tier: 1,
    topics: ["platform", "devops-sre", "mobile"],
    notes: "Denylist keeps engineering posts; the raw feed window is dominated by newsletter and Breakpoint-conference promo posts.",
  },
  {
    id: "wingify",
    name: "Wingify",
    siteUrl: "https://engineering.wingify.com/",
    feed: { type: "rss", url: "https://engineering.wingify.com/atom.xml" },
    platform: "custom",
    tier: 1,
    topics: ["frontend", "product-engineering", "culture"],
    notes: "Served at /atom.xml but the document is RSS 2.0 (parser sniffs the format; type corrected 2026-09-05).",
  },

  // ---------- Tier 2: verified feeds, stale or mixed content ----------
  {
    id: "jupiter",
    name: "Jupiter Money",
    siteUrl: "https://life.jupiter.money/",
    feed: {
      type: "rss",
      url: "https://life.jupiter.money/feed/",
      excludeCategories: [
        "product-design",
        "ux",
        "ui",
        "principles",
        "redesign",
        "ux-design",
        "ux-design-case-study",
        "personal-finance",
        "investment",
        "mutual-funds",
      ],
    },
    platform: "medium",
    tier: 2,
    dormant: true,
    topics: ["fintech-payments", "data-science"],
    notes: "Mixed tech/data/product/design; effectively no engineering since Sep 2025 — dormant + category denylist (live feed tags, 2026-09-05 audit).",
  },
  {
    id: "dream11",
    name: "Dream11",
    siteUrl: "https://blog.dream11engineering.com/",
    feed: { type: "rss", url: "https://blog.dream11engineering.com/feed/" },
    platform: "medium",
    tier: 2,
    dormant: true,
    topics: ["backend", "data-science", "mobile"],
    notes: "Dormant since Feb 2025; current site (tech.dream11.in) has no feed.",
  },
  {
    id: "urban-company",
    name: "Urban Company",
    siteUrl: "https://medium.com/uc-engineering",
    feed: { type: "rss", url: "https://medium.com/feed/uc-engineering" },
    platform: "medium",
    tier: 2,
    dormant: true,
    topics: ["backend", "mobile", "scale"],
    notes: "Stale since Aug 2024.",
  },
  {
    id: "hasura",
    name: "Hasura",
    siteUrl: "https://hasura.io/blog/",
    feed: { type: "rss", url: "https://hasura.io/blog/rss/" },
    platform: "custom",
    tier: 2,
    region: "india-linked",
    dormant: true,
    topics: ["platform", "backend", "data-science"],
    notes: "Stale since Mar 2025.",
  },
  {
    id: "juspay",
    name: "Juspay",
    siteUrl: "https://juspay.io/blog",
    feed: {
      type: "juspay",
      urls: ["https://juspay.io/blog/engineering", "https://juspay.io/blog/artificial-intelligence"],
    },
    platform: "custom",
    tier: 2,
    topics: ["fintech-payments", "backend", "ai-ml"],
    notes: "No feed — HTML scraper (per-category ItemLists + per-post og tags; dates from sitemap lastmod). Active.",
  },
  {
    id: "zerodha",
    name: "Zerodha",
    siteUrl: "https://zerodha.tech/",
    feed: { type: "rss", url: "https://zerodha.tech/index.xml" },
    platform: "custom",
    tier: 2,
    topics: ["fintech-payments", "backend", "scale"],
    dormant: true,
    notes: "Hugo RSS at /index.xml; no new posts since Mar 2024.",
  },
  {
    id: "sharechat",
    name: "ShareChat",
    siteUrl: "https://sharechat.com/blogs/engineering",
    feed: {
      type: "sanity",
      projectId: "10qgadfo",
      dataset: "production",
      categories: ["Engineering", "Artificial Intelligence"],
      urlBase: "https://sharechat.com/blogs",
    },
    platform: "custom",
    tier: 2,
    topics: ["backend", "data-science", "mobile", "ai-ml"],
    notes: "Blog runs on a public Sanity dataset (project id ships in their cdn.sanity.io image URLs); the site itself is a client-rendered SPA with no feed and no sitemap entries. Engineering + AI categories, 70 posts, active (Aug 2026). The old 'ShareChat TechByte' Medium publication (dormant since 2022) stays in the corpus under this source id.",
  },
];

export const SOURCES: Source[] = REGISTRY.map((entry) => SourceSchema.parse(entry));

export const ACTIVE_SOURCES = SOURCES.filter((s) => !s.dormant);
