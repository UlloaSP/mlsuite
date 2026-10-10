/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { getCatalogDefinitions } from "@/capabilities/prediction-runtime/plugins/plugin-catalog";
import type { PluginRuntimeSourceDto } from "@/shared/api/openapi.gen";
import { queryOptions } from "@tanstack/react-query";
import { appFetch, isHttpError, json } from "@/shared/api/http";
import { organizationQueryKey } from "@/shared/api/organization-query-key";
import { useInfiniteCatalog } from "@/shared/api/infinite-catalog";
import type {
  PageDtoPublicBookmarkSummaryDto,
  PublicBookmarkDto,
  PublicPredictionDto,
  PublicPredictionRequest,
  PublicRunDto,
  PublicRunFeedbackRequest,
  PublicRunQuotaDto,
  SchemaBookmarkDto,
} from "@/shared/api/openapi.gen";

export const PUBLIC_BOOKMARK_PAGE_SIZE = 24;

const getPublicBookmarkPage = (
  page: number,
  search: string,
  sort: string,
  signal?: AbortSignal,
): Promise<PageDtoPublicBookmarkSummaryDto> => {
  const params = new URLSearchParams({
    page: String(page),
    search,
    size: String(PUBLIC_BOOKMARK_PAGE_SIZE),
    sort,
  });
  return appFetch<PageDtoPublicBookmarkSummaryDto>(`/api/public/bookmarks?${params.toString()}`, {
    signal,
  });
};

const publicBookmarkPath = (publicId: string) =>
  `/api/public/bookmarks/${encodeURIComponent(publicId)}`;

const getPublicBookmark = (publicId: string, signal?: AbortSignal): Promise<PublicBookmarkDto> =>
  appFetch<PublicBookmarkDto>(publicBookmarkPath(publicId), { signal });

/** A bookmark that is private, unknown, or whose schema was archived answers 404. */
export const isPublicBookmarkMissing = (error: unknown) =>
  isHttpError(error) && error.status === 404;

export const usePublicBookmarkCatalog = (search: string, sort: string) =>
  useInfiniteCatalog({
    queryKey: ["public", "bookmarks", "infinite", search, sort],
    queryFn: (page, signal) => getPublicBookmarkPage(page, search, sort, signal),
    staleTime: 0,
    meta: { errorHandledLocally: true },
  });

/**
 * Public data belongs to no organization, so its key carries no tenant scope and the same
 * entry serves visitors and members. The page owns the missing and failed states.
 */
export const publicBookmarkQueryOptions = (publicId: string) =>
  queryOptions({
    queryKey: ["public", "bookmark", publicId] as const,
    queryFn: ({ signal }) => getPublicBookmark(publicId, signal),
    enabled: publicId !== "",
    retry: (failures, error) => !isPublicBookmarkMissing(error) && failures < 1,
    meta: { errorHandledLocally: true },
  });

/**
 * The plugin fields and reports a published form is made of, compiled once per bookmark. Using
 * a plugin in a schema is its organization's alone; running a form that has one is anyone's.
 */
export const publicPluginCatalogQueryOptions = (publicId: string) =>
  queryOptions({
    queryKey: ["public", "bookmark", publicId, "plugins"] as const,
    queryFn: async ({ signal }) =>
      getCatalogDefinitions(
        `public:${publicId}`,
        await appFetch<PluginRuntimeSourceDto[]>(`${publicBookmarkPath(publicId)}/plugins`, {
          signal,
        }),
      ),
    staleTime: 5 * 60_000,
    retry: false,
    meta: { errorHandledLocally: true },
  });

/**
 * How many runs of the bookmark the caller has left. The server counts a visitor without a
 * session by network and a signed-in member by account, so each has its own entry; it is asked
 * on every visit, and a run replaces it with the count that came back.
 */
export const publicRunQuotaQueryOptions = (publicId: string, caller: "visitor" | "member") =>
  queryOptions({
    queryKey: ["public", "bookmark", publicId, "quota", caller] as const,
    queryFn: ({ signal }) =>
      appFetch<PublicRunQuotaDto>(`${publicBookmarkPath(publicId)}/quota`, { signal }),
    staleTime: 0,
    retry: false,
    meta: { errorHandledLocally: true },
  });

/** The caller's answers about one of their runs, replacing those given before; the run comes back. */
export const savePublicRunFeedback = (
  publicId: string,
  runId: number,
  request: PublicRunFeedbackRequest,
): Promise<PublicRunDto> =>
  appFetch<PublicRunDto>(`${publicBookmarkPath(publicId)}/runs/${runId}/feedback`, {
    ...json("PUT", request),
  });

/**
 * Runs the bookmark once. The server routes the values to its models, keeps the run as this
 * browser's, and answers with it; it is not a query and is never cached.
 */
export const runPublicBookmark = (
  publicId: string,
  request: PublicPredictionRequest,
  signal?: AbortSignal,
): Promise<PublicPredictionDto> =>
  appFetch<PublicPredictionDto>(`${publicBookmarkPath(publicId)}/predictions`, {
    ...json("POST", request),
    signal,
  });

/**
 * The workspace bookmark behind a public page, which only members of the organization that
 * owns it can resolve: for anyone else the request fails and there is nothing to link to.
 */
export const workspaceBookmarkQueryOptions = (organizationId: number, publicId: string) =>
  queryOptions({
    queryKey: [...organizationQueryKey(organizationId), "public-bookmark", publicId] as const,
    queryFn: ({ signal }) =>
      appFetch<SchemaBookmarkDto>(`/api/schema-bookmarks/public/${encodeURIComponent(publicId)}`, {
        signal,
      }),
    retry: false,
    meta: { errorHandledLocally: true },
  });
