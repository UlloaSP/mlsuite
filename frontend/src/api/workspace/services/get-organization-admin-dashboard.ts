/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { appFetch } from "@/shared/api/http";
import type { OrganizationAdminDashboardDto } from "@/api/workspace/dtos";

export const getOrganizationAdminDashboard = (
  organizationId: number,
  signal?: AbortSignal,
): Promise<OrganizationAdminDashboardDto> =>
  appFetch<OrganizationAdminDashboardDto>(`/api/organizations/${organizationId}/admin-dashboard`, {
    signal,
  });
