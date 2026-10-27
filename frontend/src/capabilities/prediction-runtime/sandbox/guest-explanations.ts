/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import type { SandboxChannel } from "./sandbox-channel";
import type { AppEvents, AppMethods } from "./sandbox-protocol";

const EXPLANATIONS_PATH = "/api/analyzer/explanations";

const refused = (reason: string) => new TypeError(`Failed to fetch: ${reason}`);

/**
 * The `fetch` a run form's reports get, which makes the one request they may make: an explanation of one of the run's
 * predictions (`POST /api/analyzer/explanations?modelId=…`, as a Crystal Tree report asks for
 * one), which the app makes for a model the form runs and answers with the API's response. Any
 * other request fails as a network error does; the sandbox's CSP allows no connection at all.
 */
export const explanationFetch = (
  app: SandboxChannel<AppMethods, AppEvents>,
  backendUrl: string,
): typeof fetch => {
  const origins = new Set([
    new URL(location.href).origin,
    new URL(backendUrl, location.href).origin,
  ]);
  return async (input, init) => {
    const request = new Request(input, init);
    const url = new URL(request.url);
    const modelId = Number(url.searchParams.get("modelId"));
    if (
      !origins.has(url.origin) ||
      url.pathname !== EXPLANATIONS_PATH ||
      request.method !== "POST" ||
      !Number.isInteger(modelId)
    ) {
      throw refused("plugins have no network access.");
    }
    let body: unknown;
    try {
      body = JSON.parse(await request.text());
    } catch {
      throw refused("an explanation request needs a JSON body.");
    }
    const answer = await app
      .request("explain", { modelId, body: body as { instance: Record<string, unknown> } })
      .catch((error: unknown) => {
        throw refused(error instanceof Error ? error.message : String(error));
      });
    const text = typeof answer.body === "string";
    return new Response(text ? (answer.body as string) : JSON.stringify(answer.body), {
      status: answer.status,
      headers: { "content-type": text ? "text/plain" : "application/json" },
    });
  };
};
