import { sourceOf } from "@/lib/view";
import { SITE } from "@/lib/site";
import type { Article, Source } from "@/lib/schema";

/** Route slug lives in alias-free src/lib/slug.ts (imported by astro.config). */
import { articleSlug } from "@/lib/slug";
export { articleSlug };

/** In-site reading page path for an article. */
export function articleHref(article: Pick<Article, "id" | "title">): string {
  return `/read/${articleSlug(article)}`;
}

/** A source with excerptLimit 0 has opted out of in-site excerpts entirely. */
export function isOptedOut(source: Source | undefined): boolean {
  return (source?.excerptLimit ?? 400) === 0;
}

/** True when the article's card should link straight to the original publisher. */
export function isExternalRead(article: Article): boolean {
  return isOptedOut(sourceOf(article));
}

/**
 * Link target for any article surface: the in-site reading page, or the
 * original article when its source opted out.
 */
export function readHref(article: Article, source: Source | undefined = sourceOf(article)): string {
  return isOptedOut(source) ? article.url : articleHref(article);
}

/**
 * Absolute href for feeds and JSON-LD contexts: the in-site reading page on
 * this origin, or the publisher's URL when the source opted out.
 */
export function absoluteReadHref(article: Article, source: Source | undefined = sourceOf(article)): string {
  const href = readHref(article, source);
  return href.startsWith("http") ? href : `${SITE.url}${href}`;
}
