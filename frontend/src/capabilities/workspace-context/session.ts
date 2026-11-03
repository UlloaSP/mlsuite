/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { mutationOptions, queryOptions, useMutation, useQuery } from "@tanstack/react-query";
import { linkOptions } from "@tanstack/react-router";
import { deleteAccount, getProfile, login, logout, openDocument, register } from "./session-api";
import { actInOrganization, isHttpError } from "@/shared/api/http";
import type { UserDto } from "@/shared/api/openapi.gen";

export const USER_QUERY_KEY = ["user"] as const;

export const userQueryOptions = () =>
  queryOptions({
    queryKey: USER_QUERY_KEY,
    queryFn: ({ signal }) => getProfile(signal),
    staleTime: 5 * 60_000,
    gcTime: 30 * 60_000,
    // No session is an answer, not a failure to retry.
    retry: (count, error) => !(isHttpError(error) && [401, 403].includes(error.status)) && count < 2,
  });

export const useUser = () => useQuery(userQueryOptions());

export const useCurrentUserIsSuperadmin = () => useUser().data?.systemRole === "SUPERADMIN";

/** The one address of the sign-in and register screen. */
export const SIGN_IN_PATH = "/login";

/** The search param naming which of the screen's two forms is open; signing in when absent. */
export const AUTH_MODE_PARAM = "mode";

/** The sign-in screen, set to come back to `returnTo` once signed in. */
export const signInLink = (returnTo: string) =>
  linkOptions({ to: SIGN_IN_PATH, search: { returnTo } });

/** The same screen on its registration form, set to come back to `returnTo` once registered. */
export const registerLink = (returnTo: string) =>
  linkOptions({ to: SIGN_IN_PATH, search: { returnTo, [AUTH_MODE_PARAM]: "register" } });

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
const sessionMutation = <Payload>(authenticate: (payload: Payload) => Promise<UserDto>) =>
  mutationOptions({
    meta: { errorHandledLocally: true },
    mutationFn: authenticate,
    onSuccess: (user, _payload, _result, { client }) => {
      // A new session starts where its account last worked, not where the previous one did.
      actInOrganization(null);
      client.setQueryData(USER_QUERY_KEY, user);
      void client.invalidateQueries({ queryKey: USER_QUERY_KEY });
    },
  });

const loginMutation = sessionMutation(login);

const registerMutation = sessionMutation(register);

/** Closes the account and leaves as signing out does: nothing it loaded outlives the session. */
const deleteAccountMutation = mutationOptions({
  meta: { errorHandledLocally: true },
  mutationFn: deleteAccount,
  onSuccess: () => openDocument(SIGN_IN_PATH),
});

export const useDeleteAccount = () => useMutation(deleteAccountMutation);

export const useLogin = () => useMutation(loginMutation);

export const useRegister = () => useMutation(registerMutation);

/**
 * Signs out because the member asked to, then loads `destination` as a new document: nothing
 * the member loaded outlives the session, and no page still on screen sees it end. A session
 * that ends on its own is not this: the page it ended on asks to sign in and come back.
 */
const logoutMutation = (destination: string) =>
  mutationOptions({
    mutationFn: logout,
    onSuccess: () => openDocument(destination),
  });

export const useLogout = (destination: string) => useMutation(logoutMutation(destination));
