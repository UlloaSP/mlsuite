/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { appFetch, json } from "@/shared/api/http";
import type {
  OrganizationDto,
  OrganizationMembershipDto,
} from "@/capabilities/workspace-context/workspace-context.types";
import type {
  CreateOrganizationRequest,
  OrganizationAdminDashboardDto,
  OrganizationMembershipRowDto,
  OrganizationPageDto,
  UpdateOrganizationRequest,
} from "./workspace.types";

export const createOrganization = (payload: CreateOrganizationRequest): Promise<OrganizationDto> =>
  appFetch<OrganizationDto>("/api/organizations", json("POST", payload));

export const deleteOrganization = (organizationId: number): Promise<void> =>
  appFetch<void>(`/api/organizations/${organizationId}`, { method: "DELETE" });

export const getOrganizationAdminDashboard = (
  organizationId: number,
  signal?: AbortSignal,
): Promise<OrganizationAdminDashboardDto> =>
  appFetch<OrganizationAdminDashboardDto>(`/api/organizations/${organizationId}/admin-dashboard`, {
    signal,
  });

export const getOrganizationMembers = (
  organizationId: number,
  signal?: AbortSignal,
): Promise<OrganizationMembershipRowDto[]> =>
  appFetch<OrganizationMembershipRowDto[]>(`/api/organizations/${organizationId}/members`, {
    signal,
  });

export type OrganizationPageRequest = {
  page: number;
  search?: string;
  size: number;
  sort?: string;
};

export const getOrganizationPage = (
  { page, search = "", size, sort = "updated" }: OrganizationPageRequest,
  signal?: AbortSignal,
): Promise<OrganizationPageDto> => {
  const params = new URLSearchParams({
    page: String(page),
    search,
    size: String(size),
    sort,
  });
  return appFetch<OrganizationPageDto>(`/api/organizations/catalog?${params.toString()}`, {
    signal,
  });
};

export const getOrganization = (
  organizationId: number,
  signal?: AbortSignal,
): Promise<OrganizationDto> =>
  appFetch<OrganizationDto>(`/api/organizations/${organizationId}`, { signal });

export const removeOrganizationMember = (
  organizationId: number,
  membershipId: number,
): Promise<void> =>
  appFetch<void>(`/api/organizations/${organizationId}/members/${membershipId}`, {
    method: "DELETE",
  });

export const transferOrganizationOwnership = (
  organizationId: number,
  nextOwnerMembershipId: number,
): Promise<OrganizationMembershipDto> =>
  appFetch<OrganizationMembershipDto>(
    `/api/organizations/${organizationId}/transfer-ownership`,
    json("POST", { nextOwnerMembershipId }),
  );

export const updateOrganizationMemberRole = (
  organizationId: number,
  membershipId: number,
  roleDefinitionId: number,
): Promise<OrganizationMembershipDto> =>
  appFetch<OrganizationMembershipDto>(
    `/api/organizations/${organizationId}/members/${membershipId}`,
    json("PATCH", { roleDefinitionId }),
  );

export const updateOrganization = (
  organizationId: number,
  payload: UpdateOrganizationRequest,
): Promise<OrganizationDto> =>
  appFetch<OrganizationDto>(`/api/organizations/${organizationId}`, json("PATCH", payload));
