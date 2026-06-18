/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { appFetch } from "../../core/services/app-fetch";
import type { AdminUserDto } from "../dtos";

export const listUsers = (): Promise<AdminUserDto[]> =>
  appFetch<AdminUserDto[]>("/api/admin/users");
