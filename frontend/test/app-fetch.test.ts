/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { afterEach, beforeEach, describe, expect, test, vi } from "vite-plus/test";
import { appFetch, HttpError } from "@/shared/api/http";

describe("appFetch reads every response it is given to the end", () => {
  let fetchMock: ReturnType<typeof vi.fn>;
  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
  });
  afterEach(() => vi.unstubAllGlobals());

  test("a JSON answer is its parsed body", async () => {
    const response = new Response(JSON.stringify({ id: 4 }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
    fetchMock.mockResolvedValue(response);

    await expect(appFetch("/api/models/4")).resolves.toEqual({ id: 4 });
    expect(response.bodyUsed).toBe(true);
  });

  test.each([
    ["an empty 201", ""],
    ["a text 200", "created"],
  ])("%s is read to the end, so the request finishes, and answers nothing", async (_, body) => {
    const response = new Response(body, { status: body ? 200 : 201 });
    fetchMock.mockResolvedValue(response);

    await expect(appFetch("/api/schema-reviews", { method: "POST" })).resolves.toBeUndefined();
    expect(response.bodyUsed).toBe(true);
  });

  test("a 204 has no body and answers nothing", async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 204 }));

    await expect(appFetch("/api/models/4", { method: "DELETE" })).resolves.toBeUndefined();
  });

  test("a non-JSON body that fails to arrive after a success still answers the success", async () => {
    const response = new Response("ok", { status: 201 });
    vi.spyOn(response, "arrayBuffer").mockRejectedValue(new TypeError("network"));
    fetchMock.mockResolvedValue(response);

    await expect(appFetch("/api/schema-reviews", { method: "POST" })).resolves.toBeUndefined();
  });

  test("a non-JSON error is read to the end and told by its status text", async () => {
    const response = new Response("<html>Bad gateway</html>", {
      status: 502,
      statusText: "Bad Gateway",
    });
    fetchMock.mockResolvedValue(response);

    const error = await appFetch("/api/models").catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(HttpError);
    expect((error as HttpError).status).toBe(502);
    expect((error as HttpError).message).toBe("Bad Gateway");
    expect(response.bodyUsed).toBe(true);
  });
});
