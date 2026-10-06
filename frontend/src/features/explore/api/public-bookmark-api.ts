/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { queryOptions } from "@tanstack/react-query";
import { appFetch, isHttpError } from "@/shared/api/http";
import type { PublicBookmarkDto } from "@/shared/api/openapi.gen";

const getPublicBookmark = (publicId: string, signal?: AbortSignal): Promise<PublicBookmarkDto> =>
  appFetch<PublicBookmarkDto>(`/api/public/bookmarks/${encodeURIComponent(publicId)}`, { signal });

/** A bookmark that is private, unknown, or whose schema was archived answers 404. */
export const isPublicBookmarkMissing = (error: unknown) =>
  isHttpError(error) && error.status === 404;

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
