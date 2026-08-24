import { SITE } from "@/lib/site";

/**
 * The single switch point for the newsletter subscribe flow. Swapping providers
 * is a config change here (plus, for embed providers, pasting embed markup into
 * the SubscribeForm slot) — never a component rewrite.
 *
 * Default: "github-issue" — a plain GET <form> to GitHub's new-issue page
 * (template=subscribe.yml). Zero backend, zero signup, zero JS; perfect for a
 * dev audience and a public repo. When the real repo URL is configured in
 * src/lib/site.ts, the form lights up automatically.
 */
export type SubscribeProvider =
  | "github-issue"
  | "beehiiv-hosted"
  | "mailto";

export interface SubscribeOverride {
  provider?: SubscribeProvider;
  /** e.g. https://www.beehiiv.com/subscribe/<publication> */
  beehiivUrl?: string;
}

export interface SubscribeOptions {
  provider: SubscribeProvider;
  /** "get" = no-JS form to GitHub; "link" = plain anchor; */
  method: "get" | "link";
  /** Form action (github-issue) or link href (beehiiv-hosted). */
  action?: string;
  href?: string;
  fields: { title: string; labels: string };
  fallbacks: { rss: string };
}

/** True once SITE.repoUrl points at a real repo (not the TODO placeholder). */
export function isRepoConfigured(repoUrl: string = SITE.repoUrl): boolean {
  return (
    /^https:\/\/github\.com\/[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repoUrl) &&
    !repoUrl.includes("TODO-OWNER")
  );
}

export function subscribeOptions(override: SubscribeOverride = {}): SubscribeOptions {
  const provider = override.provider ?? "github-issue";
  const fallbacks = { rss: "/rss.xml" };

  if (provider === "beehiiv-hosted") {
    return {
      provider,
      method: "link",
      href: override.beehiivUrl ?? "",
      fields: { title: "", labels: "" },
      fallbacks,
    };
  }

  // github-issue: GET form → GitHub's new-issue page, pre-filled via query
  // params (title/body/labels). Classic prefills work without any JS or backend.
  const base = SITE.repoUrl.replace(/\/+$/, "");
  return {
    provider: "github-issue",
    method: "get",
    action: `${base}/issues/new`,
    fields: { title: "Subscribe request", labels: "subscribe" },
    fallbacks,
  };
}

export function subscribeAction() {
  const options = subscribeOptions();
  return {
    /** Body pre-fill for the GitHub issue (carries the entered email). */
    buildBody(email: string): string {
      return [
        "Subscribe request",
        "",
        `Email: ${email.trim()}`,
        "",
        `(Sent from ${SITE.url}/newsletter — please keep this issue as the subscription record.)`,
      ].join("\n");
    },
    ...options,
  };
}
