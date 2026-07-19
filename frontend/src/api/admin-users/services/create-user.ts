/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { appFetch } from "@/api/core/services/app-fetch";
import { json } from "@/api/core/services/json";
import type { AdminUserDto, AdminCreateUserPayload } from "@/api/admin-users/dtos";

export const createUser = (payload: AdminCreateUserPayload): Promise<AdminUserDto> =>
  appFetch<AdminUserDto>("/api/admin/users", json("POST", payload));
