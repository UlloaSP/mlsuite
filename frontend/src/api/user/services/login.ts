/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { appFetch } from "@/api/core/services/app-fetch";
import type { UserDTO, LoginPayload } from "@/api/user/dtos";

export const login = (payload: LoginPayload): Promise<UserDTO> =>
  appFetch<UserDTO>("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
