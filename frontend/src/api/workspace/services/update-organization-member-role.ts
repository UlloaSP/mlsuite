/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { appFetch } from "@/shared/api/http";
import { json } from "@/shared/api/http";
import type { OrganizationMembershipDto } from "@/api/workspace/dtos";

export const updateOrganizationMemberRole = (
  organizationId: number,
  membershipId: number,
  roleDefinitionId: number,
): Promise<OrganizationMembershipDto> =>
  appFetch<OrganizationMembershipDto>(
    `/api/organizations/${organizationId}/members/${membershipId}`,
    json("PATCH", { roleDefinitionId }),
  );
