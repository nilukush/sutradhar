import type { RawItem } from "@/lib/feeds";
import { excerptFrom, slugify } from "@/lib/normalize";
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

  const origin = new URL(source.feed.urls[0]!).origin;
  // Union every category's post list (a post can appear in several categories).
  const postUrls: string[] = [];
  for (const categoryUrl of source.feed.urls) {
    try {
      postUrls.push(...parseJuspayCategory(await fetchText(categoryUrl, fetchImpl, timeoutMs)));
    } catch (error) {
      // The first category page failing means the source is down.
      if (categoryUrl === source.feed.urls[0]) throw error;
    }
  }
  const uniqueUrls = [...new Set(postUrls)].slice(0, MAX_POSTS);

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
  for (const url of uniqueUrls) {
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

/**
 * ShareChat: the public blog lives on a Sanity dataset (project visible in
 * their cdn.sanity.io image URLs; the dataset is publicly queryable — the
 * same public-by-design pattern as Meesho's Ghost key). One GROQ query
 * fetches every post in the configured categories with title, slug, date,
 * author and excerpt; post URLs follow /blogs/<category-slug>/<post-slug>.
 */
interface SanityPost {
  title?: string;
  slug?: string;
  pub?: string;
  cat?: string;
  author?: string | null;
  excerpt?: string | null;
}

export async function fetchSanityPosts(
  source: Source,
  opts: { fetchImpl?: typeof fetch; timeoutMs?: number } = {},
): Promise<RawItem[]> {
  const fetchImpl = opts.fetchImpl ?? fetch;
  const timeoutMs = opts.timeoutMs ?? 15_000;
  if (source.feed.type !== "sanity") return [];

  const groq =
    `*[_type=="post" && categories->.title in [${source.feed.categories.map((c) => JSON.stringify(c)).join(",")}]]` +
    `{title,"slug":slug.current,"pub":publishedAt,"cat":categories->.title,"author":author->name,"excerpt":excerpt} | order(pub desc)`;
  const url = `https://${source.feed.projectId}.api.sanity.io/v1/data/query/${source.feed.dataset}?query=${encodeURIComponent(groq)}`;

  const json = JSON.parse(await fetchText(url, fetchImpl, timeoutMs)) as {
    result?: SanityPost[];
  };
  return (json.result ?? []).map((post) => ({
    title: (post.title ?? "").trim(),
    url: `${source.feed.urlBase}/${slugify(post.cat ?? "")}/${post.slug ?? ""}`,
    publishedAt: post.pub ?? "",
    excerpt: post.excerpt ? excerptFrom(post.excerpt) : undefined,
    contentHtml: undefined,
    // Sanity stores co-authors as one comma-joined string.
    authors: (post.author ?? "").split(",").map((a) => a.trim()).filter(Boolean),
    categories: [],
    guid: post.slug ?? undefined,
  }));
}
