import { describe, expect, it } from "vitest";
import { trendingScore, trendingArticles, TIER_WEIGHTS } from "@/lib/trending";
import type { Article, Source } from "@/lib/schema";

const NOW = new Date("2026-08-24T12:00:00.000Z");

function source(id: string, tier: 1 | 2 = 1): Source {
  return {
    id,
    name: id,
    siteUrl: "https://x.io/",
    feed: { type: "rss", url: "https://x.io/feed" },
    platform: "custom",
    tier,
    topics: ["engineering"],
    excerptLimit: 400,
  } as Source;
}

function article(id: string, sourceId: string, hoursAgo: number): Article {
  return {
    id,
    title: `Story ${id}`,
    url: `https://x.io/${id}`,
    sourceId,
    publishedAt: new Date(NOW.getTime() - hoursAgo * 3600_000).toISOString(),
    excerpt: "excerpt",
    content: "content",
    topics: ["engineering"],
    authors: [],
  };
}

describe("trendingScore", () => {
  it("weights tier-1 sources above tier-2 at the same age", () => {
    const t1 = trendingScore(article("a", "s1", 10), source("s1", 1), NOW);
    const t2 = trendingScore(article("b", "s2", 10), source("s2", 2), NOW);
    expect(t1).toBeGreaterThan(t2);
  });

  it("decays exponentially with age (half-life 36h)", () => {
    const fresh = trendingScore(article("a", "s1", 0), source("s1", 1), NOW);
    const aged = trendingScore(article("b", "s1", 36), source("s1", 1), NOW);
    expect(fresh).toBeCloseTo(aged * 2, 5);
  });

  it("returns 0 outside the eligibility window", () => {
    expect(trendingScore(article("a", "s1", 241), source("s1", 1), NOW)).toBe(0);
    expect(trendingScore(article("b", "s1", 240), source("s1", 1), NOW)).toBeGreaterThan(0);
  });
});

describe("trendingArticles", () => {
  const sources = [source("alpha", 1), source("beta", 2), source("gamma", 2)];

  it("returns newest-first within the window, freshest high-tier first", () => {
    const out = trendingArticles(
      [article("old", "alpha", 300), article("a", "alpha", 2), article("b", "beta", 4)],
      sources,
      { now: NOW },
    );
    expect(out.map((a) => a.id)).toEqual(["a", "b"]);
  });

  it("caps articles per source for diversity", () => {
    const many = Array.from({ length: 6 }, (_, i) => article(`a${i}`, "alpha", i + 1));
    const out = trendingArticles(many, sources, { now: NOW, limit: 5, maxPerSource: 2 });
    expect(out.filter((a) => a.sourceId === "alpha")).toHaveLength(2);
    expect(out).toHaveLength(2); // all six are alpha — nothing else to fill with
  });

  it("fills remaining slots with other sources after the cap", () => {
    const mixed = [
      article("a1", "alpha", 1),
      article("a2", "alpha", 2),
      article("a3", "alpha", 3),
      article("b1", "beta", 4),
    ];
    const out = trendingArticles(mixed, sources, { now: NOW, limit: 3, maxPerSource: 2 });
    expect(out.map((a) => a.id)).toEqual(["a1", "a2", "b1"]);
  });

  it("is deterministic for identical inputs", () => {
    const input = [article("x", "beta", 6), article("y", "alpha", 3)];
    expect(trendingArticles(input, sources, { now: NOW })).toEqual(
      trendingArticles(input, sources, { now: NOW }),
    );
  });

  it("ignores articles from unknown sources gracefully", () => {
    const out = trendingArticles([article("z", "ghost-source", 1)], sources, { now: NOW });
    expect(out).toEqual([]);
  });
});

describe("TIER_WEIGHTS", () => {
  it("maps tiers 1 and 2 to decreasing weights", () => {
    expect(TIER_WEIGHTS[1]).toBeGreaterThan(TIER_WEIGHTS[2]);
  });
});

describe("trending with HN enrichment", () => {
  const NOW = new Date("2026-08-28T12:00:00.000Z");
  const mk = (id: string, hn?: { points: number; comments: number; storyId: string; matchedAt: string }) =>
    ({
      id,
      title: `Story ${id}`,
      url: `https://x.example/${id}`,
      sourceId: "alpha",
      publishedAt: "2026-08-28T06:00:00.000Z",
      excerpt: "x",
      content: "",
      topics: ["engineering"],
      authors: [],
      ...(hn ? { hn } : {}),
    }) as import("@/lib/schema").Article;
  const srcs = [{ id: "alpha", name: "A", siteUrl: "https://x.example", tier: 1, topics: [], feed: { type: "rss", url: "https://x.example/f" }, platform: "custom" }] as import("@/lib/schema").Source[];

  it("an HN-discussed story outranks an identical story without signal", () => {
    const boosted = mk("aaaa000000000001", { points: 100, comments: 10, storyId: "hn1", matchedAt: NOW.toISOString() });
    const plain = mk("bbbb000000000002");
    const out = trendingArticles([plain, boosted], srcs, { now: NOW });
    expect(out[0]?.id).toBe("aaaa000000000001");
  });

  it("HN boost never rescues an article outside the eligibility window", () => {
    const old = { ...mk("cccc000000000003", { points: 900, comments: 1, storyId: "hn2", matchedAt: NOW.toISOString() }), publishedAt: "2026-08-01T00:00:00.000Z" };
    expect(trendingArticles([old], srcs, { now: NOW })).toEqual([]);
  });
});
