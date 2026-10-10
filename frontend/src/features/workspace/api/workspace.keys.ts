/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

export const PENDING_INVITATIONS_QUERY_KEY = ["pendingInvitations"] as const;
export const ORGANIZATION_CATALOG_PAGE_SIZE = 24;
export const ORGANIZATION_CATALOG_PAGE_QUERY_KEY = ["organizationCatalogPages"] as const;

import { organizationQueryKey } from "@/shared/api/organization-query-key";
export const organizationMembersQueryKey = (organizationId: number | string) =>
  [...organizationQueryKey(organizationId), "members"] as const;
export const organizationAdminDashboardQueryKey = (organizationId: number | string) =>
  [...organizationQueryKey(organizationId), "admin-dashboard"] as const;
export const organizationInvitationsQueryKey = (organizationId: number | string) =>
  [...organizationQueryKey(organizationId), "invitations"] as const;
export const organizationInvitationCandidatesQueryKey = (organizationId: number | string) =>
  [...organizationQueryKey(organizationId), "invitation-candidates"] as const;
export const organizationRolesQueryKey = (organizationId: number | string) =>
  [...organizationQueryKey(organizationId), "roles"] as const;
