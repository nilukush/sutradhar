import { mapGhostPosts, parseRssOrAtom, type GhostResponse } from "@/lib/feeds";
import { toArticle } from "@/lib/aggregate";
import type { Article, Source } from "@/lib/schema";

/**
 * Browser-like UA: several sources (Razorpay, Flipkart custom domains) sit behind
 * Cloudflare rules that 403 bare bots on /feed/ paths.
 */
export const BROWSER_UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36 SutradharAggregator/1.0 (+https://sutradhar.nilukush.workers.dev)";

export interface FetchOptions {
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
  retries?: number;
  /** Ghost API page size. */
  ghostLimit?: number;
}

export interface FetchResult {
  articles: Article[];
  errors: { sourceId: string; error: string }[];
}

async function fetchWithRetry(
  url: string,
  init: RequestInit,
  fetchImpl: typeof fetch,
  timeoutMs: number,
  retries: number,
): Promise<Response> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetchImpl(url, { ...init, signal: controller.signal });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res;
    } catch (error) {
      lastError = error;
    } finally {
      clearTimeout(timer);
    }
  }
  throw lastError instanceof Error ? lastError : new Error(String(lastError));
}

function ghostUrl(source: Source, limit: number): string {
  if (source.feed.type !== "ghost") return "";
  const { url, ghostKey } = source.feed;
  const joiner = url.includes("?") ? "&" : "?";
  return `${url}${joiner}key=${encodeURIComponent(ghostKey)}&limit=${limit}&include=authors,tags&formats=plaintext`;
}

/** Fetch every source concurrently; per-source failures are recorded, never fatal. */
export async function fetchAllSources(
  sources: Source[],
  opts: FetchOptions = {},
): Promise<FetchResult> {
  const fetchImpl = opts.fetchImpl ?? fetch;
  const timeoutMs = opts.timeoutMs ?? 15_000;
  const retries = opts.retries ?? 2;
  const ghostLimit = opts.ghostLimit ?? 15;

  const settled = await Promise.allSettled(
    sources.map(async (source) => {
      if (source.feed.type === "ghost") {
        const res = await fetchWithRetry(
          ghostUrl(source, ghostLimit),
          { headers: { "User-Agent": BROWSER_UA, Accept: "application/json" } },
          fetchImpl,
          timeoutMs,
          retries,
        );
        const json = (await res.json()) as GhostResponse;
        const rewrite = source.feed.urlRewrite;
        return mapGhostPosts(json, { urlRewrite: rewrite }).map((item) => toArticle(source, item));
      }
      const res = await fetchWithRetry(
        source.feed.url,
        { headers: { "User-Agent": BROWSER_UA, Accept: "application/rss+xml, application/atom+xml, application/xml, text/xml, */*" } },
        fetchImpl,
        timeoutMs,
        retries,
      );
      const xml = await res.text();
      return parseRssOrAtom(xml).map((item) => toArticle(source, item));
    }),
  );

  const articles: Article[] = [];
  const errors: FetchResult["errors"] = [];
  settled.forEach((outcome, i) => {
    const source = sources[i]!;
    if (outcome.status === "fulfilled") {
      articles.push(...outcome.value.filter((a): a is Article => a !== null));
    } else {
      const reason = outcome.reason instanceof Error ? outcome.reason.message : String(outcome.reason);
      errors.push({ sourceId: source.id, error: reason });
    }
  });
  return { articles, errors };
}
