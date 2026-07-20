/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { appFetch } from "@/api/core/services/app-fetch";
import type { RolesResponseDto } from "@/api/workspace/dtos";

export const getRoles = (organizationId: number, signal?: AbortSignal): Promise<RolesResponseDto> =>
  appFetch<RolesResponseDto>(`/api/organizations/${organizationId}/roles`, { signal });
