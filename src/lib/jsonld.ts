/**
 * JSON-LD payload serialization for inline <script type="application/ld+json">
 * blocks. < and > are escaped so feed-sourced text (article titles, authors)
 * can never terminate the script block early — every JSON-LD emitter must go
 * through this, not raw JSON.stringify (SEO-GEO-AUDIT B3).
 */
export function safeJsonLd(object: Record<string, unknown>): string {
  return JSON.stringify(object)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e");
}
