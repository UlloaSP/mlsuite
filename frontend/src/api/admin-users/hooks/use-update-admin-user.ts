/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { useMutation, useQueryClient } from "@tanstack/react-query";
import * as adminApi from "../services";
import { ADMIN_USERS_QUERY_KEY } from "./query-keys";

export const useUpdateAdminUser = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: adminApi.AdminUpdateUserPayload }) =>
      adminApi.updateUser(id, payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ADMIN_USERS_QUERY_KEY }),
  });
};
