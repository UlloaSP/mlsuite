/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { appFetch, json } from "@/shared/api/http";
import type {
  CreateOrganizationRequest,
  OrganizationAdminDashboardDto,
  OrganizationDto,
  OrganizationMembershipDto,
  OrganizationMembershipRowDto,
  PageDtoOrganizationCatalogItemDto,
  TransferOrganizationOwnershipRequest,
  UpdateOrganizationMembershipRoleRequest,
  UpdateOrganizationRequest,
} from "@/shared/api/openapi.gen";

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
): Promise<PageDtoOrganizationCatalogItemDto> => {
  const params = new URLSearchParams({
    page: String(page),
    search,
    size: String(size),
    sort,
  });
  return appFetch<PageDtoOrganizationCatalogItemDto>(
    `/api/organizations/catalog?${params.toString()}`,
    {
      signal,
    },
  );
};

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
    json("POST", { nextOwnerMembershipId } satisfies TransferOrganizationOwnershipRequest),
  );

export const updateOrganizationMemberRole = (
  organizationId: number,
  membershipId: number,
  roleDefinitionId: number,
): Promise<OrganizationMembershipDto> =>
  appFetch<OrganizationMembershipDto>(
    `/api/organizations/${organizationId}/members/${membershipId}`,
    json("PATCH", { roleDefinitionId } satisfies UpdateOrganizationMembershipRoleRequest),
  );

export const updateOrganization = (
  organizationId: number,
  payload: UpdateOrganizationRequest,
): Promise<OrganizationDto> =>
  appFetch<OrganizationDto>(`/api/organizations/${organizationId}`, json("PATCH", payload));
