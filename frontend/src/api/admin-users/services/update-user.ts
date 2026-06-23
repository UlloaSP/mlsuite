/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { appFetch } from "../../core/services/app-fetch";
import { json } from "../../core/services/json";
import type { AdminUserDto, AdminUpdateUserPayload } from "../dtos";

export const updateUser = (id: number, payload: AdminUpdateUserPayload): Promise<AdminUserDto> =>
  appFetch<AdminUserDto>(`/api/admin/users/${id}`, json("PATCH", payload));
