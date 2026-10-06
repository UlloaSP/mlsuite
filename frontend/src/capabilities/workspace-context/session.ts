/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { queryOptions, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router";
import { getProfile, login, logout, register } from "./session-api";
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

/** The sign-in screen, set to come back to `returnTo` once signed in. */
export const signInHref = (returnTo: string) =>
  `${SIGN_IN_PATH}?returnTo=${encodeURIComponent(returnTo)}`;

export const safeReturnTo = (value: string | null | undefined, fallback = "/home") =>
  value?.startsWith("/") && !value.startsWith("//") && !value.includes("\\") ? value : fallback;

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

export const useLogout = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  return useMutation({
    mutationFn: logout,
    onSuccess: () => {
      queryClient.clear();
      void navigate(SIGN_IN_PATH, { replace: true });
    },
  });
};
