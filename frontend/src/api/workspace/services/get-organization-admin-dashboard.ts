/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { appFetch } from "../../core/services/app-fetch";
import type { OrganizationAdminDashboardDto } from "../dtos";

export const getOrganizationAdminDashboard = (
  organizationId: number,
): Promise<OrganizationAdminDashboardDto> =>
  appFetch<OrganizationAdminDashboardDto>(`/api/organizations/${organizationId}/admin-dashboard`);
