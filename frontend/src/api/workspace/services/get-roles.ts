/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { appFetch } from "../../core/services/app-fetch";
import type { RolesResponseDto } from "../dtos";

export const getRoles = (organizationId: number): Promise<RolesResponseDto> =>
  appFetch<RolesResponseDto>(`/api/organizations/${organizationId}/roles`);
