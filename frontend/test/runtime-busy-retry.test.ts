/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { afterEach, beforeEach, describe, expect, test, vi } from "vite-plus/test";
import type { SubmitRequest } from "mlform/runtime";
import { BUSY_ATTEMPTS, busyWaitMs, retryWhileBusy } from "@/shared/api/busy-retry";
import { HttpError } from "@/shared/api/http";
import { createSchemaRunTransport } from "@/capabilities/prediction-runtime/mlform/run-transport";
import type { PredictionPayloadField } from "@/capabilities/prediction-runtime/mlform/shared";

const busy = (retryAfter?: string) =>
  new Response(
    JSON.stringify({ status: 503, message: "Too many workspace runs are in progress." }),
    {
      status: 503,
      headers: {
        "Content-Type": "application/json",
        ...(retryAfter ? { "Retry-After": retryAfter } : {}),
      },
    },
  );
const ok = (body: unknown) =>
  new Response(JSON.stringify(body), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
const sealed = (modelId: number, age: unknown) => ({
  modelId,
  modelInput: { age },
  output: { reports: [] },
  status: "SUCCESS",
  errorMessage: null,
  errorJson: null,
  attestation: `seal-${modelId}-${String(age)}`,
});
const target = { bookmarkId: 7, schemaVersionId: 3 };
const fields = [{ id: "age", mappedTo: "age" }] as unknown as PredictionPayloadField[];

describe("runs wait out a busy server", () => {
  let fetchMock: ReturnType<typeof vi.fn>;
  beforeEach(() => {
    vi.useFakeTimers();
    fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  test("a refusal keeps the server's Retry-After", async () => {
    fetchMock.mockResolvedValueOnce(busy("2"));
    const { appFetch } = await import("@/shared/api/http");

    const refused = await appFetch("/api/x").catch((error: unknown) => error);

    expect(refused).toBeInstanceOf(HttpError);
    expect((refused as HttpError).retryAfterSeconds).toBe(2);
  });

  test("waits at least what Retry-After asks, longer each time, never past ten seconds", () => {
    expect(busyWaitMs(2, 1, 0)).toBe(2000);
    expect(busyWaitMs(undefined, 1, 0)).toBe(1000);
    expect(busyWaitMs(1, 3, 0)).toBe(4000);
    expect(busyWaitMs(30, 1, 1)).toBe(10_250);
  });

  test("a schema with six bound models runs although the server turns some away at first", async () => {
    const bindings = [1, 2, 3, 4, 5, 6].map((modelId) => ({ modelId, modelName: `m${modelId}` }));
    let refusals = 2;
    fetchMock.mockImplementation(async (_url: string, init: RequestInit) => {
      const { modelId } = JSON.parse(init.body as string) as { modelId: number };
      if (modelId > 4 && refusals-- > 0) return busy("1");
      return ok(sealed(modelId, 42));
    });
    const transport = createSchemaRunTransport(target, bindings, fields);

    const answered = transport.submit({
      inputs: [],
      displayValues: { age: 42 },
      modelValues: { age: 42 },
      fields: [],
      reports: [],
    } as unknown as SubmitRequest);
    await vi.advanceTimersByTimeAsync(5000);
    const raw = ((await answered) as { raw: { results: { modelId: number }[] } }).raw;

    expect(raw.results.map((result) => result.modelId)).toEqual([1, 2, 3, 4, 5, 6]);
    expect(fetchMock).toHaveBeenCalledTimes(8);
  });

  test("gives up after a bounded number of attempts with the last refusal", async () => {
    fetchMock.mockImplementation(async () => busy("1"));
    const { appFetch } = await import("@/shared/api/http");

    const attempt = retryWhileBusy(() => appFetch("/api/x")).catch((error: unknown) => error);
    await vi.advanceTimersByTimeAsync(60_000);

    expect(((await attempt) as HttpError).status).toBe(503);
    expect(fetchMock).toHaveBeenCalledTimes(BUSY_ATTEMPTS);
  });

  test("any other refusal is not retried", async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ status: 409, message: "moved" }), {
        status: 409,
        headers: { "Content-Type": "application/json" },
      }),
    );
    const { appFetch } = await import("@/shared/api/http");

    const refused = await retryWhileBusy(() => appFetch("/api/x")).catch((error: unknown) => error);

    expect((refused as HttpError).status).toBe(409);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  test("an abort ends the wait at once", async () => {
    fetchMock.mockImplementation(async () => busy("5"));
    const { appFetch } = await import("@/shared/api/http");
    const controller = new AbortController();

    const attempt = retryWhileBusy(() => appFetch("/api/x"), controller.signal).catch(
      (error: unknown) => error,
    );
    await vi.advanceTimersByTimeAsync(100);
    controller.abort(new DOMException("Stopped", "AbortError"));

    expect(((await attempt) as DOMException).name).toBe("AbortError");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
