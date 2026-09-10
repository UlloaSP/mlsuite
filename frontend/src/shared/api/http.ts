/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { getBackendBaseUrl } from "@/shared/config/runtime";

export type ErrorDto = {
  timestamp: string;
  status: number;
  message: string;
  path: string;
};

export class HttpError extends Error {
  readonly dto: ErrorDto;

  constructor(dto: ErrorDto) {
    super(dto.message);
    this.name = "HttpError";
    this.dto = dto;
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
const toUrl = (path: string) => new URL(path, getBackendBaseUrl()).toString();
const isJson = (response: Response) =>
  response.headers.get("content-type")?.includes("application/json") ?? false;
const nowIso = () => new Date().toISOString();

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
    if (isJson(response)) throw new HttpError((await response.json()) as ErrorDto);
    throw new HttpError(responseError(response, path, response.statusText || "Request error"));
  } catch (error) {
    if (isHttpError(error)) throw error;
    if (init?.signal?.aborted) throw error;
    throw new HttpError(networkError(path));
  }
}
