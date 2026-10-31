/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { queryOptions, useMutation, useQueryClient } from "@tanstack/react-query";
import { USER_QUERY_KEY } from "@/capabilities/workspace-context/session";
import { WORKSPACE_CONTEXT_QUERY_KEY } from "@/capabilities/workspace-context/workspace-context";
import { appFetch, isHttpError, json } from "@/shared/api/http";
import { useInfiniteCatalog, type CatalogPage } from "@/shared/api/infinite-catalog";
import type {
  ChangePasswordRequest,
  OwnProfileDto,
  PublicBookmarkSummaryDto,
  PublicProfileDto,
  UpdateUserProfileRequest,
  UserDto,
} from "@/shared/api/openapi.gen";

const ME = "/api/users/me";
const PAGE_SIZE = 24;
/** Their own profile lives under the user, so whatever refreshes the user refreshes it. */
const OWN_PROFILE_QUERY_KEY = [...USER_QUERY_KEY, "profile"] as const;
const PUBLIC_QUERY_KEY = ["public"] as const;
const publicProfilePath = (handle: string) => `/api/public/users/${encodeURIComponent(handle)}`;
const bookmarkId = (bookmark: PublicBookmarkSummaryDto) => bookmark.publicId;

/** A profile that is private, disabled, or unknown answers 404, alike. */
export const isProfileMissing = (error: unknown) => isHttpError(error) && error.status === 404;

export const ownProfileQueryOptions = () =>
  queryOptions({
    queryKey: OWN_PROFILE_QUERY_KEY,
    queryFn: ({ signal }) => appFetch<OwnProfileDto>(`${ME}/profile`, { signal }),
    staleTime: 0,
    meta: { errorHandledLocally: true },
  });

/** Public data belongs to no organization, so visitors and members share one entry. */
export const publicProfileQueryOptions = (handle: string) =>
  queryOptions({
    queryKey: [...PUBLIC_QUERY_KEY, "profile", handle] as const,
    queryFn: ({ signal }) => appFetch<PublicProfileDto>(publicProfilePath(handle), { signal }),
    retry: (failures, error) => !isProfileMissing(error) && failures < 1,
    meta: { errorHandledLocally: true },
  });

export const usePublicProfileBookmarks = (handle: string) =>
  useInfiniteCatalog<CatalogPage<PublicBookmarkSummaryDto>>({
    queryKey: [...PUBLIC_QUERY_KEY, "profile", handle, "bookmarks", "infinite"],
    queryFn: (page, signal) =>
      appFetch<CatalogPage<PublicBookmarkSummaryDto>>(
        `${publicProfilePath(handle)}/bookmarks?page=${page}&size=${PAGE_SIZE}`,
        { signal },
      ),
    itemId: bookmarkId,
    meta: { errorHandledLocally: true },
  });

export const useOwnProfileBookmarks = (search: string) =>
  useInfiniteCatalog<CatalogPage<PublicBookmarkSummaryDto>>({
    queryKey: [...OWN_PROFILE_QUERY_KEY, "bookmarks", "infinite", search],
    queryFn: (page, signal) =>
      appFetch<CatalogPage<PublicBookmarkSummaryDto>>(
        `${ME}/bookmarks?${new URLSearchParams({ page: String(page), size: String(PAGE_SIZE), search })}`,
        { signal },
      ),
    itemId: bookmarkId,
    staleTime: 0,
    meta: { errorHandledLocally: true },
  });

/**
 * A person's name, handle and avatar are drawn across the app: in the shell, as their personal
 * account, on what they published, and in every organization's catalogs. All of it follows.
 */
const useRefreshPerson = () => {
  const queryClient = useQueryClient();
  return (user: UserDto) => {
    queryClient.setQueryData(USER_QUERY_KEY, user);
    for (const queryKey of [
      USER_QUERY_KEY,
      WORKSPACE_CONTEXT_QUERY_KEY,
      PUBLIC_QUERY_KEY,
      ["org"],
    ]) {
      void queryClient.invalidateQueries({ queryKey });
    }
  };
};

export const useUpdateProfile = () => {
  const refresh = useRefreshPerson();
  return useMutation({
    meta: { errorHandledLocally: true },
    mutationFn: (request: UpdateUserProfileRequest) =>
      appFetch<UserDto>(ME, json("PATCH", request)),
    onSuccess: refresh,
  });
};

export const useReplaceAvatar = () => {
  const refresh = useRefreshPerson();
  return useMutation({
    meta: { errorHandledLocally: true },
    mutationFn: (file: File) => {
      const body = new FormData();
      body.append("avatar", file);
      return appFetch<UserDto>(`${ME}/avatar`, { method: "PUT", body });
    },
    onSuccess: refresh,
  });
};

export const useRemoveAvatar = () => {
  const refresh = useRefreshPerson();
  return useMutation({
    meta: { errorHandledLocally: true },
    mutationFn: () => appFetch<UserDto>(`${ME}/avatar`, { method: "DELETE" }),
    onSuccess: refresh,
  });
};

export const useReplacePins = () => {
  const queryClient = useQueryClient();
  return useMutation({
    meta: { errorHandledLocally: true },
    mutationFn: (publicIds: string[]) =>
      appFetch<OwnProfileDto>(`${ME}/pins`, json("PUT", { publicIds })),
    onSuccess: (profile) => {
      queryClient.setQueryData(OWN_PROFILE_QUERY_KEY, profile);
      void queryClient.invalidateQueries({ queryKey: OWN_PROFILE_QUERY_KEY });
      void queryClient.invalidateQueries({ queryKey: PUBLIC_QUERY_KEY });
    },
  });
};

/** Only the session that asks stays signed in, so nothing on this device needs to change. */
export const useChangePassword = () =>
  useMutation({
    meta: { errorHandledLocally: true },
    mutationFn: (request: ChangePasswordRequest) =>
      appFetch<void>(`${ME}/password`, json("POST", request)),
  });
