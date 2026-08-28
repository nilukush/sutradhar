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
});
