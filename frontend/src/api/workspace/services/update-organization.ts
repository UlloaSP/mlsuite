/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { appFetch } from "@/api/core/services/app-fetch";
import { json } from "@/api/core/services/json";
import type { OrganizationDto, UpdateOrganizationRequest } from "@/api/workspace/dtos";

export const updateOrganization = (
  organizationId: number,
  payload: UpdateOrganizationRequest,
): Promise<OrganizationDto> =>
  appFetch<OrganizationDto>(`/api/organizations/${organizationId}`, json("PATCH", payload));
