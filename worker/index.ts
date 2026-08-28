import { handleSubscribe } from "../src/lib/subscribe-worker";

/**
 * Sutradhar Worker: serves the static site from assets and exposes the
 * subscribe API. Deployed by the Cloudflare-connected build (wrangler deploy).
 * run_worker_first (wrangler.jsonc) routes every request through here so the
 * http→https redirect below also covers asset-backed URLs (SEO-GEO-AUDIT B2).
 */

/** Local dev hosts reachable only over plain http — never redirect those. */
const LOCAL_HOST = /^(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/;

function isLocalHost(hostname: string): boolean {
  return LOCAL_HOST.test(hostname);
}

async function serveAsset(request: Request, url: URL, env: { ASSETS: { fetch: typeof fetch } }): Promise<Response> {
  try {
    return await env.ASSETS.fetch(request);
  } catch {
    // No matching asset: env.ASSETS.fetch() throws, which would surface as a
    // 500 (error 1101). Serve the built 404 page with the correct status
    // instead (SEO-GEO-AUDIT A1) — mirrors not_found_handling in wrangler.jsonc.
    const notFound = await env.ASSETS.fetch(new Request(`${url.origin}/404.html`));
    return new Response(notFound.body, { status: 404, headers: notFound.headers });
  }
}

export default {
  async fetch(request: Request, env: Record<string, unknown> & { ASSETS: { fetch: typeof fetch } }): Promise<Response> {
    const url = new URL(request.url);

    // workers.dev has no zone-level "Always Use HTTPS" — enforce it here with a
    // permanent redirect so http and https URLs cannot split signals (B2).
    if (url.protocol === "http:" && !isLocalHost(url.hostname)) {
      url.protocol = "https:";
      return Response.redirect(url.toString(), 308);
    }

    if (url.pathname === "/api/subscribe") {
      if (request.method !== "POST") {
        return new Response(JSON.stringify({ ok: false, error: "POST only" }), {
          status: 405,
          headers: { "Content-Type": "application/json" },
        });
      }
      return handleSubscribe(request, env);
    }

    return serveAsset(request, url, env);
  },
};
