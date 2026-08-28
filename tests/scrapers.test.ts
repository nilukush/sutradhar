import { describe, expect, it, vi } from "vitest";
import { parseJuspayCategory, parseJuspaySitemap, parseJuspayPost, fetchJuspayItems, fetchSanityPosts } from "@/lib/scrapers";
import type { Source } from "@/lib/schema";

const CATEGORY_HTML = `<!doctype html><html><head>
<script type="application/ld+json">{"@context":"https://schema.org","@type":"CollectionPage","name":"Engineering","url":"https://juspay.io/blog/engineering","mainEntity":{"@type":"ItemList","itemListElement":[
{"@type":"ListItem","position":1,"url":"https://juspay.io/blog/post-one"},
{"@type":"ListItem","position":2,"url":"https://juspay.io/blog/post-two"},
{"@type":"ListItem","position":3,"url":"https://juspay.io/blog/post-three-no-sitemap-date"},
{"@type":"ListItem","position":4,"url":"https://juspay.io/careers"}
]}}</script>
</head><body></body></html>`;

const SITEMAP_XML = `<?xml version="1.0"?><urlset>
<url><loc>https://juspay.io/blog/post-one</loc><lastmod>2026-07-15T09:58:06.000Z</lastmod></url>
<url><loc>https://juspay.io/blog/post-two</loc><lastmod>2026-05-02T11:00:00.000Z</lastmod></url>
<url><loc>https://juspay.io/about</loc><lastmod>2026-08-27T07:13:20.494Z</lastmod></url>
</urlset>`;

function postHtml(title: string, description: string) {
  return `<html><head>
<title>Juspay | ${title}</title>
<meta property="og:title" content="Juspay | ${title}"/>
<meta property="og:description" content="${description}"/>
</head><body></body></html>`;
}

const POST_ONE = postHtml("Inside our SDK", "Juspay's SDKs help merchants talk to the orchestration layer.");
const POST_TWO = postHtml("Payment routing deep dive", "How routing decisions are made at scale.");

describe("juspay scraper (pure parsers)", () => {
  it("extracts blog post URLs from the category ItemList, ignoring category noise", () => {
    expect(parseJuspayCategory(CATEGORY_HTML)).toEqual([
      "https://juspay.io/blog/post-one",
      "https://juspay.io/blog/post-two",
      "https://juspay.io/blog/post-three-no-sitemap-date",
    ]);
  });

  it("maps loc → lastmod from the sitemap", () => {
    const dates = parseJuspaySitemap(SITEMAP_XML);
    expect(dates.get("https://juspay.io/blog/post-one")).toBe("2026-07-15T09:58:06.000Z");
    expect(dates.has("https://juspay.io/about")).toBe(true);
    expect(dates.has("https://juspay.io/blog/post-three-no-sitemap-date")).toBe(false);
  });

  it("parses a post page: og:title without the site prefix, og:description as excerpt", () => {
    expect(parseJuspayPost("https://juspay.io/blog/post-one", POST_ONE, "2026-07-15T09:58:06.000Z")).toEqual({
      title: "Inside our SDK",
      url: "https://juspay.io/blog/post-one",
      publishedAt: "2026-07-15T09:58:06.000Z",
      excerpt: "Juspay's SDKs help merchants talk to the orchestration layer.",
      contentHtml: undefined,
      authors: [],
      categories: [],
      guid: "https://juspay.io/blog/post-one",
    });
  });
});

describe("fetchJuspayItems (orchestration)", () => {
  const source: Source = {
    id: "juspay",
    name: "Juspay",
    siteUrl: "https://juspay.io/",
    feed: { type: "juspay", urls: ["https://juspay.io/blog/engineering"] },
    platform: "custom",
    tier: 2,
    topics: ["fintech-payments"],
  };

  it("glues category + sitemap + posts into RawItems, dropping undated posts", async () => {
    const fetchImpl = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.endsWith("/blog/engineering")) return new Response(CATEGORY_HTML, { status: 200 });
      if (url.endsWith(".xml")) return new Response(SITEMAP_XML, { status: 200 });
      if (url.endsWith("post-one")) return new Response(POST_ONE, { status: 200 });
      if (url.endsWith("post-two")) return new Response(POST_TWO, { status: 200 });
      return new Response("missing", { status: 404 });
    }) as unknown as typeof fetch;

    const items = await fetchJuspayItems(source, { fetchImpl });
    expect(items.map((i) => i.title)).toEqual(["Inside our SDK", "Payment routing deep dive"]);
    // 1 category + 1 sitemap + one fetch per dated post (undated skipped)
    expect(fetchImpl).toHaveBeenCalledTimes(4);
  });

  it("fails the source when the category page itself is unreachable", async () => {
    const fetchImpl = vi.fn(async () => new Response("boom", { status: 500 })) as unknown as typeof fetch;
    await expect(fetchJuspayItems(source, { fetchImpl })).rejects.toThrow();
  });

  it("survives an individual post 404 by skipping it", async () => {
    const fetchImpl = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.endsWith("/blog/engineering")) return new Response(CATEGORY_HTML, { status: 200 });
      if (url.endsWith(".xml")) return new Response(SITEMAP_XML, { status: 200 });
      return new Response("missing", { status: 404 });
    }) as unknown as typeof fetch;
    const items = await fetchJuspayItems(source, { fetchImpl });
    expect(items).toEqual([]);
  });
});

