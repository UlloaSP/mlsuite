/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { appFetch } from "../../core/services/app-fetch";
import { json } from "../../core/services/json";
import type { OrganizationDto, UpdateOrganizationRequest } from "../dtos";

export const updateOrganization = (
  organizationId: number,
  payload: UpdateOrganizationRequest,
): Promise<OrganizationDto> =>
  appFetch<OrganizationDto>(`/api/organizations/${organizationId}`, json("PATCH", payload));
