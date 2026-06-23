/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { appFetch } from "../../core/services/app-fetch";
import { json } from "../../core/services/json";
import type { OrganizationMembershipDto } from "../dtos";

export const transferOrganizationOwnership = (
  organizationId: number,
  nextOwnerMembershipId: number,
): Promise<OrganizationMembershipDto> =>
  appFetch<OrganizationMembershipDto>(
    `/api/organizations/${organizationId}/transfer-ownership`,
    json("POST", { nextOwnerMembershipId }),
  );
