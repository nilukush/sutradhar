import { describe, expect, it } from "vitest";
import { safeJsonLd } from "@/lib/jsonld";

describe("safeJsonLd (JSON-LD script-block serialization)", () => {
  it("serializes a plain object unchanged", () => {
    expect(safeJsonLd({ "@type": "WebSite", name: "Sutradhar" })).toBe(
      '{"@type":"WebSite","name":"Sutradhar"}',
    );
  });

  it("escapes < and > so feed-sourced text can never break out of the script block", () => {
    const out = safeJsonLd({ "@type": "NewsArticle", headline: "a < b > c" });
    expect(out).not.toContain("<");
    expect(out).not.toContain(">");
    expect(out).toContain("\\u003c");
    expect(out).toContain("\\u003e");
  });

  it("keeps a </script> inside a headline inert (Breadcrumbs regression, audit B3)", () => {
    const hostile = { name: `</script><script>alert(1)</script>` };
    const out = safeJsonLd(hostile);
    expect(out).not.toContain("</script>");
    // The escaped payload still parses back to the original value.
    expect(JSON.parse(out)).toEqual(hostile);
  });

  it("round-trips any payload through JSON.parse after escaping", () => {
    const payload = { headline: "<div>ok</div>", items: [{ n: 1, t: "a>b" }] };
    expect(JSON.parse(safeJsonLd(payload))).toEqual(payload);
  });
});
