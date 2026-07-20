import { QueryClient } from "@tanstack/react-query";
import { afterEach, describe, expect, test, vi } from "vite-plus/test";
import { appFetch, HttpError } from "@/api/core/services/app-fetch";
import { schemaReviewLinksQueryOptions } from "@/api/review/review-queries";
import { searchQueryOptions } from "@/api/search/search-queries";
import { organizationTeamsQueryOptions } from "@/api/workspace/workspace-queries";

const { getTeams } = vi.hoisted(() => ({ getTeams: vi.fn() }));

vi.mock("@/api/workspace/services", () => ({ getTeams }));

const client = () => new QueryClient({ defaultOptions: { queries: { retry: false } } });

afterEach(() => {
  getTeams.mockReset();
  vi.unstubAllGlobals();
});

describe("TanStack Query resource contracts", () => {
  test("scopes tenant resources and every query variable", () => {
    expect(organizationTeamsQueryOptions(7).queryKey).toEqual(["org", 7, "teams"]);
    expect(organizationTeamsQueryOptions(8).queryKey).not.toEqual(
      organizationTeamsQueryOptions(7).queryKey,
    );
    expect(searchQueryOptions(7, "risk").queryKey).toEqual(["org", 7, "search", "risk"]);
    expect(schemaReviewLinksQueryOptions(7, "schema-1", "version-2").queryKey).toEqual([
      "org",
      7,
      "schemaReviewLinks",
      { schemaId: "schema-1", versionId: "version-2" },
    ]);
  });

  test("fetches through reusable options and propagates Query cancellation signal", async () => {
    getTeams.mockResolvedValue([{ id: 3, name: "Risk" }]);

    await expect(client().fetchQuery(organizationTeamsQueryOptions(7))).resolves.toEqual([
      { id: 3, name: "Risk" },
    ]);

    expect(getTeams).toHaveBeenCalledWith(7, expect.any(AbortSignal));
  });

  test("preserves query failures", async () => {
    const failure = new Error("teams unavailable");
    getTeams.mockRejectedValue(failure);

    await expect(client().fetchQuery(organizationTeamsQueryOptions(7))).rejects.toBe(failure);
  });

  test("keeps typed HTTP failures", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            timestamp: "2026-07-20T00:00:00.000Z",
            status: 403,
            message: "Denied",
            path: "/api/test",
          }),
          { status: 403, headers: { "content-type": "application/json" } },
        ),
      ),
    );

    const request = appFetch("/api/test");
    await expect(request).rejects.toBeInstanceOf(HttpError);
    await expect(request).rejects.toMatchObject({ status: 403 });
  });

  test("converts network failures to typed errors", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));

    const request = appFetch("/api/test");
    await expect(request).rejects.toBeInstanceOf(HttpError);
    await expect(request).rejects.toMatchObject({ status: 0 });
  });

  test("does not disguise cancellation as a network failure", async () => {
    const controller = new AbortController();
    const cancellation = new DOMException("cancelled", "AbortError");
    controller.abort(cancellation);
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(cancellation));

    await expect(appFetch("/api/test", { signal: controller.signal })).rejects.toBe(cancellation);
  });
});
