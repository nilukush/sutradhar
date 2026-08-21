import { describe, expect, it } from "vitest";
import {
  canonicalUrl,
  slugify,
  htmlToText,
  excerptFrom,
  articleId,
} from "@/lib/normalize";

describe("canonicalUrl", () => {
  it("strips tracking params and hashes, lowercases host, drops trailing slash", () => {
    expect(
      canonicalUrl("https://Blog.Swiggy.io/Some-Post/?utm_source=feed&utm_medium=rss#notes"),
    ).toBe("https://blog.swiggy.io/Some-Post");
  });

  it("strips medium rss source params", () => {
    expect(
      canonicalUrl("https://blog.flipkart.tech/post?source=rss-ab12cd34-1234"),
    ).toBe("https://blog.flipkart.tech/post");
  });

  it("keeps meaningful query params", () => {
    expect(canonicalUrl("https://x.io/page?id=7")).toBe("https://x.io/page?id=7");
  });

  it("collapses /amp suffixes", () => {
    expect(canonicalUrl("https://x.io/post/amp")).toBe("https://x.io/post");
  });

  it("keeps path case (urls are case-sensitive past the host)", () => {
    expect(canonicalUrl("https://x.io/Post-Title/")).toBe("https://x.io/Post-Title");
  });
});

describe("slugify", () => {
  it("lowercases, strips diacritics and punctuation into hyphens", () => {
    expect(slugify("Héllo — World! 123")).toBe("hello-world-123");
  });
  it("collapses repeated separators and trims them", () => {
    expect(slugify("  a  --  b  ")).toBe("a-b");
  });
  it("returns empty string for pure non-latin scripts", () => {
    expect(slugify("सूत्रधर")).toBe("");
  });
});

describe("htmlToText", () => {
  it("strips tags, script/style blocks, decodes entities, collapses whitespace", () => {
    const html = `<p>Hello <b>world</b> &amp; friends</p><script>bad()</script><style>.x{}</style><p>Line&#160;two</p>`;
    expect(htmlToText(html)).toBe("Hello world & friends Line two");
  });
  it("returns empty string for empty input", () => {
    expect(htmlToText("")).toBe("");
  });
});

describe("excerptFrom", () => {
  it("truncates at a word boundary within the limit and appends an ellipsis", () => {
    const text = "word ".repeat(100).trim();
    const out = excerptFrom(text, 40);
    expect(out.length).toBeLessThanOrEqual(41);
    expect(out.endsWith("…")).toBe(true);
  });
  it("returns short text unchanged without ellipsis", () => {
    expect(excerptFrom("short text", 40)).toBe("short text");
  });
});

describe("articleId", () => {
  it("derives a stable 16-hex-char id from the canonical url", () => {
    const a = articleId("https://blog.swiggy.io/Some-Post");
    const b = articleId("https://blog.swiggy.io/Some-Post?utm_source=rss");
    expect(a).toBe(b);
    expect(a).toMatch(/^[a-f0-9]{16}$/);
  });
  it("differs for different urls", () => {
    expect(articleId("https://a.io/x")).not.toBe(articleId("https://b.io/x"));
  });
});
