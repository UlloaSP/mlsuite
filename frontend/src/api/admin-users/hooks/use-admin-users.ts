/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { useQuery } from "@tanstack/react-query";
import * as adminApi from "../services";
import { ADMIN_USERS_QUERY_KEY } from "./query-keys";

export const useAdminUsers = () =>
  useQuery({
    queryKey: ADMIN_USERS_QUERY_KEY,
    queryFn: adminApi.listUsers,
  });
