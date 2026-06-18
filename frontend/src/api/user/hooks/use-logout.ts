/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router";
import * as userApi from "../services";

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
