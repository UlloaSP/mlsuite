/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { appFetch } from "../../core/services/app-fetch";
import { json } from "../../core/services/json";
import type { OrganizationMembershipDto } from "../dtos";

export const updateOrganizationMemberRole = (
  organizationId: number,
  membershipId: number,
  roleDefinitionId: number,
): Promise<OrganizationMembershipDto> =>
  appFetch<OrganizationMembershipDto>(
    `/api/organizations/${organizationId}/members/${membershipId}`,
    json("PATCH", { roleDefinitionId }),
  );
