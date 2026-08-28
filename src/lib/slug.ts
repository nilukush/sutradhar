import { slugify } from "./normalize";

/**
 * Stable, unique in-site route slug for an article: kebab-cased title (or
 * "story" when the title yields no latin slug, e.g. Devanagari) + the 16-hex
 * article id. The id suffix guarantees uniqueness no matter how generic the
 * title is.
 *
 * Lives in its own alias-free module so astro.config.mjs (sitemap lastmod
 * mapping) can import it; src/lib/read.ts re-exports it for page code.
 */
/** Max characters of the title portion in a /read URL. */
const MAX_SLUG_TITLE = 80;

export function articleSlug(article: { id: string; title: string }): string {
  const base = slugify(article.title)
    .slice(0, MAX_SLUG_TITLE)
    .replace(/-+$/g, "");
  return `${base || "story"}-${article.id}`;
}
