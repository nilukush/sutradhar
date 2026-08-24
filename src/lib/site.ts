/**
 * Single source of truth for site identity — used by pages, JSON-LD,
 * feeds and llms.txt so the entity stays consistent everywhere (GEO requirement).
 */
/**
 * Set REPO_URL at build time to override (or edit here) — the subscribe form,
 * footer PR link and sameAs entity links all derive from it.
 */
const repoUrl = process.env.REPO_URL ?? "https://github.com/nilushush/sutradhar";

export const SITE = {
  name: "Sutradhar",
  devanagari: "सूत्रधर",
  tagline: "Every engineering story from India, woven into one thread.",
  shortTagline: "India's engineering blogs, woven into one thread.",
  description:
    "Sutradhar aggregates the engineering blogs of Indian companies and startups — PhonePe, Razorpay, Flipkart, Swiggy, Meesho, Groww, CRED, JioHotstar and more — into one live feed, topic hubs and a weekly digest.",
  url: "https://sutradhar.dev",
  locale: "en-IN",
  repoUrl,
  /** Identity strings must stay byte-identical across site, README, socials (entity consistency). */
  oneLiner: "Sutradhar — the aggregator of Indian engineering blogs.",
  // Only profiles that actually exist (GEO entity consistency).
  sameAs: ["https://github.com/nilushush/sutradhar"],
} as const;

export type Site = typeof SITE;
