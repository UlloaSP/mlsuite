/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { keepPreviousData, queryOptions } from "@tanstack/react-query";
import { appFetch, isHttpError } from "@/shared/api/http";
import type {
  PageDtoPublicBookmarkSummaryDto,
  PublicBookmarkDto,
  PublicBookmarkExampleDto,
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

const getPublicBookmark = (publicId: string, signal?: AbortSignal): Promise<PublicBookmarkDto> =>
  appFetch<PublicBookmarkDto>(`/api/public/bookmarks/${encodeURIComponent(publicId)}`, { signal });

const getPublicBookmarkExamples = (
  publicId: string,
  signal?: AbortSignal,
): Promise<PublicBookmarkExampleDto[]> =>
  appFetch<PublicBookmarkExampleDto[]>(
    `/api/public/bookmarks/${encodeURIComponent(publicId)}/examples`,
    { signal },
  );

/** A bookmark that is private, unknown, or whose schema was archived answers 404. */
export const isPublicBookmarkMissing = (error: unknown) =>
  isHttpError(error) && error.status === 404;

/**
 * One page of the public feed. Any organization may publish or unpublish at any time, so
 * no mutation of this client keeps it fresh: every visit asks again, behind the page it had.
 */
export const publicBookmarkPageQueryOptions = (page: number, search: string, sort: string) =>
  queryOptions({
    queryKey: ["public", "bookmarks", page, PUBLIC_BOOKMARK_PAGE_SIZE, search, sort] as const,
    queryFn: ({ signal }) => getPublicBookmarkPage(page, search, sort, signal),
    placeholderData: keepPreviousData,
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
 * The curated examples a public bookmark serves. They only help fill the form, so a failed
 * request is not an error state: the page simply offers no examples.
 */
export const publicBookmarkExamplesQueryOptions = (publicId: string) =>
  queryOptions({
    queryKey: ["public", "bookmark", publicId, "examples"] as const,
    queryFn: ({ signal }) => getPublicBookmarkExamples(publicId, signal),
    enabled: publicId !== "",
    retry: (failures, error) => !isPublicBookmarkMissing(error) && failures < 1,
    meta: { errorHandledLocally: true },
  });
