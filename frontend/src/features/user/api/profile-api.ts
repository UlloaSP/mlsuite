/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { mutationOptions, queryOptions, useMutation } from "@tanstack/react-query";
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
const personMutation = <TVariables>(mutationFn: (variables: TVariables) => Promise<UserDto>) =>
  mutationOptions({
    meta: { errorHandledLocally: true },
    mutationFn,
    onSuccess: (user, _variables, _result, { client }) => {
      client.setQueryData(USER_QUERY_KEY, user);
      for (const queryKey of [
        USER_QUERY_KEY,
        WORKSPACE_CONTEXT_QUERY_KEY,
        PUBLIC_QUERY_KEY,
        ["org"],
      ]) {
        void client.invalidateQueries({ queryKey });
      }
    },
  });

const updateProfileMutation = personMutation((request: UpdateUserProfileRequest) =>
  appFetch<UserDto>(ME, json("PATCH", request)),
);

const replaceAvatarMutation = personMutation((file: File) => {
  const body = new FormData();
  body.append("avatar", file);
  return appFetch<UserDto>(`${ME}/avatar`, { method: "PUT", body });
});

const removeAvatarMutation = personMutation<void>(() =>
  appFetch<UserDto>(`${ME}/avatar`, { method: "DELETE" }),
);

export const useUpdateProfile = () => useMutation(updateProfileMutation);

export const useReplaceAvatar = () => useMutation(replaceAvatarMutation);

export const useRemoveAvatar = () => useMutation(removeAvatarMutation);

const replacePinsMutation = mutationOptions({
  meta: { errorHandledLocally: true },
  mutationFn: (publicIds: string[]) =>
    appFetch<OwnProfileDto>(`${ME}/pins`, json("PUT", { publicIds })),
  onSuccess: (profile, _publicIds, _result, { client }) => {
    client.setQueryData(OWN_PROFILE_QUERY_KEY, profile);
    void client.invalidateQueries({ queryKey: OWN_PROFILE_QUERY_KEY });
    void client.invalidateQueries({ queryKey: PUBLIC_QUERY_KEY });
  },
});

export const useReplacePins = () => useMutation(replacePinsMutation);

/** Only the session that asks stays signed in, so nothing on this device needs to change. */
const changePasswordMutation = mutationOptions({
  meta: { errorHandledLocally: true },
  mutationFn: (request: ChangePasswordRequest) =>
    appFetch<void>(`${ME}/password`, json("POST", request)),
});

export const useChangePassword = () => useMutation(changePasswordMutation);
