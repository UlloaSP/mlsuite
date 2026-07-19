/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { appFetch } from "@/api/core/services/app-fetch";
import { json } from "@/api/core/services/json";
import type { AdminUserDto, AdminUpdateUserPayload } from "@/api/admin-users/dtos";

export const updateUser = (id: number, payload: AdminUpdateUserPayload): Promise<AdminUserDto> =>
  appFetch<AdminUserDto>(`/api/admin/users/${id}`, json("PATCH", payload));
