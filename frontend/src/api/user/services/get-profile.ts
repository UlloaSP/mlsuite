/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { appFetch } from "../../core/services/app-fetch";
import type { UserDTO } from "../dtos";

export const getProfile = (): Promise<UserDTO> => appFetch<UserDTO>("/api/users/me");
