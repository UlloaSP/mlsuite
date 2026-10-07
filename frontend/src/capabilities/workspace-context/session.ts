/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { queryOptions, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getProfile, login, logout, openDocument, register } from "./session-api";
import type { UserDto } from "@/shared/api/openapi.gen";

export const USER_QUERY_KEY = ["user"] as const;

export const userQueryOptions = () =>
  queryOptions({
    queryKey: USER_QUERY_KEY,
    queryFn: ({ signal }) => getProfile(signal),
    staleTime: 5 * 60_000,
    gcTime: 30 * 60_000,
  });

export const useUser = () =>
  useQuery({
    ...userQueryOptions(),
    retry: (count, error) => {
      const status =
        (error as { status?: number; response?: { status?: number } }).status ??
        (error as { response?: { status?: number } }).response?.status;
      return status !== 401 && status !== 403 && count < 2;
    },
  });

export const useCurrentUserIsSuperadmin = () => useUser().data?.systemRole === "SUPERADMIN";

/** The one address of the sign-in and register screen. */
export const SIGN_IN_PATH = "/login";

/** The search param naming which of the screen's two forms is open; signing in when absent. */
export const AUTH_MODE_PARAM = "mode";

/** The sign-in screen, set to come back to `returnTo` once signed in. */
export const signInHref = (returnTo: string) =>
  `${SIGN_IN_PATH}?returnTo=${encodeURIComponent(returnTo)}`;

/** The same screen on its registration form, set to come back to `returnTo` once registered. */
export const registerHref = (returnTo: string) =>
  `${signInHref(returnTo)}&${AUTH_MODE_PARAM}=register`;

// Any origin serves as the site here: only whether the browser would leave it matters.
const SITE_ORIGIN = "https://mlsuite.invalid";

/** Browsers read "//host", "/\host", and "/<tab>/host" alike as another site, so let them resolve it. */
const staysOnSite = (path: string) => {
  try {
    return new URL(path, SITE_ORIGIN).origin === SITE_ORIGIN;
  } catch {
    return false;
  }
};

/** `value` when it is a path inside the app; otherwise `fallback`, never another site. */
export const safeReturnTo = (value: string | null | undefined, fallback: string) =>
  value?.startsWith("/") && staysOnSite(value) ? value : fallback;

/** Signs in through `authenticate` and adopts the returned user as the session. */
const useSessionMutation = <Payload>(authenticate: (payload: Payload) => Promise<UserDto>) => {
  const queryClient = useQueryClient();
  return useMutation({
    meta: { errorHandledLocally: true },
    mutationFn: authenticate,
    onSuccess: (user) => {
      queryClient.setQueryData(USER_QUERY_KEY, user);
      void queryClient.invalidateQueries({ queryKey: USER_QUERY_KEY });
    },
  });
};

export const useLogin = () => useSessionMutation(login);

export const useRegister = () => useSessionMutation(register);

/**
 * Signs out because the member asked to, then loads `destination` as a new document: nothing
 * the member loaded outlives the session, and no page still on screen sees it end. A session
 * that ends on its own is not this: the page it ended on asks to sign in and come back.
 */
export const useLogout = (destination: string) =>
  useMutation({
    mutationFn: logout,
    onSuccess: () => openDocument(destination),
  });
