/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

export const WORKSPACE_CONTEXT_QUERY_KEY = ["workspaceContext"] as const;
export const PENDING_INVITATIONS_QUERY_KEY = ["pendingInvitations"] as const;
export const ORGANIZATIONS_QUERY_KEY = ["organizations"] as const;
export const ORGANIZATION_CATALOG_PAGE_SIZE = 24;
export const ORGANIZATION_CATALOG_PAGE_QUERY_KEY = ["organizationCatalogPages"] as const;

export const organizationQueryKey = (organizationId: number | string) =>
  ["org", organizationId] as const;
export const organizationResourceQueryKey = (
  organizationId: number | string,
  resource: string,
  resourceId?: number | string,
) =>
  resourceId === undefined
    ? ([...organizationQueryKey(organizationId), resource] as const)
    : ([...organizationQueryKey(organizationId), resource, resourceId] as const);
export const organizationMembersQueryKey = (organizationId: number | string) =>
  [...organizationQueryKey(organizationId), "members"] as const;
export const organizationDetailsQueryKey = (organizationId: number | string) =>
  [...organizationQueryKey(organizationId), "organization"] as const;
export const organizationAdminDashboardQueryKey = (organizationId: number | string) =>
  [...organizationQueryKey(organizationId), "admin-dashboard"] as const;
export const organizationTeamsQueryKey = (organizationId: number | string) =>
  [...organizationQueryKey(organizationId), "teams"] as const;
export const organizationTeamQueryKey = (
  organizationId: number | string,
  teamId: number | string,
) => [...organizationQueryKey(organizationId), "team", teamId] as const;
export const organizationTeamMembersQueryKey = (
  organizationId: number | string,
  teamId: number | string,
) => [...organizationQueryKey(organizationId), "team-members", teamId] as const;
export const organizationInvitationsQueryKey = (organizationId: number | string) =>
  [...organizationQueryKey(organizationId), "invitations"] as const;
export const organizationInvitationCandidatesQueryKey = (organizationId: number | string) =>
  [...organizationQueryKey(organizationId), "invitation-candidates"] as const;
export const organizationRolesQueryKey = (organizationId: number | string) =>
  [...organizationQueryKey(organizationId), "roles"] as const;

export const organizationCatalogPageQueryKey = (
  page: number,
  search: string,
  sort: string,
  filter: string,
) => [
  ...ORGANIZATION_CATALOG_PAGE_QUERY_KEY,
  page,
  ORGANIZATION_CATALOG_PAGE_SIZE,
  search,
  sort,
  filter,
];
