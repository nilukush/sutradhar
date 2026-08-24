import { SourceSchema, type Source } from "@/lib/schema";
import type { z } from "zod";

/**
 * The source registry — adding a source is a one-entry change here (or a PR).
 * Feed URLs verified live on 2026-08-21 (see docs/ANALYSIS.md §3).
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
    feed: { type: "rss", url: "https://tech.phonepe.com/rss.xml" },
    platform: "custom",
    tier: 1,
    topics: ["fintech-payments", "backend", "scale"],
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
    siteUrl: "https://medium.com/tag/swiggy-engineering",
    feed: { type: "rss", url: "https://medium.com/feed/tag/swiggy-engineering" },
    platform: "medium",
    tier: 1,
    topics: ["backend", "scale", "data-science"],
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
    feed: { type: "rss", url: "https://www.browserstack.com/blog/feed/" },
    platform: "wordpress",
    tier: 1,
    topics: ["platform", "devops-sre", "mobile"],
  },
  {
    id: "wingify",
    name: "Wingify",
    siteUrl: "https://engineering.wingify.com/",
    feed: { type: "atom", url: "https://engineering.wingify.com/atom.xml" },
    platform: "custom",
    tier: 1,
    topics: ["frontend", "product-engineering", "culture"],
  },

  // ---------- Tier 2: verified feeds, stale or mixed content ----------
  {
    id: "jupiter",
    name: "Jupiter Money",
    siteUrl: "https://life.jupiter.money/",
    feed: { type: "rss", url: "https://life.jupiter.money/feed/" },
    platform: "medium",
    tier: 2,
    topics: ["fintech-payments", "data-science"],
    notes: "Mixed tech/data/product/design.",
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
];

export const SOURCES: Source[] = REGISTRY.map((entry) => SourceSchema.parse(entry));

export const ACTIVE_SOURCES = SOURCES.filter((s) => !s.dormant);
