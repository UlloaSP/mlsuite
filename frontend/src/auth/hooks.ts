/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router";
import { setActiveOrganizationSlug } from "../app/api/tenant";
import { USER_QUERY_KEY } from "../user/hooks";
import * as authService from "./api/authService";

const useAuthSuccess = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  return (user: Awaited<ReturnType<typeof authService.login>>) => {
    setActiveOrganizationSlug(user.activeOrganizationSlug);
    queryClient.setQueryData(USER_QUERY_KEY, user);
    void navigate("/models", { replace: true });
  };
};

export const useLogin = () => {
  const onSuccess = useAuthSuccess();
  return useMutation({
    mutationFn: authService.login,
    onSuccess,
  });
};

export const useRegister = () => {
  const onSuccess = useAuthSuccess();
  return useMutation({
    mutationFn: authService.register,
    onSuccess,
  });
};
