import { z } from "zod";

/** Fixed editorial taxonomy — the site's topic hubs. */
export const TOPICS = [
  "engineering",
  "backend",
  "frontend",
  "mobile",
  "data-science",
  "ai-ml",
  "infrastructure",
  "devops-sre",
  "security",
  "fintech-payments",
  "scale",
  "platform",
  "culture",
  "product-engineering",
] as const;

export const TopicSchema = z.enum(TOPICS);
export type Topic = z.infer<typeof TopicSchema>;

/**
 * How to read a source. `rss`/`atom` take a feed URL; `ghost` uses a Ghost
 * Content API endpoint (e.g. Meesho, which publishes no RSS) with its public
 * content key and an optional URL rewrite from the admin host to the public blog.
 */
export const FeedSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("rss"),
    url: z.url(),
  }),
  z.object({
    type: z.literal("atom"),
    url: z.url(),
  }),
  z.object({
    type: z.literal("ghost"),
    url: z.url(),
    ghostKey: z.string().min(8),
    urlRewrite: z.tuple([z.string().min(1), z.string().min(1)]).optional(),
  }),
  z.object({
    /** HTML scraper (see src/lib/scrapers.ts) — Juspay has no feed of any kind. */
    type: z.literal("juspay"),
    urls: z.array(z.url()).min(1),
  }),
  z.object({
    /**
     * Sanity Content Lake query (public dataset) — ShareChat's blog CMS.
     * Post URLs are `${urlBase}/${category-slug}/${post-slug}`.
     */
    type: z.literal("sanity"),
    projectId: z.string().min(3),
    dataset: z.string().min(1),
    categories: z.array(z.string().min(1)).min(1),
    urlBase: z.url(),
  }),
]);

export const SourceSchema = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/, "lowercase kebab-case"),
  name: z.string().min(1),
  siteUrl: z.url(),
  feed: FeedSchema,
  platform: z.enum(["medium", "ghost", "wordpress", "custom"]),
  tier: z.union([z.literal(1), z.literal(2)]),
  region: z.enum(["india", "india-linked"]).default("india"),
  topics: z.array(TopicSchema).min(1),
  /**
   * Max chars of article text shown in-site (reading pages + card excerpts).
   * 0 = opt-out: headline + direct link to the original only, no /read page.
   * Policy basis: docs/RESEARCH-EXCERPT-POLICY.md.
   */
  excerptLimit: z.number().int().min(0).max(1200).default(400),
  notes: z.string().optional(),
  /** Stale/mixed-content sources stay listed but flagged. */
  dormant: z.boolean().default(false),
});
export type Source = z.infer<typeof SourceSchema>;

export const ArticleSchema = z.object({
  /** sha256(canonical url), first 16 hex chars — stable across runs. */
  id: z.string().regex(/^[a-f0-9]{16}$/),
  title: z.string().min(3).max(300),
  url: z.url(),
  sourceId: z.string().regex(/^[a-z0-9-]+$/),
  publishedAt: z.iso.datetime(),
  excerpt: z.string().max(400),
  /** Extended excerpt shown on the in-site /read page. Editorial cap enforced here. */
  content: z.string().max(1600).default(""),
  topics: z.array(TopicSchema),
  authors: z.array(z.string()).default([]),
  /**
   * Hacker News engagement snapshot (enriched at fetch time via hn.algolia.com,
   * window-scoped; drives the trending boost). Absent = no HN signal.
   */
  hn: z
    .object({
      points: z.number().int().min(0),
      comments: z.number().int().min(0),
      storyId: z.string().min(1),
      matchedAt: z.iso.datetime(),
    })
    .optional(),
});
export type Article = z.infer<typeof ArticleSchema>;

export const CorpusSchema = z.object({
  generatedAt: z.iso.datetime(),
  articles: z.array(ArticleSchema),
});
export type Corpus = z.infer<typeof CorpusSchema>;
