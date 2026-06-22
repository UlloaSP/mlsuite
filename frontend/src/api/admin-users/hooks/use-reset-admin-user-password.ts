/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { useMutation, useQueryClient } from "@tanstack/react-query";
import * as adminApi from "../services";
import { ADMIN_USERS_QUERY_KEY } from "./query-keys";

export const useResetAdminUserPassword = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, password }: { id: number; password: string }) =>
      adminApi.resetPassword(id, password),
    onSuccess: () => qc.invalidateQueries({ queryKey: ADMIN_USERS_QUERY_KEY }),
  });
};
