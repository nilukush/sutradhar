import { describe, expect, it } from "vitest";
import { fetchAllSources, BROWSER_UA } from "@/lib/pipeline";
import type { Source } from "@/lib/schema";

const RSS = `<?xml version="1.0"?><rss version="2.0"><channel><title>t</title>
<item><title>Post one</title><link>https://a.io/one?utm_source=rss</link><pubDate>Thu, 20 Aug 2026 10:00:00 GMT</pubDate><description>First post body</description></item>
<item><title>Post two</title><link>https://a.io/two/</link><pubDate>Wed, 19 Aug 2026 10:00:00 GMT</pubDate><description>Second post body</description></item>
</channel></rss>`;

const ATOM = `<?xml version="1.0"?><feed xmlns="http://www.w3.org/2005/Atom"><title>t</title>
<entry><title>Atom post</title><link rel="alternate" href="https://b.io/atom-post"/><published>2026-08-18T08:00:00Z</published></entry></feed>`;

const GHOST = {
  posts: [
    {
      title: "Ghost post",
      url: "https://admin.example.io/ghost-post/",
      published_at: "2026-08-17T12:04:08.000+05:30",
      custom_excerpt: "Written by - Somebody",
      plaintext: "A plaintext body about android layouts.",
    },
  ],
};

const rssSource: Source = {
  id: "alpha",
  name: "Alpha",
  siteUrl: "https://a.io/",
  feed: { type: "rss", url: "https://a.io/feed" },
  platform: "custom",
  tier: 1,
  topics: ["engineering"],
};

const atomSource: Source = {
  ...rssSource,
  id: "beta",
  feed: { type: "atom", url: "https://b.io/atom.xml" },
};

const ghostSource: Source = {
  ...rssSource,
  id: "gamma",
  platform: "ghost",
  feed: {
    type: "ghost",
    url: "https://admin.example.io/ghost/api/v3/content/posts/",
    ghostKey: "023c10be2282a550a5c7d1d75f",
    urlRewrite: ["https://admin.example.io/", "https://www.example.io/blog/"],
  },
};

const deadSource: Source = {
  ...rssSource,
  id: "dead",
  feed: { type: "rss", url: "https://dead.example/feed" },
};

function fixtureFetch(): typeof fetch {
  const seen: { url: string; headers: Record<string, string> }[] = [];
  const impl = ((async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    seen.push({ url, headers: init?.headers as Record<string, string> });
    if (url.startsWith("https://a.io/")) return new Response(RSS, { status: 200 });
    if (url.startsWith("https://b.io/")) return new Response(ATOM, { status: 200 });
    if (url.includes("ghost/api")) return new Response(JSON.stringify(GHOST), { status: 200 });
    if (url.startsWith("https://dead.example/")) return new Response("gone", { status: 500 });
    throw new Error("unexpected url " + url);
  }) as typeof fetch);
  (impl as typeof fetch & { seen: typeof seen }).seen = seen;
  return impl as typeof fetch;
}

describe("fetchAllSources", () => {
  it("aggregates rss, atom and ghost sources into one article list", async () => {
    const res = await fetchAllSources([rssSource, atomSource, ghostSource], {
      fetchImpl: fixtureFetch(),
    });
    expect(res.errors).toEqual([]);
    expect(res.articles).toHaveLength(4);
    const urls = res.articles.map((a) => a.url).sort();
    expect(urls).toContain("https://a.io/one");
    expect(urls).toContain("https://www.example.io/blog/ghost-post"); // canonical: no trailing slash
    expect(res.articles.every((a) => a.id.match(/^[a-f0-9]{16}$/))).toBe(true);
  });

  it("records per-source failures without aborting the run", async () => {
    const res = await fetchAllSources([rssSource, deadSource], { fetchImpl: fixtureFetch(), retries: 0 });
    expect(res.articles.map((a) => a.sourceId)).toEqual(["alpha", "alpha"]);
    expect(res.errors).toHaveLength(1);
    expect(res.errors[0]!.sourceId).toBe("dead");
  });

  it("sends a browser UA and builds ghost urls with key, limit and plaintext format", async () => {
    const fetchImpl = fixtureFetch();
    await fetchAllSources([rssSource, ghostSource], { fetchImpl, ghostLimit: 7 });
    const seen = (fetchImpl as typeof fetch & { seen: { url: string; headers: Record<string, string> }[] }).seen;
    const rssCall = seen.find((c) => c.url.startsWith("https://a.io/"))!;
    expect(rssCall.headers["User-Agent"]).toBe(BROWSER_UA);
    const ghostCall = seen.find((c) => c.url.includes("ghost/api"))!;
    expect(ghostCall.url).toContain("key=023c10be2282a550a5c7d1d75f");
    expect(ghostCall.url).toContain("limit=7");
    expect(ghostCall.url).toContain("formats=plaintext");
  });
});

describe("ghost archive pagination (Meesho backfill)", () => {
  const json = (body: unknown) => new Response(JSON.stringify(body), { status: 200 });
  const paged = (n: number, next: number | null) => ({
    posts: [
      {
        url: `https://admin.example.io/p${n}/`,
        title: `Post ${n}`,
        published_at: "2026-08-01T00:00:00.000Z",
        plaintext: `Body ${n}.`,
      },
    ],
    meta: { pagination: { page: n, next } },
  });

  it("follows pagination until the API reports no next page", async () => {
    const urls: string[] = [];
    const fetchImpl = (async (input: RequestInfo | URL) => {
      const url = String(input);
      urls.push(url);
      if (url.includes("page=1")) return json(paged(1, 2));
      if (url.includes("page=2")) return json(paged(2, 3));
      return json(paged(3, null));
    }) as typeof fetch;
    const res = await fetchAllSources([ghostSource], { fetchImpl });
    expect(res.errors).toEqual([]);
    expect(res.articles.map((a) => a.title)).toEqual(["Post 1", "Post 2", "Post 3"]);
    expect(urls).toHaveLength(3);
    expect(urls[1]).toContain("page=2");
  });

  it("stops at the configured page cap even if the API keeps offering more", async () => {
    let calls = 0;
    const fetchImpl = (async () => {
      calls += 1;
      return json(paged(calls, calls + 1));
    }) as typeof fetch;
    const res = await fetchAllSources([ghostSource], { fetchImpl, ghostMaxPages: 2 });
    expect(calls).toBe(2);
    expect(res.articles).toHaveLength(2);
  });

  it("keeps earlier pages and records an error when a later page fails", async () => {
    const fetchImpl = (async (input: RequestInfo | URL) => {
      if (String(input).includes("page=2")) return new Response("boom", { status: 500 });
      return json(paged(1, 2));
    }) as typeof fetch;
    const res = await fetchAllSources([ghostSource], { fetchImpl });
    expect(res.articles.map((a) => a.title)).toEqual(["Post 1"]);
    expect(res.errors.some((e) => e.sourceId === "gamma")).toBe(true);
  });
});
