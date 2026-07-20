/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { appFetch } from "@/api/core/services/app-fetch";
import type { UserDTO } from "@/api/user/dtos";

export const getProfile = (signal?: AbortSignal): Promise<UserDTO> =>
  appFetch<UserDTO>("/api/users/me", { signal });
