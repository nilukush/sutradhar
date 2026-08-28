import { describe, expect, it, vi } from "vitest";
import worker from "../worker/index";

const HOST = "sutradhar.nilukush.workers.dev";

function makeEnv(assetsFetch: (req: Request) => Promise<Response> | Response) {
  return { ASSETS: { fetch: assetsFetch } };
}

describe("worker entry (serving layer)", () => {
  it("redirects plain-HTTP requests to https with 308 on the production host", async () => {
    const assets = vi.fn();
    const res = await worker.fetch(
      new Request(`http://${HOST}/articles`),
      makeEnv(assets),
    );
    expect(res.status).toBe(308);
    expect(res.headers.get("location")).toBe(`https://${HOST}/articles`);
    expect(assets).not.toHaveBeenCalled();
  });

  it("preserves path and query when redirecting to https", async () => {
    const res = await worker.fetch(
      new Request(`http://${HOST}/read/story-abc?utm=x`),
      makeEnv(vi.fn()),
    );
    expect(res.headers.get("location")).toBe(`https://${HOST}/read/story-abc?utm=x`);
  });

  it("does not redirect plain HTTP on local dev hosts", async () => {
    const page = new Response("home", { status: 200 });
    const assets = vi.fn().mockReturnValue(page);
    const res = await worker.fetch(new Request("http://localhost:8787/"), makeEnv(assets));
    expect(res.status).toBe(200);
    expect(assets).toHaveBeenCalledOnce();
  });

  it("answers non-POST /api/subscribe with 405", async () => {
    const res = await worker.fetch(new Request(`https://${HOST}/api/subscribe`), makeEnv(vi.fn()));
    expect(res.status).toBe(405);
  });

  it("passes successful asset responses through untouched", async () => {
    const page = new Response("<html>ok</html>", {
      status: 200,
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
    const assets = vi.fn().mockReturnValue(page);
    const res = await worker.fetch(new Request(`https://${HOST}/articles`), makeEnv(assets));
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("text/html; charset=utf-8");
  });

  it("serves the custom 404 page with status 404 when no asset matches", async () => {
    const assets = vi.fn((req: Request) => {
      if (new URL(req.url).pathname === "/404.html") {
        return new Response("<html>FOUR_OH_FOUR_MARKUP</html>", {
          status: 200,
          headers: { "Content-Type": "text/html" },
        });
      }
      throw new Error("no matching asset");
    });
    const res = await worker.fetch(
      new Request(`https://${HOST}/articles/999`),
      makeEnv(assets as unknown as (req: Request) => Promise<Response>),
    );
    expect(res.status).toBe(404);
    expect(await res.text()).toContain("FOUR_OH_FOUR_MARKUP");
  });

  describe("security + charset headers (audit P3)", () => {
    const REQUIRED = [
      "strict-transport-security",
      "x-content-type-options",
      "referrer-policy",
      "x-frame-options",
      "content-security-policy",
    ];

    it("adds security headers to asset responses", async () => {
      const assets = vi.fn().mockReturnValue(new Response("<html>ok</html>", { headers: { "Content-Type": "text/html" } }));
      const res = await worker.fetch(new Request(`https://${HOST}/`), makeEnv(assets));
      for (const header of REQUIRED) expect(res.headers.has(header)).toBe(true);
      expect(res.headers.get("x-content-type-options")).toBe("nosniff");
    });

    it("CSP allows same-origin script files (search page bundle + pagefind index)", async () => {
      const assets = vi.fn().mockReturnValue(new Response("<html>ok</html>", { headers: { "Content-Type": "text/html" } }));
      const res = await worker.fetch(new Request(`https://${HOST}/search`), makeEnv(assets));
      expect(res.headers.get("content-security-policy")).toContain("script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval'");
    });

    it("CSP allows data-URI fonts (@fontsource inlines small subsets as base64)", async () => {
      const assets = vi.fn().mockReturnValue(new Response("<html>ok</html>", { headers: { "Content-Type": "text/html" } }));
      const res = await worker.fetch(new Request(`https://${HOST}/`), makeEnv(assets));
      expect(res.headers.get("content-security-policy")).toContain("font-src 'self' data:");
    });

    it("appends charset=utf-8 to text/html responses missing it", async () => {
      const assets = vi.fn().mockReturnValue(new Response("<html>ok</html>", { headers: { "Content-Type": "text/html" } }));
      const res = await worker.fetch(new Request(`https://${HOST}/`), makeEnv(assets));
      expect(res.headers.get("content-type")).toBe("text/html; charset=utf-8");
    });

    it("appends charset=utf-8 to text/plain responses missing it (llms.txt)", async () => {
      const assets = vi.fn().mockReturnValue(new Response("# Sutradhar", { headers: { "Content-Type": "text/plain" } }));
      const res = await worker.fetch(new Request(`https://${HOST}/llms.txt`), makeEnv(assets));
      expect(res.headers.get("content-type")).toBe("text/plain; charset=utf-8");
    });

    it("never touches non-text content types (images)", async () => {
      const assets = vi.fn().mockReturnValue(new Response("png", { headers: { "Content-Type": "image/png" } }));
      const res = await worker.fetch(new Request(`https://${HOST}/og-default.png`), makeEnv(assets));
      expect(res.headers.get("content-type")).toBe("image/png");
    });

    it("carries security headers on the https redirect (HSTS before first secure hop)", async () => {
      const res = await worker.fetch(new Request(`http://${HOST}/`), makeEnv(vi.fn()));
      expect(res.status).toBe(308);
      expect(res.headers.get("strict-transport-security")).toContain("max-age");
    });

    it("carries security headers on 404 fallbacks", async () => {
      const assets = vi.fn((req: Request) => {
        if (new URL(req.url).pathname === "/404.html") {
          return new Response("x", { status: 200, headers: { "Content-Type": "text/html" } });
        }
        throw new Error("no matching asset");
      });
      const res = await worker.fetch(new Request(`https://${HOST}/nope`), makeEnv(assets as unknown as (req: Request) => Promise<Response>));
      expect(res.status).toBe(404);
      for (const header of REQUIRED) expect(res.headers.has(header)).toBe(true);
    });
  });
});
