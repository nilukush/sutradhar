import type { Article } from "@/lib/schema";
import { WINDOW_H } from "@/lib/trending";

/**
 * Hacker News engagement enrichment via hn.algolia.com (free, no key).
 * Snapshotted at fetch time into the corpus so trending stays deterministic
 * per corpus build. Matching is exact-URL-after-normalization only — title
 * matches are never credited (false positives cost more than misses).
 */

/** Below this, a HN submission is noise (self-submits with 1–2 points). */
export const MIN_HN_POINTS = 10;

const ALGOLIA_SEARCH = "https://hn.algolia.com/api/v1/search?tags=story&hitsPerPage=10&query=";

export interface HnSignal {
  points: number;
  comments: number;
  /** HN objectID — stable discussion link id. */
  storyId: string;
  /** When this snapshot was taken (fetch-run time). */
  matchedAt: string;
}

/** Comparable URL form: host lowercase, no protocol/query/hash, no trailing slash. */
export function normalizeUrlForHn(raw: string): string {
  try {
    const u = new URL(raw);
    return (u.hostname.toLowerCase() + u.pathname).replace(/\/+$/, "");
  } catch {
    return "";
  }
}

/**
 * Conservative boost: log10 scale capped at ×5. 10 points ≈ ×2, 100 ≈ ×3,
 * 1000 ≈ ×4 — a front-page hit matters, but recency + tier still dominate.
 */
export function hnBoost(points: number | undefined): number {
  if (!points || points <= 0) return 1;
  return Math.min(5, 1 + Math.log10(points + 1));
}

interface AlgoliaHit {
  objectID?: string;
  url?: string;
  points?: number;
  num_comments?: number;
}

/**
 * For every article inside the trending window, look it up on HN and attach
 * the best matching story's engagement. Articles outside the window have any
 * stale hn signal stripped (trending ignores them anyway). HN being slow or
 * down never fails the fetch run — those articles simply keep no signal.
 */
export async function enrichWithHn(
  articles: Article[],
  opts: { fetchImpl?: typeof fetch; now?: Date; timeoutMs?: number } = {},
): Promise<Article[]> {
  const fetchImpl = opts.fetchImpl ?? fetch;
  const now = opts.now ?? new Date();
  const timeoutMs = opts.timeoutMs ?? 10_000;
  const windowStart = now.getTime() - WINDOW_H * 3_600_000;

  const out: Article[] = [];
  for (const article of articles) {
    // Rebuild from a clean base so stale signals are replaced, not merged.
    const { hn: _old, ...base } = article;
    const publishedAt = new Date(article.publishedAt).getTime();
    if (Number.isNaN(publishedAt) || publishedAt < windowStart) {
      out.push(base as Article);
      continue;
    }
    const signal = await lookupHn(article.url, fetchImpl, now, timeoutMs);
    out.push(signal ? { ...base, hn: signal } : (base as Article));
  }
  return out;
}

async function lookupHn(
  articleUrl: string,
  fetchImpl: typeof fetch,
  now: Date,
  timeoutMs: number,
): Promise<HnSignal | undefined> {
  const target = normalizeUrlForHn(articleUrl);
  if (!target) return undefined;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetchImpl(`${ALGOLIA_SEARCH}${encodeURIComponent(articleUrl)}`, {
      signal: controller.signal,
      headers: { Accept: "application/json" },
    });
    if (!res.ok) return undefined;
    const json = (await res.json()) as { hits?: AlgoliaHit[] };
    const matching = (json.hits ?? [])
      .filter(
        (hit) =>
          (hit.points ?? 0) >= MIN_HN_POINTS &&
          hit.objectID &&
          normalizeUrlForHn(hit.url ?? "") === target,
      )
      .sort((a, b) => (b.points ?? 0) - (a.points ?? 0));
    const best = matching[0];
    if (!best?.objectID) return undefined;
    return {
      points: best.points ?? 0,
      comments: best.num_comments ?? 0,
      storyId: best.objectID,
      matchedAt: now.toISOString(),
    };
  } catch {
    return undefined; // HN unreachable/timeouts must never break aggregation
  } finally {
    clearTimeout(timer);
  }
}
