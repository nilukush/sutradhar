import { handleSubscribe } from "../src/lib/subscribe-worker";

/**
 * Sutradhar Worker: serves the static site from assets and exposes the
 * subscribe API. Deployed by the Cloudflare-connected build (wrangler deploy).
 */
export default {
  async fetch(request: Request, env: Record<string, unknown> & { ASSETS: { fetch: typeof fetch } }): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/api/subscribe") {
      if (request.method !== "POST") {
        return new Response(JSON.stringify({ ok: false, error: "POST only" }), {
          status: 405,
          headers: { "Content-Type": "application/json" },
        });
      }
      return handleSubscribe(request, env);
    }

    return env.ASSETS.fetch(request);
  },
};
