/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { appFetch } from "@/shared/api/http";
import { json } from "@/shared/api/http";
import type { AdminUserDto, AdminUpdateUserPayload } from "@/api/admin-users/dtos";

export const updateUser = (id: number, payload: AdminUpdateUserPayload): Promise<AdminUserDto> =>
  appFetch<AdminUserDto>(`/api/admin/users/${id}`, json("PATCH", payload));
