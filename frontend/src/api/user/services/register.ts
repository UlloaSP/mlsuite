/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { appFetch } from "../../core/services/app-fetch";
import type { UserDTO, RegisterPayload } from "../dtos";

export const register = (payload: RegisterPayload): Promise<UserDTO> =>
  appFetch<UserDTO>("/api/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
