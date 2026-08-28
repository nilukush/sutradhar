import { describe, expect, it, vi } from "vitest";
import { handleSubscribe } from "@/lib/subscribe-worker";

const KEY = "xkeysib-test-key";

function makeEnv(overrides: Record<string, unknown> = {}) {
  return { BREVO_API_KEY: KEY, OWNER_EMAIL: "owner@example.in", ...overrides };
}

function makeRequest(body: unknown) {
  return new Request("https://sutradhar.nilukush.workers.dev/api/subscribe", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

function jsonResponse(body: unknown, status: number) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

describe("handleSubscribe (inline capture → Brevo)", () => {
  it("adds the contact to the resolved list and notifies the owner", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ lists: [{ id: 7, name: "Sutradhar" }] }, 200)) // list lookup
      .mockResolvedValueOnce(jsonResponse({ id: 42 }, 201)) // add contact
      .mockResolvedValueOnce(jsonResponse({ messageId: "x" }, 201)); // notify
    const res = await handleSubscribe(makeRequest({ email: "dev@example.in" }), makeEnv(), fetchImpl);

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });

    const listCall = fetchImpl.mock.calls[0]!;
    expect(String(listCall[0])).toBe("https://api.brevo.com/v3/contacts/lists?limit=50&offset=0");
    expect(listCall[1].headers["api-key"]).toBe(KEY);

    const contactCall = fetchImpl.mock.calls[1]!;
    expect(String(contactCall[0])).toBe("https://api.brevo.com/v3/contacts");
    const payload = JSON.parse(contactCall[1].body);
    expect(payload.email).toBe("dev@example.in");
    expect(payload.updateEnabled).toBe(true);
    expect(payload.listIds).toEqual([7]);

    const notifyCall = fetchImpl.mock.calls[2]!;
    expect(String(notifyCall[0])).toBe("https://api.brevo.com/v3/smtp/email");
    expect(JSON.parse(notifyCall[1].body).subject).toContain("dev@example.in");
  });

  it("creates folder + list when the list does not exist yet", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ lists: [{ id: 1, name: "Other" }] }, 200))
      .mockResolvedValueOnce(jsonResponse({ folders: [{ id: 3, name: "Sutradhar" }] }, 200)) // folder lookup
      .mockResolvedValueOnce(jsonResponse({ id: 99 }, 201)) // create list (with folderId)
      .mockResolvedValueOnce(jsonResponse({ id: 42 }, 201)) // add contact
      .mockResolvedValueOnce(jsonResponse({}, 201)); // notify
    const res = await handleSubscribe(makeRequest({ email: "a@b.co" }), makeEnv(), fetchImpl);
    expect(res.status).toBe(200);
    const createListCall = fetchImpl.mock.calls[2]!;
    expect(String(createListCall[0])).toBe("https://api.brevo.com/v3/contacts/lists");
    expect(JSON.parse(createListCall[1].body)).toEqual({ name: "Sutradhar", folderId: 3 });
  });

  it("creates the folder too when no matching folder exists", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ lists: [] }, 200))
      .mockResolvedValueOnce(jsonResponse({ folders: [] }, 200))
      .mockResolvedValueOnce(jsonResponse({ id: 5 }, 201)) // create folder
      .mockResolvedValueOnce(jsonResponse({ id: 99 }, 201)) // create list
      .mockResolvedValueOnce(jsonResponse({ id: 42 }, 201)) // add contact
      .mockResolvedValueOnce(jsonResponse({}, 201)); // notify
    const res = await handleSubscribe(makeRequest({ email: "a@b.co" }), makeEnv(), fetchImpl);
    expect(res.status).toBe(200);
    const createFolderCall = fetchImpl.mock.calls[2]!;
    expect(String(createFolderCall[0])).toBe("https://api.brevo.com/v3/contacts/folders");
  });

  it("still succeeds when the owner notification fails (notify is best-effort)", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ lists: [{ id: 7, name: "Sutradhar" }] }, 200))
      .mockResolvedValueOnce(jsonResponse({ id: 42 }, 201))
      .mockResolvedValueOnce(new Response("boom", { status: 500 }));
    const res = await handleSubscribe(makeRequest({ email: "a@b.co" }), makeEnv(), fetchImpl);
    expect(res.status).toBe(200);
  });

  it("skips the notification entirely when OWNER_EMAIL is unset", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ lists: [{ id: 7, name: "Sutradhar" }] }, 200))
      .mockResolvedValueOnce(jsonResponse({ id: 42 }, 201));
    const res = await handleSubscribe(makeRequest({ email: "a@b.co" }), makeEnv({ OWNER_EMAIL: undefined }), fetchImpl);
    expect(res.status).toBe(200);
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it("rejects malformed emails with 400 and never calls the API", async () => {
    const fetchImpl = vi.fn();
    expect((await handleSubscribe(makeRequest({ email: "nope" }), makeEnv(), fetchImpl)).status).toBe(400);
    expect((await handleSubscribe(makeRequest("{}broken"), makeEnv(), fetchImpl)).status).toBe(400);
    expect((await handleSubscribe(makeRequest({ email: `${"x".repeat(300)}@b.co` }), makeEnv(), fetchImpl)).status).toBe(400);
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("returns 503 without touching Brevo when the API key is not configured", async () => {
    const fetchImpl = vi.fn();
    const res = await handleSubscribe(makeRequest({ email: "a@b.co" }), makeEnv({ BREVO_API_KEY: undefined }), fetchImpl);
    expect(res.status).toBe(503);
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("maps upstream failures to 502 and never leaks the API key", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ lists: [{ id: 7, name: "Sutradhar" }] }, 200))
      .mockResolvedValueOnce(new Response("denied", { status: 401 }));
    const res = await handleSubscribe(makeRequest({ email: "a@b.co" }), makeEnv(), fetchImpl);
    expect(res.status).toBe(502);
    const body = await res.json();
    expect(JSON.stringify(body)).not.toContain(KEY);
  });
});
