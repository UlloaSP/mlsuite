/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { appFetch } from "@/api/core/services/app-fetch";
import { json } from "@/api/core/services/json";
import type { OrganizationMembershipDto } from "@/api/workspace/dtos";

export const transferOrganizationOwnership = (
  organizationId: number,
  nextOwnerMembershipId: number,
): Promise<OrganizationMembershipDto> =>
  appFetch<OrganizationMembershipDto>(
    `/api/organizations/${organizationId}/transfer-ownership`,
    json("POST", { nextOwnerMembershipId }),
  );
