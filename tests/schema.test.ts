import { describe, expect, it } from "vitest";
import { ArticleSchema, SourceSchema, CorpusSchema } from "@/lib/schema";

const validSource = {
  id: "phonepe",
  name: "PhonePe",
  siteUrl: "https://tech.phonepe.com/",
  feed: { type: "rss", url: "https://tech.phonepe.com/rss.xml" },
  platform: "custom",
  tier: 1,
  region: "india",
  topics: ["fintech-payments", "backend"],
  excerptLimit: 400,
};

const validArticle = {
  id: "0123456789abcdef",
  title: "Scaling UPI collections",
  url: "https://tech.phonepe.com/scaling-upi-collections",
  sourceId: "phonepe",
  publishedAt: "2026-08-20T10:00:00.000Z",
  excerpt: "How PhonePe handles billions of UPI collection requests.",
  content: "How PhonePe handles billions of UPI collection requests every day across India.",
  topics: ["fintech-payments"],
  authors: ["Anon Engineer"],
};

describe("SourceSchema", () => {
  it("accepts a minimal valid rss source", () => {
    expect(SourceSchema.safeParse(validSource).success).toBe(true);
  });

  it("accepts a ghost source with key and url rewrite", () => {
    const s = {
      ...validSource,
      feed: {
        type: "ghost",
        url: "https://admin.example.io/ghost/api/v3/content/posts/",
        ghostKey: "023c10be2282a550a5c7d1d75f",
        urlRewrite: ["https://admin.example.io/", "https://www.example.io/blog/"],
      },
    };
    expect(SourceSchema.safeParse(s).success).toBe(true);
  });

  it("rejects a ghost source without a key", () => {
    const s = { ...validSource, feed: { type: "ghost", url: "https://x.io/ghost/api/v3/content/posts/" } };
    expect(SourceSchema.safeParse(s).success).toBe(false);
  });

  it("rejects malformed ids and urls", () => {
    expect(SourceSchema.safeParse({ ...validSource, id: "PhonePe!" }).success).toBe(false);
    expect(SourceSchema.safeParse({ ...validSource, siteUrl: "notaurl" }).success).toBe(false);
  });

  it("rejects unknown topics and empty topic lists", () => {
    expect(SourceSchema.safeParse({ ...validSource, topics: ["nonsense-topic"] }).success).toBe(false);
    expect(SourceSchema.safeParse({ ...validSource, topics: [] }).success).toBe(false);
  });

  it("defaults excerptLimit to 400 and bounds it (0 = link-out only, max 1200)", () => {
    const { excerptLimit, ...rest } = validSource;
    const parsed = SourceSchema.safeParse(rest);
    expect(parsed.success).toBe(true);
    if (parsed.success) expect(parsed.data.excerptLimit).toBe(400);
    expect(SourceSchema.safeParse({ ...validSource, excerptLimit: 0 }).success).toBe(true);
    expect(SourceSchema.safeParse({ ...validSource, excerptLimit: 1300 }).success).toBe(false);
  });
});

describe("ArticleSchema", () => {
  it("accepts a valid article", () => {
    expect(ArticleSchema.safeParse(validArticle).success).toBe(true);
  });

  it("defaults authors to an empty array", () => {
    const { authors, ...rest } = validArticle;
    const parsed = ArticleSchema.safeParse(rest);
    expect(parsed.success).toBe(true);
    if (parsed.success) expect(parsed.data.authors).toEqual([]);
  });

  it("defaults content to an empty string (older corpus entries)", () => {
    const { content, ...rest } = validArticle;
    const parsed = ArticleSchema.safeParse(rest);
    expect(parsed.success).toBe(true);
    if (parsed.success) expect(parsed.data.content).toBe("");
  });

  it("rejects content longer than the editorial cap", () => {
    expect(ArticleSchema.safeParse({ ...validArticle, content: "x".repeat(1601) }).success).toBe(false);
  });

  it("rejects non-hex ids, bad urls, non-iso dates and long excerpts", () => {
    expect(ArticleSchema.safeParse({ ...validArticle, id: "ZZZ" }).success).toBe(false);
    expect(ArticleSchema.safeParse({ ...validArticle, url: "nope" }).success).toBe(false);
    expect(ArticleSchema.safeParse({ ...validArticle, publishedAt: "yesterday" }).success).toBe(false);
    expect(
      ArticleSchema.safeParse({ ...validArticle, excerpt: "x".repeat(401) }).success,
    ).toBe(false);
  });
});

describe("CorpusSchema", () => {
  it("wraps articles with a generatedAt timestamp", () => {
    const corpus = { generatedAt: "2026-08-21T12:00:00.000Z", articles: [validArticle] };
    expect(CorpusSchema.safeParse(corpus).success).toBe(true);
  });
});
