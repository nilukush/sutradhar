import { createHash } from "node:crypto";

const TRACKER_PARAMS = new Set([
  "fbclid",
  "gclid",
  "igshid",
  "mc_cid",
  "mc_eid",
  "ref",
  "ref_src",
  "ref_url",
  "sr_share",
  "spm",
]);

const NAMED_ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
  hellip: "…",
  mdash: "—",
  ndash: "–",
  rsquo: "’",
  lsquo: "‘",
  rdquo: "”",
  ldquo: "“",
};

function isTracker(param: string, value: string, host: string): boolean {
  if (param.startsWith("utm_")) return true;
  if (TRACKER_PARAMS.has(param)) return true;
  // Medium (and its custom domains) decorate feed links with ?source=rss-<uuid>
  if (param === "source" && (/^rss/i.test(value) || host.endsWith("medium.com"))) return true;
  return false;
}

/**
 * Canonical article URL: lowercase host, no hash, no tracker params,
 * no trailing slash, no /amp suffix. Path case is preserved (URLs are
 * case-sensitive past the host).
 */
export function canonicalUrl(raw: string): string {
  const url = new URL(raw);
  url.hash = "";
  const host = url.hostname.toLowerCase();
  const keep: [string, string][] = [];
  for (const [k, v] of url.searchParams.entries()) {
    if (!isTracker(k, v, host)) keep.push([k, v]);
  }
  url.search = "";
  for (const [k, v] of keep) url.searchParams.append(k, v);

  let path = url.pathname;
  if (path.length > 1) {
    path = path.replace(/\/+$/, "");
    path = path.replace(/\/amp$/, "");
    path = path.replace(/\/+$/, "");
    if (path === "") path = "/";
  }
  url.pathname = path;
  return url.toString();
}

/** Kebab-case slug; strips diacritics, drops non-latin scripts to "". */
export function slugify(input: string): string {
  return input
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** HTML fragment → readable single-line text. */
export function htmlToText(html: string): string {
  if (!html) return "";
  return html
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<\/(p|div|li|h[1-6]|tr)>|<br\s*\/?>/gi, " ")
    .replace(/<[^>]*>/g, "")
    .replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (match, entity: string) => {
      const e = entity.toLowerCase();
      if (e.startsWith("#x")) {
        const code = parseInt(e.slice(2), 16);
        return Number.isNaN(code) ? match : String.fromCodePoint(code);
      }
      if (e.startsWith("#")) {
        const code = parseInt(e.slice(1), 10);
        return Number.isNaN(code) ? match : String.fromCodePoint(code);
      }
      return NAMED_ENTITIES[e] ?? match;
    })
    .replace(/\s+/g, " ")
    .trim();
}

/** Word-boundary-aware truncation with an ellipsis. */
export function excerptFrom(text: string, max = 280): string {
  const clean = text.trim();
  if (clean.length <= max) return clean;
  const slice = clean.slice(0, max);
  const lastSpace = slice.lastIndexOf(" ");
  return (lastSpace > max * 0.6 ? slice.slice(0, lastSpace) : slice).trimEnd() + "…";
}

/** Stable 16-hex-char article id — hashes the canonical form, so tracker-decorated variants collide to one id. */
export function articleId(rawUrl: string): string {
  return createHash("sha256").update(canonicalUrl(rawUrl)).digest("hex").slice(0, 16);
}
