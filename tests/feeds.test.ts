import { describe, expect, it } from "vitest";
import { parseRssOrAtom, mapGhostPosts, FeedParseError } from "@/lib/feeds";

const RSS_FIXTURE = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:content="http://purl.org/rss/1.0/modules/content/" xmlns:dc="http://purl.org/dc/elements/1.1/">
<channel>
  <title><![CDATA[PhonePe Tech Blog]]></title>
  <link>https://tech.phonepe.com</link>
  <item>
    <title><![CDATA[Scaling UPI to a billion requests]]></title>
    <link>https://tech.phonepe.com/scaling-upi?utm_source=rss</link>
    <pubDate>Thu, 20 Aug 2026 10:30:00 GMT</pubDate>
    <dc:creator><![CDATA[An Engineer]]></dc:creator>
    <category><![CDATA[engineering]]></category>
    <category><![CDATA[payments]]></category>
    <description><![CDATA[How we handle a billion UPI requests a day.]]></description>
    <content:encoded><![CDATA[<p>Long <b>HTML</b> body about UPI scaling&hellip;</p>]]></content:encoded>
  </item>
  <item>
    <title>No cdata title</title>
    <link>https://tech.phonepe.com/plain-item/</link>
    <pubDate>Wed, 19 Aug 2026 09:00:00 GMT</pubDate>
    <description>Plain description</description>
  </item>
</channel>
</rss>`;

const ATOM_FIXTURE = `<?xml version="1.0" encoding="utf-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <title>Wingify Engineering</title>
  <entry>
    <title>Observability for the masses</title>
    <link rel="alternate" type="text/html" href="https://engineering.wingify.com/observability/"/>
    <published>2026-08-12T08:00:00Z</published>
    <updated>2026-08-12T08:00:00Z</updated>
    <author><name>Dev K</name></author>
    <category term="devops"/>
    <content type="html">&lt;p&gt;Body text&lt;/p&gt;</content>
  </entry>
</feed>`;

const GHOST_FIXTURE = {
  posts: [
    {
      title: "The 350 KB Hidden in Our XML Layouts",
      url: "https://admin-v2.meesho.io/the-350-kb-hidden-in-our-xml-layouts/",
      published_at: "2026-08-17T12:04:08.000+05:30",
      custom_excerpt: "Written by - Ashutosh Gupta",
      excerpt: "Written by - Ashutosh Gupta",
      plaintext: "We found 350 KB of dead weight in our Android XML layouts. Here is how we removed it.",
      authors: [{ name: "Ashutosh Gupta" }],
      tags: [{ name: "android" }, { name: "mobile" }],
    },
  ],
};

describe("parseRssOrAtom", () => {
  it("parses RSS 2.0 with cdata, content:encoded, dc:creator and categories", () => {
    const items = parseRssOrAtom(RSS_FIXTURE);
    expect(items).toHaveLength(2);
    const first = items[0]!;
    expect(first.title).toBe("Scaling UPI to a billion requests");
    expect(first.url).toContain("tech.phonepe.com/scaling-upi");
    expect(first.publishedAt).toBe("2026-08-20T10:30:00.000Z");
    expect(first.authors).toEqual(["An Engineer"]);
    expect(first.categories).toEqual(["engineering", "payments"]);
    expect(first.contentHtml).toContain("HTML");
    expect(first.excerpt).toContain("billion UPI requests");
  });

  it("parses plain (non-cdata) rss items", () => {
    const items = parseRssOrAtom(RSS_FIXTURE);
    expect(items[1]!.title).toBe("No cdata title");
    expect(items[1]!.publishedAt).toBe("2026-08-19T09:00:00.000Z");
  });

  it("parses atom entries with rel=alternate links, terms and authors", () => {
    const items = parseRssOrAtom(ATOM_FIXTURE);
    expect(items).toHaveLength(1);
    const e = items[0]!;
    expect(e.url).toBe("https://engineering.wingify.com/observability/");
    expect(e.publishedAt).toBe("2026-08-12T08:00:00.000Z");
    expect(e.authors).toEqual(["Dev K"]);
    expect(e.categories).toEqual(["devops"]);
  });

  it("throws FeedParseError on malformed xml", () => {
    expect(() => parseRssOrAtom("<not-xml")).toThrow(FeedParseError);
  });

  it("returns empty array for a feed with no items", () => {
    const empty = `<?xml version="1.0"?><rss version="2.0"><channel><title>t</title></channel></rss>`;
    expect(parseRssOrAtom(empty)).toEqual([]);
  });
});

describe("mapGhostPosts", () => {
  it("maps ghost posts, rewrites admin urls to public urls and uses plaintext for excerpt", () => {
    const items = mapGhostPosts(GHOST_FIXTURE, {
      urlRewrite: ["https://admin-v2.meesho.io/", "https://www.meesho.io/blog/"],
    });
    expect(items).toHaveLength(1);
    const p = items[0]!;
    expect(p.url).toBe("https://www.meesho.io/blog/the-350-kb-hidden-in-our-xml-layouts/");
    expect(p.publishedAt).toBe("2026-08-17T06:34:08.000Z");
    expect(p.authors).toEqual(["Ashutosh Gupta"]);
    expect(p.categories).toEqual(["android", "mobile"]);
    expect(p.excerpt).toContain("350 KB");
  });

  it("leaves urls untouched when no rewrite is provided", () => {
    const items = mapGhostPosts(GHOST_FIXTURE);
    expect(items[0]!.url).toContain("admin-v2.meesho.io");
  });
});
