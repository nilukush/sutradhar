import { describe, expect, it, vi } from "vitest";
import { normalizeUrlForHn, hnBoost, MIN_HN_POINTS, enrichWithHn } from "@/lib/hn";
import type { Article } from "@/lib/schema";

const NOW = new Date("2026-08-28T12:00:00.000Z");

function article(overrides: Partial<Article> = {}): Article {
  return {
    id: "aaaa000000000001",
    title: "A story",
    url: "https://blog.example.in/post/",
    sourceId: "alpha",
    publishedAt: "2026-08-28T00:00:00.000Z",
    excerpt: "x",
    content: "",
    topics: ["engineering"],
    authors: [],
    ...overrides,
  };
}

describe("normalizeUrlForHn", () => {
  it("strips protocol, query, hash and trailing slash, lowercases the host", () => {
    expect(normalizeUrlForHn("https://Blog.Example.in/Post/?utm_source=x#top")).toBe(
      "blog.example.in/Post",
    );
    expect(normalizeUrlForHn("http://a.io/x/")).toBe("a.io/x");
  });
});

describe("hnBoost (conservative log-scale HN multiplier)", () => {
  it("is 1 with no signal", () => {
    expect(hnBoost(undefined)).toBe(1);
    expect(hnBoost(0)).toBe(1);
  });

  it("grows logarithmically: ~×2 at 10 points, ~×3 at 100, ~×4 at 1000", () => {
    expect(hnBoost(10)).toBeCloseTo(2, 1);
    expect(hnBoost(100)).toBeCloseTo(3, 1);
    expect(hnBoost(1000)).toBeCloseTo(4, 1);
  });

  it("is capped at ×5", () => {
    expect(hnBoost(50_000)).toBe(5);
  });

  it("is monotonic in points", () => {
    expect(hnBoost(20)).toBeGreaterThan(hnBoost(10));
    expect(hnBoost(300)).toBeGreaterThan(hnBoost(200));
  });
});

describe("enrichWithHn", () => {
  const hit = (url: string, points: number) => ({
    objectID: "hn1",
    url,
    points,
    num_comments: 40,
    created_at: "2026-08-28T10:00:00Z",
  });

  function hnFetchJson(hits: unknown[]) {
    return vi.fn(async (input: RequestInfo | URL) =>
      new Response(JSON.stringify({ hits, nbHits: hits.length }), { status: 200 }),
    ) as unknown as typeof fetch;
  }

  it("attaches hn when a HN story's URL matches the article after normalization", async () => {
    const fetchImpl = hnFetchJson([
      hit("https://blog.example.in/post?utm_source=hn", 120), // same URL modulo tracking params
      hit("https://other.example.com/nope", 400), // never credited
    ]);
    const out = await enrichWithHn([article()], { fetchImpl, now: NOW });
    expect(out[0]?.hn).toMatchObject({ points: 120, comments: 40 });
    expect(fetchImpl).toHaveBeenCalledOnce();
  });

  it(`ignores HN stories below ${MIN_HN_POINTS} points (submission noise)`, async () => {
    const fetchImpl = hnFetchJson([hit("https://blog.example.in/post/", 3)]);
    const out = await enrichWithHn([article()], { fetchImpl, now: NOW });
    expect(out[0]?.hn).toBeUndefined();
  });

  it("queries only articles inside the trending window and strips stale hn outside it", async () => {
    const fetchImpl = hnFetchJson([]);
    const stale = article({ id: "bbbb000000000002", publishedAt: "2026-08-01T00:00:00.000Z", hn: { points: 99, comments: 1, storyId: "x", matchedAt: "2026-08-20T00:00:00.000Z" } });
    const out = await enrichWithHn([article(), stale], { fetchImpl, now: NOW });
    expect(fetchImpl).toHaveBeenCalledOnce(); // only the in-window article
    expect(out[1]?.hn).toBeUndefined(); // stale enrichment dropped
  });

  it("survives HN being unreachable without touching the articles", async () => {
    const fetchImpl = vi.fn(async () => new Response("boom", { status: 500 })) as unknown as typeof fetch;
    const out = await enrichWithHn([article()], { fetchImpl, now: NOW });
    expect(out[0]?.hn).toBeUndefined();
    expect(out[0]?.title).toBe("A story");
  });

  it("picks the highest-points matching story when several match", async () => {
    const fetchImpl = hnFetchJson([hit("https://blog.example.in/post/", 30), hit("https://blog.example.in/post", 90)]);
    const out = await enrichWithHn([article()], { fetchImpl, now: NOW });
    expect(out[0]?.hn?.points).toBe(90);
  });
});
