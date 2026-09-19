import type { Article, Source } from "@/lib/schema";
import { hnBoost } from "@/lib/hn";

/**
 * Deterministic trending — the Planet-lineage pattern (recency + source weight +
 * diversity cap), computable in the hourly build with zero analytics. An optional
 * HN-points multiplier (hn.algolia.com enrichment, attached at fetch time) boosts
 * stories with real discussion — conservative log scale, capped at ×5.
 */
export const TIER_WEIGHTS: Record<1 | 2, number> = { 1: 1.5, 2: 1.0 };

/** Recency half-life in hours. */
export const HALF_LIFE_H = 36;
/**
 * Eligibility window in hours (10 days). The half-life decay does the actual
 * ranking; this is only the hard cutoff. 10 days keeps the section alive
 * through quiet publishing weeks (verified: without it, an empty week hides
 * Trending entirely — the corpus went 7+ days without a single post).
 */
export const WINDOW_H = 240;

/** score = tierWeight × 2^(−age/36h) × hnBoost; 0 outside the window. */
export function trendingScore(article: Article, source: Source, now: Date): number {
  const ageH = (now.getTime() - new Date(article.publishedAt).getTime()) / 3_600_000;
  if (Number.isNaN(ageH) || ageH < 0 || ageH > WINDOW_H) return 0;
  return TIER_WEIGHTS[source.tier] * Math.pow(2, -ageH / HALF_LIFE_H) * hnBoost(article.hn?.points);
}

/**
 * Whether the home page will render a trending section at all: at least one
 * article inside the window at `now`. Age is measured against the caller's
 * clock — the route verifier passes the build-time now so its expectation can
 * never drift from what trendingScore/trendingArticles actually render (they
 * reject future-dated articles too, so this does as well).
 */
export function trendingEligible(articles: readonly { publishedAt: string }[], now: Date): boolean {
  return articles.some((a) => {
    const ageH = (now.getTime() - new Date(a.publishedAt).getTime()) / 3_600_000;
    return !Number.isNaN(ageH) && ageH >= 0 && ageH <= WINDOW_H;
  });
}

export interface TrendingOptions {
  now: Date;
  limit?: number;
  maxPerSource?: number;
}

/**
 * Rank window-eligible articles by score, then apply a per-source diversity cap
 * (at most maxPerSource articles per source) so one prolific blog can't flood
 * the section. Deterministic: identical inputs → identical output.
 */
export function trendingArticles(
  articles: Article[],
  sources: Source[],
  opts: TrendingOptions,
): Article[] {
  const { now, limit = 6, maxPerSource = 2 } = opts;
  const byId = new Map(sources.map((s) => [s.id, s]));

  const ranked = articles
    .map((article) => {
      const source = byId.get(article.sourceId);
      return source ? { article, score: trendingScore(article, source, now) } : null;
    })
    .filter((x): x is { article: Article; score: number } => x !== null && x.score > 0)
    .sort((a, b) => b.score - a.score || a.article.id.localeCompare(b.article.id));

  const out: Article[] = [];
  const perSource = new Map<string, number>();
  for (const { article } of ranked) {
    if (out.length >= limit) break;
    const count = perSource.get(article.sourceId) ?? 0;
    if (count >= maxPerSource) continue;
    perSource.set(article.sourceId, count + 1);
    out.push(article);
  }
  return out;
}
