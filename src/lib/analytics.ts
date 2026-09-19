/**
 * Cloudflare Web Analytics beacon (owner decision 2026-09-19: enable before the
 * first Brevo send — GSC cannot see direct, newsletter or AI-assistant traffic,
 * and unmeasured visits cannot be recovered). Free, cookieless, no consent
 * banner. The beacon token (site_tag) is public by design — it ships in every
 * page's HTML — so the production property is committed here and every build,
 * local or CI, measures the same site. CF_ANALYTICS_TOKEN still overrides
 * (set it to an empty string to disable the beacon for a build).
 */
const DEFAULT_BEACON_TOKEN = "a22bec301ebc45928d724a0129a5899e";

export interface BeaconSnippet {
  /** Script source for the <script defer> tag. */
  src: string;
  /** Serialized value for the data-cf-beacon attribute. */
  config: string;
}

export function beaconSnippet(tokenInput?: string): BeaconSnippet | null {
  const token = (tokenInput ?? process.env.CF_ANALYTICS_TOKEN ?? DEFAULT_BEACON_TOKEN).trim();
  if (!token) return null;
  return {
    src: "https://static.cloudflareinsights.com/beacon.min.js",
    config: JSON.stringify({ token }),
  };
}
