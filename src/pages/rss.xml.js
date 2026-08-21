import rss from "@astrojs/rss";
import { ARTICLES, sourceOf } from "@/lib/view";
import { SITE } from "@/lib/site";

export function GET(context) {
  return rss({
    title: `${SITE.name} — ${SITE.shortTagline}`,
    description: SITE.description,
    site: context.site,
    items: ARTICLES.slice(0, 60).map((article) => ({
      title: article.title,
      link: article.url,
      pubDate: new Date(article.publishedAt),
      description: article.excerpt
        ? `${article.excerpt} — via ${sourceOf(article)?.name ?? article.sourceId}`
        : `Via ${sourceOf(article)?.name ?? article.sourceId}`,
      categories: article.topics,
    })),
    customData: "<language>en-in</language>",
  });
}
