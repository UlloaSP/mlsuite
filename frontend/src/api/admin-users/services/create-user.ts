/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { appFetch } from "../../core/services/app-fetch";
import { json } from "../../core/services/json";
import type { AdminUserDto, AdminCreateUserPayload } from "../dtos";

export const createUser = (payload: AdminCreateUserPayload): Promise<AdminUserDto> =>
  appFetch<AdminUserDto>("/api/admin/users", json("POST", payload));
