import rss from "@astrojs/rss";
import { ARTICLES, CORPUS_GENERATED_AT, sourceOf } from "@/lib/view";
import { readHref } from "@/lib/read";
import { SITE } from "@/lib/site";

export function GET(context) {
  return rss({
    title: `${SITE.name} — ${SITE.shortTagline}`,
    description: SITE.description,
    site: context.site,
    items: ARTICLES.slice(0, 60).map((article) => {
      const sourceName = sourceOf(article)?.name ?? article.sourceId;
      return {
        title: article.title,
        // In-site reading page (or the original when the source opted out);
        // the original article is always linked inside.
        link: readHref(article),
        pubDate: new Date(article.publishedAt),
        description: article.excerpt
          ? `${article.excerpt} — continue reading the original from ${sourceName}: ${article.url}`
          : `Continue reading the original from ${sourceName}: ${article.url}`,
        categories: article.topics,
      };
    }),
    // W3C feed-validator completeness (audit P3): self reference + build date
    // from the corpus, not the wall clock — deterministic across builds.
    customData: `
      <language>en-in</language>
      <lastBuildDate>${new Date(CORPUS_GENERATED_AT).toUTCString()}</lastBuildDate>
      <atom:link href="${SITE.url}/rss.xml" rel="self" type="application/rss+xml"/>
    `,
    xmlns: { atom: "http://www.w3.org/2005/Atom" },
    // Canonicals and sitemaps are slashless (trailingSlash: "never"); the feed
    // must match or every item 308-redirects.
    trailingSlash: false,
  });
}
