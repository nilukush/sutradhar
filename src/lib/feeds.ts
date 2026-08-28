import { XMLParser } from "fast-xml-parser";
import { excerptFrom, htmlToText } from "@/lib/normalize";

/** Normalized shape every adapter emits, before aggregation. */
export interface RawItem {
  title: string;
  url: string;
  /** ISO-8601; may be "" when the feed gives no parsable date. */
  publishedAt: string;
  excerpt?: string;
  contentHtml?: string;
  authors: string[];
  categories: string[];
  guid?: string;
}

export class FeedParseError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = "FeedParseError";
  }
}

export interface GhostPost {
  title: string;
  url: string;
  published_at?: string;
  custom_excerpt?: string;
  excerpt?: string;
  plaintext?: string;
  authors?: { name?: string }[];
  tags?: { name?: string }[];
}

export interface GhostResponse {
  posts?: GhostPost[];
  /** Ghost Content API pagination — `next` is the next page number or null. */
  meta?: { pagination?: { page?: number; pages?: number; next?: number | null; prev?: number | null } };
}

const parser = new XMLParser({
  ignoreAttributes: false,
  cdataPropName: "__cdata",
  removeNSPrefix: true,
});

type XmlNode = Record<string, unknown>;

/** Resolve fast-xml-parser's many shapes (string | {__cdata} | {#text} | array) to text. */
function textOf(value: unknown): string {
  if (value == null) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);
  if (Array.isArray(value)) return textOf(value[0]);
  if (typeof value === "object") {
    const node = value as XmlNode;
    if ("__cdata" in node) return textOf(node.__cdata);
    if ("#text" in node) return textOf(node["#text"]);
  }
  return "";
}

function asArray<T>(value: T | T[] | undefined): T[] {
  if (value == null) return [];
  return Array.isArray(value) ? value : [value];
}

function toIso(rawDate: string): string {
  if (!rawDate) return "";
  const d = new Date(rawDate);
  return Number.isNaN(d.getTime()) ? "" : d.toISOString();
}

function firstLink(entry: XmlNode): string {
  const links = asArray(entry.link as XmlNode | XmlNode[] | undefined);
  for (const link of links) {
    const rel = typeof link === "object" ? (link["@_rel"] as string | undefined) : undefined;
    const href = typeof link === "object" ? ((link["@_href"] as string | undefined) ?? "") : String(link ?? "");
    if (href && (!rel || rel === "alternate")) return href;
  }
  return "";
}

/** Parse RSS 2.0 or Atom into RawItems. Throws FeedParseError on malformed XML. */
export function parseRssOrAtom(xml: string): RawItem[] {
  let doc: XmlNode;
  try {
    doc = parser.parse(xml) as XmlNode;
  } catch (cause) {
    throw new FeedParseError("XML parse failure", { cause });
  }

  const rssItems = asArray((doc.rss as XmlNode | undefined)?.channel as XmlNode | undefined)?.flatMap(
    (channel) => asArray(channel.item as XmlNode | XmlNode[] | undefined),
  );
  if (rssItems.length > 0 || doc.rss) {
    return rssItems.map((item) => {
      const description = textOf(item.description);
      const encoded =
        textOf(item["content:encoded"]) || textOf(item.encoded) || textOf(item.content);
      const url = textOf(item.link) || textOf(item.guid);
      return {
        title: textOf(item.title).trim(),
        url,
        publishedAt: toIso(textOf(item.pubDate) || textOf(item.published) || textOf(item.updated) || textOf(item.date)),
        excerpt: description ? excerptFrom(htmlToText(description)) : undefined,
        contentHtml: encoded || undefined,
        authors: [textOf(item.creator) || textOf(item.author)].filter(Boolean),
        categories: asArray(item.category as string | string[] | undefined)
          .map((c) => (typeof c === "string" ? c : textOf(c)))
          .filter(Boolean),
        guid: textOf(item.guid) || undefined,
      } satisfies RawItem;
    });
  }

  const atomEntries = asArray((doc.feed as XmlNode | undefined)?.entry as XmlNode | XmlNode[] | undefined);
  if (doc.feed) {
    return atomEntries.map((entry) => {
      const content = textOf(entry.content);
      const summary = textOf(entry.summary);
      return {
        title: textOf(entry.title).trim(),
        url: firstLink(entry),
        publishedAt: toIso(textOf(entry.published) || textOf(entry.updated)),
        excerpt: summary ? excerptFrom(htmlToText(summary)) : content ? excerptFrom(htmlToText(content)) : undefined,
        contentHtml: content || undefined,
        authors: asArray(entry.author as XmlNode | XmlNode[] | undefined)
          .map((a) => textOf(a.name))
          .filter(Boolean),
        categories: asArray(entry.category as XmlNode | XmlNode[] | undefined)
          .map((c) => (typeof c === "string" ? c : ((c["@_term"] as string | undefined) ?? "")))
          .filter(Boolean),
        guid: textOf(entry.id) || undefined,
      } satisfies RawItem;
    });
  }

  throw new FeedParseError("Neither RSS channel nor Atom feed found in document");
}

/** Map a Ghost Content API response into RawItems (Meesho adapter). */
export function mapGhostPosts(
  response: GhostResponse,
  opts: { urlRewrite?: [string, string] } = {},
): RawItem[] {
  return (response.posts ?? []).map((post) => {
    let url = post.url ?? "";
    const [from, to] = opts.urlRewrite ?? [];
    if (from && to && url.startsWith(from)) url = to + url.slice(from.length);
    const plaintext = post.plaintext ?? "";
    const bylineLike = /^written by/i.test(post.custom_excerpt ?? post.excerpt ?? "");
    const excerpt = plaintext
      ? excerptFrom(plaintext)
      : bylineLike
        ? ""
        : excerptFrom(post.custom_excerpt ?? post.excerpt ?? "");
    return {
      title: (post.title ?? "").trim(),
      url,
      publishedAt: toIso(post.published_at ?? ""),
      excerpt: excerpt || undefined,
      contentHtml: undefined,
      authors: (post.authors ?? []).map((a) => a.name ?? "").filter(Boolean),
      categories: (post.tags ?? []).map((t) => (t.name ?? "").toLowerCase().replace(/\s+/g, "-")).filter(Boolean),
      guid: post.url,
    } satisfies RawItem;
  });
}
