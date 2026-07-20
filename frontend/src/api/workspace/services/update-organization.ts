/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { appFetch } from "@/shared/api/http";
import { json } from "@/shared/api/http";
import type { OrganizationDto, UpdateOrganizationRequest } from "@/api/workspace/dtos";

export const updateOrganization = (
  organizationId: number,
  payload: UpdateOrganizationRequest,
): Promise<OrganizationDto> =>
  appFetch<OrganizationDto>(`/api/organizations/${organizationId}`, json("PATCH", payload));
