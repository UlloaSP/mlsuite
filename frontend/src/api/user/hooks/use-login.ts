/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router";
import * as userApi from "../services";
import { USER_QUERY_KEY } from "./query-keys";

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
