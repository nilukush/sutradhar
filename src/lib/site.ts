/**
 * Single source of truth for site identity — used by pages, JSON-LD,
 * feeds and llms.txt so the entity stays consistent everywhere (GEO requirement).
 */
export const SITE = {
  name: "Sutradhar",
  devanagari: "सूत्रधर",
  tagline: "Every engineering story from India, woven into one thread.",
  shortTagline: "India's engineering blogs, woven into one thread.",
  description:
    "Sutradhar aggregates the engineering blogs of Indian companies and startups — PhonePe, Razorpay, Flipkart, Swiggy, Meesho, Groww, CRED, JioHotstar and more — into one live feed, topic hubs and a weekly digest.",
  url: "https://sutradhar.dev",
  locale: "en-IN",
  repoUrl: "https://github.com/TODO-OWNER/sutradhar",
  /** Identity strings must stay byte-identical across site, README, socials (entity consistency). */
  oneLiner: "Sutradhar — the aggregator of Indian engineering blogs.",
  sameAs: [
    "https://www.linkedin.com/company/sutradhar",
    "https://github.com/TODO-OWNER/sutradhar",
  ],
} as const;

export type Site = typeof SITE;
