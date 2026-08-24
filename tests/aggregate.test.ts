import { describe, expect, it } from "vitest";
import { toArticle, mergeArticles, inferTopics } from "@/lib/aggregate";
import type { RawItem } from "@/lib/feeds";
import type { Source } from "@/lib/schema";

const source: Source = {
  id: "swiggy",
  name: "Swiggy",
  siteUrl: "https://medium.com/tag/swiggy-engineering",
  feed: { type: "rss", url: "https://medium.com/feed/tag/swiggy-engineering" },
  platform: "medium",
  tier: 1,
  region: "india",
  topics: ["backend", "scale"],
};

const raw: RawItem = {
  title: "Scaling Dineout traffic with a queue-based ingestion pipeline",
  url: "https://medium.com/p/abc123?utm_source=rss",
  publishedAt: "2026-08-20T10:00:00.000Z",
  excerpt: "How Swiggy built a Kafka pipeline for dine-out orders at scale.",
  contentHtml: "<p>How Swiggy built a <b>Kafka pipeline</b> for dine-out orders at scale.</p>",
  authors: ["Engineer"],
  categories: ["backend", "kafka"],
  guid: "https://medium.com/p/abc123",
};

describe("toArticle", () => {
  it("canonicalizes the url, derives the id and infers topics", () => {
    const a = toArticle(source, raw);
    expect(a.url).toBe("https://medium.com/p/abc123");
    expect(a.id).toMatch(/^[a-f0-9]{16}$/);
    expect(a.sourceId).toBe("swiggy");
    expect(a.topics).toContain("backend");
    expect(a.topics).toContain("scale");
  });

  it("carries an extended excerpt in `content` (in-site reading page), capped by the policy: min(excerptLimit, max(160, 10% of body))", () => {
    const a = toArticle(source, {
      ...raw,
      contentHtml: `<p>${"long body text ".repeat(300)}</p>`, // ~4,800 chars → 10% = 480 > 400 → cap 400
    });
    expect(a!.content.length).toBeGreaterThan(0);
    expect(a!.content.length).toBeLessThanOrEqual(401); // 400 + ellipsis
    // prefers feed html over the short excerpt when both exist
    expect(a!.content).not.toBe(a!.excerpt);
  });

  it("applies 10% of body for medium-length posts (body 2,000 → cap 200)", () => {
    const a = toArticle(source, { ...raw, contentHtml: `x`.repeat(2000) });
    expect(a!.content.length).toBeLessThanOrEqual(201);
    expect(a!.content.length).toBeGreaterThanOrEqual(160);
  });

  it("stores no excerpt or content when the source opts out (excerptLimit 0)", () => {
    const optedOut = { ...source, excerptLimit: 0 };
    const a = toArticle(optedOut, raw);
    expect(a!.excerpt).toBe("");
    expect(a!.content).toBe("");
  });

  it("applies excerptLimit below 280 to card/digest excerpts too (regression: verifier F5)", () => {
    const limited = { ...source, excerptLimit: 100 };
    const long = { ...raw, description: undefined, excerpt: "word ".repeat(80).trim(), contentHtml: `<p>${"body ".repeat(200)}</p>` };
    const a = toArticle(limited, long);
    expect(a!.excerpt.length).toBeLessThanOrEqual(101);
  });

  it("falls back content to the short excerpt when no html body exists", () => {
    const a = toArticle(source, { ...raw, contentHtml: undefined });
    expect(a!.content).toBe(a!.excerpt);
  });

  it("returns null for items without a parsable date", () => {
    expect(toArticle(source, { ...raw, publishedAt: "" })).toBeNull();
    expect(toArticle(source, { ...raw, publishedAt: "not-a-date" })).toBeNull();
  });

  it("returns null for items without a usable url or title", () => {
    expect(toArticle(source, { ...raw, url: "" })).toBeNull();
    expect(toArticle(source, { ...raw, title: "  " })).toBeNull();
  });
});

describe("inferTopics", () => {
  it("unions source defaults, known categories and title keyword matches", () => {
    const topics = inferTopics(source, {
      ...raw,
      categories: ["data-science"],
      title: "Our ML model for recommendations and fraud detection",
    });
    expect(topics).toContain("data-science");
    expect(topics).toContain("ai-ml");
    expect(topics).toContain("security");
    expect(topics).toContain("backend"); // source default survives
  });

  it("caps the number of topics", () => {
    const topics = inferTopics(source, {
      ...raw,
      title: "ml ai llm kubernetes devops payments security data frontend mobile",
    });
    expect(topics.length).toBeLessThanOrEqual(5);
  });
});

describe("mergeArticles", () => {
  it("dedupes by canonical url id across runs", () => {
    const existing = [toArticle(source, raw)!];
    const again = mergeArticles(existing, [toArticle(source, raw)!]);
    expect(again.articles).toHaveLength(1);
  });

  it("merges new items and sorts by publishedAt desc", () => {
    const older = { ...raw, url: "https://medium.com/p/old", publishedAt: "2026-08-01T10:00:00.000Z" };
    const merged = mergeArticles([], [toArticle(source, older)!, toArticle(source, raw)!]);
    expect(merged.articles).toHaveLength(2);
    expect(merged.articles[0]!.publishedAt > merged.articles[1]!.publishedAt).toBe(true);
  });

  it("reports changed=false when nothing new arrived", () => {
    const existing = [toArticle(source, raw)!];
    const res = mergeArticles(existing, [toArticle(source, raw)!]);
    expect(res.changed).toBe(false);
  });

  it("reports changed=true when a new article arrives", () => {
    const existing: ReturnType<typeof toArticle>[] = [];
    const res = mergeArticles(existing, [toArticle(source, raw)!]);
    expect(res.changed).toBe(true);
  });

  it("reports changed=true when an existing article's content is corrected (regression: verifier M3)", () => {
    const existing = [toArticle(source, raw)!];
    const edited: typeof existing = [{ ...existing[0]!, excerpt: "corrected excerpt" }];
    const res = mergeArticles(existing, edited);
    expect(res.changed).toBe(true);
    expect(res.articles[0]!.excerpt).toBe("corrected excerpt");
  });

  it("caps the corpus at maxArticles, keeping the newest", () => {
    const items = Array.from({ length: 30 }, (_, i) =>
      toArticle(source, {
        ...raw,
        url: `https://medium.com/p/${i}`,
        publishedAt: new Date(Date.UTC(2026, 7, 1 + i)).toISOString(),
      })!,
    );
    const merged = mergeArticles([], items, { maxArticles: 10 });
    expect(merged.articles).toHaveLength(10);
    expect(merged.articles[0]!.url).toBe("https://medium.com/p/29");
  });
});
