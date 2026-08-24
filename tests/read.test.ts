import { describe, expect, it } from "vitest";
import { articleSlug, readHref, absoluteReadHref, isExternalRead, isOptedOut } from "@/lib/read";
import { SITE } from "@/lib/site";
import type { Article, Source } from "@/lib/schema";

function makeArticle(overrides: Partial<Article> = {}): Article {
  return {
    id: "0123456789abcdef",
    title: "Scaling UPI to a billion requests",
    url: "https://tech.phonepe.com/scaling-upi",
    sourceId: "phonepe",
    publishedAt: "2026-08-20T10:00:00.000Z",
    excerpt: "How PhonePe handles a billion UPI requests a day.",
    content: "x".repeat(500),
    topics: ["fintech-payments"],
    authors: ["An Engineer"],
    ...overrides,
  };
}

function makeSource(overrides: Partial<Source> = {}): Source {
  return {
    id: "phonepe",
    name: "PhonePe",
    siteUrl: "https://tech.phonepe.com/",
    feed: { type: "rss", url: "https://tech.phonepe.com/rss.xml" },
    platform: "custom",
    tier: 1,
    topics: ["fintech-payments"],
    excerptLimit: 400,
    ...overrides,
  } as Source;
}

describe("articleSlug", () => {
  it("builds a kebab slug suffixed with the article id for uniqueness", () => {
    expect(articleSlug(makeArticle())).toBe("scaling-upi-to-a-billion-requests-0123456789abcdef");
  });

  it("falls back to 'story' when the title yields no latin slug (e.g. Devanagari)", () => {
    expect(articleSlug(makeArticle({ title: "सूत्रधर" }))).toBe("story-0123456789abcdef");
  });

  it("truncates very long titles before the id suffix", () => {
    const slug = articleSlug(makeArticle({ title: "word ".repeat(100) }));
    expect(slug.startsWith("word-word")).toBe(true);
    expect(slug.endsWith("-0123456789abcdef")).toBe(true);
    expect(slug.length).toBeLessThanOrEqual(80 + 1 + 16);
  });

  it("produces unique slugs for distinct articles with identical titles", () => {
    const a = articleSlug(makeArticle());
    const b = articleSlug(makeArticle({ id: "ffffffffffffffff" }));
    expect(a).not.toBe(b);
  });
});

describe("per-source opt-out (excerptLimit 0)", () => {
  const optedOutSource = makeSource({ excerptLimit: 0, id: "opted-out" });
  const optedOutArticle = makeArticle({ sourceId: "opted-out" });

  it("isOptedOut is true only for excerptLimit 0", () => {
    expect(isOptedOut(optedOutSource)).toBe(true);
    expect(isOptedOut(makeSource({ excerptLimit: 400 }))).toBe(false);
  });

  it("readHref returns the original url for opted-out sources (no /read 404s)", () => {
    expect(readHref(optedOutArticle, optedOutSource)).toBe(optedOutArticle.url);
    expect(absoluteReadHref(optedOutArticle, optedOutSource)).toBe(optedOutArticle.url);
  });

  it("readHref returns the in-site path for normal sources (regression: verifier F2)", () => {
    // phonepe is a real registry source with no opt-out
    const article = makeArticle();
    expect(isExternalRead(article)).toBe(false);
    expect(readHref(article)).toBe(`/read/${articleSlug(article)}`);
    expect(absoluteReadHref(article)).toBe(`${SITE.url}/read/${articleSlug(article)}`);
  });
});
