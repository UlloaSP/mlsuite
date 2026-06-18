/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { appFetch } from "../../core/services/app-fetch";
import type { OrganizationMembershipRowDto } from "../dtos";

export const getOrganizationMembers = (
  organizationId: number,
): Promise<OrganizationMembershipRowDto[]> =>
  appFetch<OrganizationMembershipRowDto[]>(`/api/organizations/${organizationId}/members`);
