/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test";
import { appFetch, HttpError } from "./appFetch";

describe("tenant fetch contract", () => {
  const fetchMock = vi.fn<typeof fetch>();
  const storage = new Map<string, string>();
  const localStorage = {
    getItem: (key: string) => storage.get(key) ?? null,
    setItem: (key: string, value: string) => void storage.set(key, value),
    removeItem: (key: string) => void storage.delete(key),
    clear: () => storage.clear(),
  };

  beforeEach(() => {
    vi.stubGlobal("fetch", fetchMock);
    vi.stubGlobal("window", { localStorage });
    localStorage.clear();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    localStorage.clear();
  });

  it("sends organization header when tenant slug is present", async () => {
    localStorage.setItem("mlsuite.activeOrganizationSlug", "acme");
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    const result = await appFetch<{ ok: boolean }>("/api/user/profile");
    const [path, init] = fetchMock.mock.calls[0] ?? [];
    const headers = new Headers((init as RequestInit | undefined)?.headers);

    expect(result.ok).toBe(true);
    expect(path).toContain("/api/user/profile");
    expect(headers.get("X-Organization-Slug")).toBe("acme");
  });

  it("clears stale tenant slug on organization access failure", async () => {
    localStorage.setItem("mlsuite.activeOrganizationSlug", "ghost");
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          timestamp: "2026-04-27T00:00:00Z",
          status: 403,
          message: "User does not have access to organization 'ghost'",
          path: "/api/user/profile",
        }),
        {
          status: 403,
          headers: { "Content-Type": "application/json" },
        },
      ),
    );

    await expect(appFetch("/api/user/profile")).rejects.toBeInstanceOf(HttpError);
    expect(localStorage.getItem("mlsuite.activeOrganizationSlug")).toBeNull();
  });
});
