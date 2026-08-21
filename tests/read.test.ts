import { describe, expect, it } from "vitest";
import { articleSlug } from "@/lib/read";
import type { Article } from "@/lib/schema";

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
