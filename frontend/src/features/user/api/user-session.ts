/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { queryOptions, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router";
import { getProfile, login, logout, register } from "./user-api";

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

export const useLogin = (destination = "/workspace") => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  return useMutation({
    meta: { errorHandledLocally: true },
    mutationFn: login,
    onSuccess: (user) => {
      queryClient.setQueryData(USER_QUERY_KEY, user);
      void queryClient.invalidateQueries({ queryKey: USER_QUERY_KEY });
      void navigate(destination, { replace: true });
    },
  });
};

export const useRegister = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  return useMutation({
    meta: { errorHandledLocally: true },
    mutationFn: register,
    onSuccess: (user) => {
      queryClient.setQueryData(USER_QUERY_KEY, user);
      void queryClient.invalidateQueries({ queryKey: USER_QUERY_KEY });
      void navigate("/workspace", { replace: true });
    },
  });
};

export const useLogout = (redirectTo = "/") => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  return useMutation({
    mutationFn: logout,
    onSuccess: () => {
      queryClient.clear();
      navigate(redirectTo, { replace: true });
    },
  });
};
