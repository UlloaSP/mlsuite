/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { appFetch } from "@/shared/api/http";
import { json } from "@/shared/api/http";
import type { AdminUserDto, AdminCreateUserPayload } from "@/api/admin-users/dtos";

export const createUser = (payload: AdminCreateUserPayload): Promise<AdminUserDto> =>
  appFetch<AdminUserDto>("/api/admin/users", json("POST", payload));
