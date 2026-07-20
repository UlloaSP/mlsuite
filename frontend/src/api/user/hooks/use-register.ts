/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router";
import * as userApi from "@/api/user/services";
import { USER_QUERY_KEY } from "./query-keys";

export const useRegister = () => {
  const qc = useQueryClient();
  const navigate = useNavigate();
  return useMutation({
    meta: { errorHandledLocally: true },
    mutationFn: userApi.register,
    onSuccess: (user) => {
      qc.setQueryData(USER_QUERY_KEY, user);
      void qc.invalidateQueries({ queryKey: USER_QUERY_KEY });
      void navigate("/workspace", { replace: true });
    },
  });
};
