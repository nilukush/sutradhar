import { articleSlug } from "./slug";

/**
 * Sitemap serialize hook: immutable /read/<slug> pages carry the article's
 * publishedAt as lastmod instead of the build timestamp, so Google's lastmod
 * trust isn't diluted by uniform build-time dates on 800+ unchanged pages
 * (SEO-GEO-AUDIT C3). Hub pages keep the build-time lastmod — they genuinely
 * change whenever the corpus does, and builds only fire on data change.
 *
 * Alias-free imports only: this module is loaded by astro.config.mjs.
 */
export interface SitemapItem {
  url: string;
  lastmod?: string;
  changefreq?: string;
  priority?: number;
}

export function withReadPageLastmod(articles: { id: string; title: string; publishedAt: string }[]) {
  const byPath = new Map<string, string>();
  for (const article of articles) {
    byPath.set(`/read/${articleSlug(article)}`, new Date(article.publishedAt).toISOString());
  }
  return (item: SitemapItem): SitemapItem => {
    let pathname: string;
    try {
      pathname = new URL(item.url).pathname;
    } catch {
      return item;
    }
    const lastmod = byPath.get(pathname.replace(/\/+$/, ""));
    return lastmod ? { ...item, lastmod } : item;
  };
}
