import { handleSubscribe } from "../src/lib/subscribe-worker";

/**
 * Sutradhar Worker: serves the static site from assets and exposes the
 * subscribe API. Deployed by the Cloudflare-connected build (wrangler deploy).
 * run_worker_first (wrangler.jsonc) routes every request through here so the
 * http→https redirect and the security headers below also cover asset-backed
 * URLs (SEO-GEO-AUDIT B2 + P3).
 */

/** Local dev hosts reachable only over plain http — never redirect those. */
const LOCAL_HOST = /^(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/;

function isLocalHost(hostname: string): boolean {
  return LOCAL_HOST.test(hostname);
}

/**
 * Security headers applied to every response (SEO-GEO-AUDIT P3). The site is
 * near-zero-JS: one stylesheet + self-hosted fonts, an inline theme script,
 * inline JSON-LD, a same-origin subscribe fetch — plus the /search page's
 * bundled script and the pagefind index (both same-origin files).
 * frame-src whitelists the beehiiv-embed fallback provider.
 */
const SECURITY_HEADERS: Record<string, string> = {
  "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "X-Frame-Options": "SAMEORIGIN",
  "Content-Security-Policy": [
    "default-src 'none'",
    "script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval'",
    "style-src 'self' 'unsafe-inline'",
    "font-src 'self' data:",
    "img-src 'self'",
    "connect-src 'self'",
    "frame-src 'self' https://sutradhar.beehiiv.com",
    "frame-ancestors 'self'",
    "base-uri 'none'",
    "form-action 'self'",
  ].join("; "),
};

/** Add security headers and an explicit charset for HTML/text responses. */
function withSecurityHeaders(response: Response): Response {
  const headers = new Headers(response.headers);
  for (const [name, value] of Object.entries(SECURITY_HEADERS)) {
    headers.set(name, value);
  }
  const contentType = headers.get("Content-Type");
  if (contentType && /^text\/(html|plain)(;|$)/i.test(contentType) && !/charset=/i.test(contentType)) {
    headers.set("Content-Type", `${contentType}; charset=utf-8`);
  }
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

async function serveAsset(request: Request, url: URL, env: { ASSETS: { fetch: typeof fetch } }): Promise<Response> {
  try {
    return withSecurityHeaders(await env.ASSETS.fetch(request));
  } catch {
    // No matching asset: env.ASSETS.fetch() throws, which would surface as a
    // 500 (error 1101). Serve the built 404 page with the correct status
    // instead (SEO-GEO-AUDIT A1) — mirrors not_found_handling in wrangler.jsonc.
    const notFound = await env.ASSETS.fetch(new Request(`${url.origin}/404.html`));
    return withSecurityHeaders(
      new Response(notFound.body, { status: 404, headers: notFound.headers }),
    );
  }
}

/**
 * Site-verification files (Google/Bing HTML tokens) must answer 200 at their
 * literal /<token>.html URL — verification checkers reject redirects. The
 * assets layer's html_handling: drop-trailing-slash 307s top-level *.html to
 * the extensionless form, so fetch those bytes and serve them under the
 * requested URL. Nested paths are untouched (page URLs never end in .html).
 */
const TOP_LEVEL_HTML = /^\/[^/]+\.html$/;

async function serveTopLevelHtmlVerbatim(
  request: Request,
  url: URL,
  env: { ASSETS: { fetch: typeof fetch } },
): Promise<Response | null> {
  const assetUrl = new URL(url.toString());
  assetUrl.pathname = url.pathname.replace(/\.html$/, "");
  try {
    const asset = await env.ASSETS.fetch(new Request(assetUrl.toString(), request));
    if (asset.status === 200) {
      return withSecurityHeaders(
        new Response(asset.body, { status: 200, headers: asset.headers }),
      );
    }
  } catch {
    // No extensionless asset either — fall through to the standard path.
  }
  return null;
}

export default {
  async fetch(request: Request, env: Record<string, unknown> & { ASSETS: { fetch: typeof fetch } }): Promise<Response> {
    const url = new URL(request.url);

    // workers.dev has no zone-level "Always Use HTTPS" — enforce it here with a
    // permanent redirect so http and https URLs cannot split signals (B2).
    if (url.protocol === "http:" && !isLocalHost(url.hostname)) {
      url.protocol = "https:";
      return withSecurityHeaders(Response.redirect(url.toString(), 308));
    }

    if (url.pathname === "/api/subscribe") {
      if (request.method !== "POST") {
        return withSecurityHeaders(
          new Response(JSON.stringify({ ok: false, error: "POST only" }), {
            status: 405,
            headers: { "Content-Type": "application/json" },
          }),
        );
      }
      return handleSubscribe(request, env);
    }

    if ((request.method === "GET" || request.method === "HEAD") && TOP_LEVEL_HTML.test(url.pathname)) {
      const verbatim = await serveTopLevelHtmlVerbatim(request, url, env);
      if (verbatim) return verbatim;
    }

    return serveAsset(request, url, env);
  },
};
