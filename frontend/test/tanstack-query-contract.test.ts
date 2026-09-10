import { QueryClient } from "@tanstack/react-query";
import { afterEach, describe, expect, test, vi } from "vite-plus/test";
import { appFetch, HttpError } from "@/shared/api/http";
import { eligibleReviewersQueryOptions } from "@/capabilities/review-creation/review-creation-api";
import { searchQueryOptions } from "@/features/search/api/search.queries";
import { predictionRunsFeedbackQueryOptions } from "@/features/schemas/api/schema-queries";
import { pluginRuntimeSourcesQueryOptions } from "@/capabilities/prediction-runtime/plugins/plugin-runtime-sources";

const { getPredictionRunsFeedback } = vi.hoisted(() => ({
  getPredictionRunsFeedback: vi.fn(),
}));

vi.mock("@/features/schemas/api/schema-prediction-api", () => ({ getPredictionRunsFeedback }));

const client = () => new QueryClient({ defaultOptions: { queries: { retry: false } } });

afterEach(() => {
  getPredictionRunsFeedback.mockReset();
  vi.unstubAllGlobals();
});

describe("TanStack Query resource contracts", () => {
  test("scopes tenant resources and every query variable", () => {
    expect(searchQueryOptions(7, "risk").queryKey).toEqual(["org", 7, "search", "risk"]);
    expect(eligibleReviewersQueryOptions(7).queryKey).toEqual([
      "org",
      7,
      "schemaReviews",
      "eligibleReviewers",
    ]);
  });

  test("batches run feedback with one normalized tenant query", async () => {
    getPredictionRunsFeedback.mockResolvedValue([{ id: "feedback-1" }]);
    const options = predictionRunsFeedbackQueryOptions(7, ["run-2", "run-1", "run-2"]);

    await expect(client().fetchQuery(options)).resolves.toEqual([{ id: "feedback-1" }]);

    expect(options.queryKey).toEqual([
      "org",
      7,
      "predictionFeedback",
      "runs",
      { runIds: ["run-1", "run-2"] },
    ]);
    expect(getPredictionRunsFeedback).toHaveBeenCalledOnce();
    expect(getPredictionRunsFeedback).toHaveBeenCalledWith(
      ["run-1", "run-2"],
      expect.any(AbortSignal),
    );
  });

  test("normalizes numeric run ids before batching feedback", async () => {
    getPredictionRunsFeedback.mockResolvedValue([]);
    const options = predictionRunsFeedbackQueryOptions(7, [2, 1, 2]);

    await client().fetchQuery(options);

    expect(options.queryKey).toEqual([
      "org",
      7,
      "predictionFeedback",
      "runs",
      { runIds: ["1", "2"] },
    ]);
    expect(getPredictionRunsFeedback).toHaveBeenCalledWith(["1", "2"], expect.any(AbortSignal));
  });

  test("lets Query own tenant plugin sources and forwards cancellation", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify([{ id: "plugin-1" }]), {
        headers: { "content-type": "application/json" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);
    const options = pluginRuntimeSourcesQueryOptions(7);

    await expect(client().fetchQuery(options)).resolves.toEqual([{ id: "plugin-1" }]);

    expect(options.queryKey).toEqual(["org", 7, "pluginRuntimeSources"]);
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/api/plugins/runtime"),
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
  });

  test("preserves query failures", async () => {
    const failure = new Error("feedback unavailable");
    getPredictionRunsFeedback.mockRejectedValue(failure);

    await expect(client().fetchQuery(predictionRunsFeedbackQueryOptions(7, [1]))).rejects.toBe(
      failure,
    );
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
