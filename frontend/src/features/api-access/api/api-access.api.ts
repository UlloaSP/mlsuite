/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { appFetch, json } from "@/shared/api/http";
import type {
  ApiAccessBookmarkDto,
  ApiClientDto,
  ApiUsageDto,
  CreateApiClientKeyRequest,
  CreateApiClientRequest,
  IssuedApiClientKeyDto,
  ModelDto,
  PageDtoApiClientSummaryDto,
  PageDtoApiRequestDto,
  UpdateApiClientRequest,
} from "@/shared/api/openapi.gen";

export type UsagePeriod = "day" | "week" | "month";

export type CatalogPageRequest = {
  page: number;
  size: number;
  search: string;
  filter: string;
  sort?: string;
};

const params = (values: Record<string, string | number | undefined>) =>
  new URLSearchParams(
    Object.entries(values)
      .filter((entry): entry is [string, string | number] => entry[1] !== undefined)
      .map(([key, value]) => [key, String(value)]),
  ).toString();

const clientPath = (clientId: number | string) =>
  `/api/api-clients/${encodeURIComponent(clientId)}`;

export const listApiClients = (
  { page, size, search, filter, sort }: CatalogPageRequest,
  signal?: AbortSignal,
): Promise<PageDtoApiClientSummaryDto> =>
  appFetch(`/api/api-clients?${params({ page, size, search, filter, sort })}`, { signal });

export const getApiClient = (
  clientId: number | string,
  signal?: AbortSignal,
): Promise<ApiClientDto> => appFetch(clientPath(clientId), { signal });

export const createApiClient = (req: CreateApiClientRequest): Promise<ApiClientDto> =>
  appFetch("/api/api-clients", json("POST", req));

export const updateApiClient = (
  clientId: number | string,
  req: UpdateApiClientRequest,
): Promise<ApiClientDto> => appFetch(clientPath(clientId), json("PATCH", req));

/** Its keys stop working at once; its calls stay in the request log under its name. */
export const deleteApiClient = (clientId: number | string): Promise<void> =>
  appFetch(clientPath(clientId), { method: "DELETE" });

/** The only response that carries the key's secret; the API never shows it again. */
export const issueApiClientKey = (
  clientId: number | string,
  req: CreateApiClientKeyRequest,
): Promise<IssuedApiClientKeyDto> => appFetch(`${clientPath(clientId)}/keys`, json("POST", req));

export const revokeApiClientKey = (clientId: number | string, keyId: number): Promise<void> =>
  appFetch(`${clientPath(clientId)}/keys/${keyId}`, { method: "DELETE" });

export const grantApiClientBookmark = (
  clientId: number | string,
  bookmarkId: number,
): Promise<ApiClientDto> =>
  appFetch(`${clientPath(clientId)}/bookmarks/${bookmarkId}`, { method: "PUT" });

export const revokeApiClientBookmark = (
  clientId: number | string,
  bookmarkId: number,
): Promise<ApiClientDto> =>
  appFetch(`${clientPath(clientId)}/bookmarks/${bookmarkId}`, { method: "DELETE" });

/** Every bookmark of the organization whose schema is not archived, as clients see it. */
export const listApiAccessBookmarks = (signal?: AbortSignal): Promise<ApiAccessBookmarkDto[]> =>
  appFetch("/api/api-access/bookmarks", { signal });

export const listApiRequests = (
  { page, size, search, filter }: CatalogPageRequest,
  clientId: number | undefined,
  signal?: AbortSignal,
): Promise<PageDtoApiRequestDto> =>
  appFetch(`/api/api-access/requests?${params({ page, size, search, filter, clientId })}`, {
    signal,
  });

export const getApiUsage = (
  period: UsagePeriod,
  clientId: number | undefined,
  signal?: AbortSignal,
): Promise<ApiUsageDto> =>
  appFetch(`/api/api-access/usage?${params({ period, clientId })}`, { signal });

/** The model a bookmark runs, read for its signature when documenting the bookmark's endpoint. */
export const getDocumentedModel = (modelId: number, signal?: AbortSignal): Promise<ModelDto> =>
  appFetch(`/api/models/${modelId}`, { signal });
