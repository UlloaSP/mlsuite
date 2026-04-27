/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router";
import { HttpError } from "../app/api/appFetch";
import { setActiveOrganizationSlug } from "../app/api/tenant";
import * as userApi from "./api/userService";

export const USER_QUERY_KEY = ["user"];

const isTenantRecoveryError = (error: unknown) =>
  error instanceof HttpError &&
  ((error.status === 400 && error.message.includes("tenant header")) ||
    (error.status === 403 && error.message.includes("organization")));

export const useUser = () =>
  useQuery({
    queryKey: USER_QUERY_KEY,
    queryFn: userApi.getProfile,
    select: (user) => {
      setActiveOrganizationSlug(user.activeOrganizationSlug);
      return user;
    },
    staleTime: 5 * 60_000, // 5 min "fresh"
    gcTime: 30 * 60_000, // 30 min in cache
    retry: (count, err: unknown) => {
      if (isTenantRecoveryError(err)) {
        return count < 1;
      }
      const status = err instanceof HttpError ? err.status : (err as any)?.response?.status;
      if (status === 401 || status === 403) return false;
      return count < 2;
    },
  });

export const useLogout = () => {
  const qc = useQueryClient();
  const navigate = useNavigate();
  return useMutation({
    mutationFn: userApi.logout,
    onSuccess: () => {
      qc.clear();
      void navigate("/login", { replace: true });
    },
  });
};
