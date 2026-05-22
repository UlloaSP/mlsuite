/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router";
import * as userApi from "./api/userService";

const USER_QUERY_KEY = ["user"];

export const useUser = () =>
  useQuery({
    queryKey: USER_QUERY_KEY,
    queryFn: userApi.getProfile,
    staleTime: 5 * 60_000, // 5 min "fresh"
    gcTime: 30 * 60_000, // 30 min in cache
    // Optional: stop retries on 401/403
    retry: (count, err: any) => {
      const status = err?.status ?? err?.response?.status;
      if (status === 401 || status === 403) return false;
      return count < 2;
    },
  });

export const useLogout = (redirectTo = "/") => {
  const qc = useQueryClient();
  const navigate = useNavigate();
  return useMutation({
    mutationFn: userApi.logout,
    onSuccess: () => {
      qc.clear();
      navigate(redirectTo, { replace: true });
    },
  });
};

export const useLogin = () => {
  const qc = useQueryClient();
  const navigate = useNavigate();
  return useMutation({
    mutationFn: userApi.login,
    onSuccess: (user) => {
      qc.setQueryData(USER_QUERY_KEY, user);
      void qc.invalidateQueries({ queryKey: USER_QUERY_KEY });
      navigate("/workspace", { replace: true });
    },
  });
};

export const useRegister = () => {
  const qc = useQueryClient();
  const navigate = useNavigate();
  return useMutation({
    mutationFn: userApi.register,
    onSuccess: (user) => {
      qc.setQueryData(USER_QUERY_KEY, user);
      void qc.invalidateQueries({ queryKey: USER_QUERY_KEY });
      navigate("/workspace", { replace: true });
    },
  });
};
