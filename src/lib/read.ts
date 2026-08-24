import { slugify } from "@/lib/normalize";
import { sourceOf } from "@/lib/view";
import type { Article, Source } from "@/lib/schema";

/** Max characters of the title portion in a /read URL. */
const MAX_SLUG_TITLE = 80;

/**
 * Stable, unique in-site route slug for an article: kebab-cased title (or
 * "story" when the title yields no latin slug, e.g. Devanagari) + the 16-hex
 * article id. The id suffix guarantees uniqueness no matter how generic the
 * title is.
 */
export function articleSlug(article: Pick<Article, "id" | "title">): string {
  const base = slugify(article.title)
    .slice(0, MAX_SLUG_TITLE)
    .replace(/-+$/g, "");
  return `${base || "story"}-${article.id}`;
}

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
export function readHref(article: Article): string {
  return isExternalRead(article) ? article.url : articleHref(article);
}