describe("sharechat sanity adapter", () => {
  const SANITY_BODY = {
    query: "groq",
    result: [
      {
        title: "How ShareChat built a scalable cost efficient ML Feature system",
        slug: "how-sharechat-built-a-scalable-cost-efficient-ml-feature-system",
        pub: "2025-03-06T05:45:00.000Z",
        cat: "Artificial Intelligence",
        author: "David Malinge,Ivan Burmistrov",
        excerpt: "At ShareChat, Machine Learning models form the backbone of our recommendation system.",
      },
      {
        title: "No-author post",
        slug: "no-author-post",
        pub: "2024-01-02T03:04:05.000Z",
        cat: "Engineering",
        author: null,
        excerpt: null,
      },
    ],
    ms: 5,
  };

  const source: Source = {
    id: "sharechat",
    name: "ShareChat",
    siteUrl: "https://sharechat.com/blogs",
    feed: {
      type: "sanity",
      projectId: "10qgadfo",
      dataset: "production",
      categories: ["Engineering", "Artificial Intelligence"],
      urlBase: "https://sharechat.com/blogs",
    },
    platform: "custom",
    tier: 2,
    topics: ["backend"],
  };

  it("maps Sanity posts to RawItems with category URL paths and split authors", async () => {
    const fetchImpl = vi.fn(async () => new Response(JSON.stringify(SANITY_BODY), { status: 200 })) as unknown as typeof fetch;
    const items = await fetchSanityPosts(source, { fetchImpl });
    expect(items[0]).toMatchObject({
      title: "How ShareChat built a scalable cost efficient ML Feature system",
      url: "https://sharechat.com/blogs/artificial-intelligence/how-sharechat-built-a-scalable-cost-efficient-ml-feature-system",
      publishedAt: "2025-03-06T05:45:00.000Z",
      authors: ["David Malinge", "Ivan Burmistrov"],
      excerpt: "At ShareChat, Machine Learning models form the backbone of our recommendation system.",
    });
    expect(items[1]).toMatchObject({ authors: [], excerpt: undefined, url: "https://sharechat.com/blogs/engineering/no-author-post" });
    expect(fetchImpl).toHaveBeenCalledOnce();
    const calledUrl = String((fetchImpl as ReturnType<typeof vi.fn>).mock.calls[0][0]);
    expect(calledUrl).toContain("10qgadfo.api.sanity.io/v1/data/query/production");
    expect(calledUrl).toContain(encodeURIComponent('"Engineering"'));
  });

  it("rejects when the Sanity API errors", async () => {
    const fetchImpl = vi.fn(async () => new Response("nope", { status: 500 })) as unknown as typeof fetch;
    await expect(fetchSanityPosts(source, { fetchImpl })).rejects.toThrow();
  });
});

describe("juspay multi-category", () => {
  const CATEGORY_HTML_2 = CATEGORY_HTML.replace(
    "https://juspay.io/blog/post-one",
    "https://juspay.io/blog/post-ai",
  );
  const SITEMAP_AI = SITEMAP_XML.replace(
    "</urlset>",
    "<url><loc>https://juspay.io/blog/post-ai</loc><lastmod>2026-06-01T00:00:00.000Z</lastmod></url>\n</urlset>",
  );

  it("unions post URLs across all category pages and dedupes", async () => {
    const fetchImpl = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.endsWith("/blog/engineering")) return new Response(CATEGORY_HTML, { status: 200 });
      if (url.endsWith("/blog/artificial-intelligence")) return new Response(CATEGORY_HTML_2, { status: 200 });
      if (url.endsWith(".xml")) return new Response(SITEMAP_AI, { status: 200 });
      if (url.endsWith("post-ai")) return new Response(POST_ONE, { status: 200 });
      return new Response(POST_ONE, { status: 200 });
    }) as unknown as typeof fetch;

    const source: Source = {
      id: "juspay",
      name: "Juspay",
      siteUrl: "https://juspay.io/blog",
      feed: {
        type: "juspay",
        urls: ["https://juspay.io/blog/engineering", "https://juspay.io/blog/artificial-intelligence"],
      },
      platform: "custom",
      tier: 2,
      topics: ["fintech-payments"],
    };
    const items = await fetchJuspayItems(source, { fetchImpl });
    // post-one (engineering, dated), post-ai (AI variant of post-one URL, dated via same lastmod), post-two (dated)
    expect(items.map((i) => i.url).sort()).toEqual([
      "https://juspay.io/blog/post-ai",
      "https://juspay.io/blog/post-one",
      "https://juspay.io/blog/post-two",
    ]);
  });
});
