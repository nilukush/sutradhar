import type { RawItem } from "@/lib/feeds";
import type { Source } from "@/lib/schema";

/**
 * HTML scraper adapters for engineering blogs with no feed (Juspay).
 * Zero new dependencies — the sites emit JSON-LD ItemLists and og: meta tags,
 * which regex-extract deterministically. Fixtures in tests/scrapers.test.ts
 * pin the exact shapes these parsers accept.
 */

/** Never fetch more than this many post pages per source per run. */
const MAX_POSTS = 20;

/**
 * Juspay: the /blog/engineering category page carries a CollectionPage →
 * ItemList JSON-LD of post URLs; per-post pages expose og:title (prefixed
 * "Juspay | ") and og:description; publish dates come from the sitemap
 * lastmod of each loc (the posts themselves emit no date metadata).
 */
export function parseJuspayCategory(html: string): string[] {
  const urls: string[] = [];
  const itemList = html.match(/"@type":"ItemList","itemListElement":\[([\s\S]*?)\]/);
  if (!itemList) return urls;
  for (const match of itemList[1]!.matchAll(/"url":"(https:\/\/[^"]+)"/g)) {
    const url = match[1]!;
    // The ItemList is the site's own post list; keep only /blog/<slug> URLs
    // (single path segment under /blog) so stray links can't slip in.
    if (/^\/blog\/[^/]+$/.test(new URL(url).pathname)) urls.push(url);
  }
  return [...new Set(urls)];
}

export function parseJuspaySitemap(xml: string): Map<string, string> {
  const dates = new Map<string, string>();
  // Tolerant per-<url> extraction: real sitemaps interleave whitespace/other
  // tags between <loc> and <lastmod>, so strict adjacency regexes miss them.
  for (const block of xml.matchAll(/<url>([\s\S]*?)<\/url>/g)) {
    const loc = block[1]!.match(/<loc>([^<]+)<\/loc>/)?.[1];
    const lastmod = block[1]!.match(/<lastmod>([^<]+)<\/lastmod>/)?.[1];
    if (loc && lastmod) dates.set(loc, lastmod);
  }
  return dates;
}

export function parseJuspayPost(url: string, html: string, lastmod: string): RawItem {
  const ogTitle = html.match(/property="og:title" content="([^"]*)"/)?.[1] ?? "";
  const ogDescription = html.match(/property="og:description" content="([^"]*)"/)?.[1] ?? "";
  const title = ogTitle.replace(/^Juspay \| /, "").trim();
  return {
    title,
    url,
    publishedAt: lastmod,
    excerpt: ogDescription.trim() || undefined,
    contentHtml: undefined,
    authors: [],
    categories: [],
    guid: url,
  };
}

async function fetchText(
  url: string,
  fetchImpl: typeof fetch,
  timeoutMs: number,
): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetchImpl(url, { signal: controller.signal, headers: { Accept: "text/html,application/xml,application/xhtml+xml,*/*" } });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.text();
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Orchestration for feed type "juspay": category page → post URLs, sitemap
 * (index → first child) → loc/lastmod dates, then each dated post page.
 * Category-page failure rejects (source marked failed by the pipeline);
 * undated posts and individual post failures are skipped — the corpus keeps
 * whatever merges in, and the next hourly run retries.
 */
export async function fetchJuspayItems(
  source: Source,
  opts: { fetchImpl?: typeof fetch; timeoutMs?: number } = {},
): Promise<RawItem[]> {
  const fetchImpl = opts.fetchImpl ?? fetch;
  const timeoutMs = opts.timeoutMs ?? 15_000;
  if (source.feed.type !== "juspay") return [];

  const origin = new URL(source.feed.url).origin;
  const categoryHtml = await fetchText(source.feed.url, fetchImpl, timeoutMs);
  const postUrls = parseJuspayCategory(categoryHtml).slice(0, MAX_POSTS);

  let lastmods = new Map<string, string>();
  try {
    let xml = await fetchText(`${origin}/sitemap.xml`, fetchImpl, timeoutMs);
    if (xml.includes("<sitemapindex")) {
      // Index → fetch each child sitemap (capped) and merge their url entries.
      const children = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]!).slice(0, 3);
      const parts: string[] = [];
      for (const child of children) {
        try {
          parts.push(await fetchText(child, fetchImpl, timeoutMs));
        } catch {
          // one unreadable child sitemap must not cost all dates
        }
      }
      xml = parts.join("\n");
    }
    lastmods = parseJuspaySitemap(xml);
  } catch {
    // Sitemap is an optimization for dates, not a hard dependency.
  }

  const items: RawItem[] = [];
  for (const url of postUrls) {
    const lastmod = lastmods.get(url);
    if (!lastmod) continue; // no date → aggregate would drop it anyway
    try {
      items.push(parseJuspayPost(url, await fetchText(url, fetchImpl, timeoutMs), lastmod));
    } catch {
      // skip unreachable post
    }
  }
  return items;
}
