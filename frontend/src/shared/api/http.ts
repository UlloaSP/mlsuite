/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import type { ErrorDto } from "@/shared/api/openapi.gen";
import { getBackendBaseUrl } from "@/shared/config/runtime";

export class HttpError extends Error {
  readonly dto: ErrorDto;
  /** How long the server asked the client to wait before retrying, when it said (Retry-After). */
  readonly retryAfterSeconds: number | undefined;

  constructor(dto: ErrorDto, retryAfterSeconds?: number) {
    super(dto.message);
    this.name = "HttpError";
    this.dto = dto;
    this.retryAfterSeconds = retryAfterSeconds;
  }

  get status() {
    return this.dto.status;
  }

  get timestamp() {
    return this.dto.timestamp;
  }

  get path() {
    return this.dto.path;
  }
}

export const isHttpError = (error: unknown): error is HttpError => error instanceof HttpError;

export const json = (method: string, body?: unknown): RequestInit => ({
  method,
  headers: { "Content-Type": "application/json" },
  body: body === undefined ? undefined : JSON.stringify(body),
});

const buildInit = (init?: RequestInit): RequestInit => ({
  credentials: "include",
  ...init,
  headers: new Headers(init?.headers),
});
/** An API path as a browser can fetch it, for `src` and `href` attributes. */
export const apiUrl = (path: string) => new URL(path, getBackendBaseUrl()).toString();
const toUrl = apiUrl;
const isJson = (response: Response) =>
  response.headers.get("content-type")?.includes("application/json") ?? false;
const nowIso = () => new Date().toISOString();

/** Retry-After in whole seconds; the date form is not sent by this API and reads as unsaid. */
const retryAfter = (response: Response) => {
  const value = response.headers.get("Retry-After");
  return value !== null && /^\d+$/.test(value.trim()) ? Number(value) : undefined;
};

function responseError(response: Response, path: string, message: string): ErrorDto {
  return {
    timestamp: nowIso(),
    status: response.status,
    message,
    path: new URL(path, getBackendBaseUrl()).pathname,
  };
}

function networkError(path: string): ErrorDto {
  return {
    timestamp: nowIso(),
    status: 0,
    message: "Network Error",
    path: new URL(path, getBackendBaseUrl()).pathname,
  };
}

export async function appFetch<T = unknown>(path: string, init?: RequestInit): Promise<T> {
  try {
    const response = await fetch(toUrl(path), buildInit(init));
    if (response.ok) {
      if (response.status === 204) return undefined as T;
      if (isJson(response)) return (await response.json()) as T;
      return undefined as T;
    }
    if (isJson(response))
      throw new HttpError((await response.json()) as ErrorDto, retryAfter(response));
    throw new HttpError(
      responseError(response, path, response.statusText || "Request error"),
      retryAfter(response),
    );
  } catch (error) {
    if (isHttpError(error)) throw error;
    if (init?.signal?.aborted) throw error;
    throw new HttpError(networkError(path));
  }
}
