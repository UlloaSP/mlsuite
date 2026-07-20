/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { queryOptions } from "@tanstack/react-query";
import {
  getInvitationCandidates,
  getInvitations,
  getOrganization,
  getOrganizationAdminDashboard,
  getOrganizationMembers,
  getOrganizationPage,
  getPendingInvitations,
  getRoles,
  getTeam,
  getTeamMembers,
  getTeams,
  getWorkspaceContext,
} from "./services";
import {
  ORGANIZATION_CATALOG_PAGE_SIZE,
  PENDING_INVITATIONS_QUERY_KEY,
  WORKSPACE_CONTEXT_QUERY_KEY,
  organizationAdminDashboardQueryKey,
  organizationCatalogPageQueryKey,
  organizationDetailsQueryKey,
  organizationInvitationCandidatesQueryKey,
  organizationInvitationsQueryKey,
  organizationMembersQueryKey,
  organizationRolesQueryKey,
  organizationTeamMembersQueryKey,
  organizationTeamQueryKey,
  organizationTeamsQueryKey,
} from "./hooks/query-keys";

export const workspaceContextQueryOptions = () =>
  queryOptions({
    queryKey: WORKSPACE_CONTEXT_QUERY_KEY,
    queryFn: ({ signal }) => getWorkspaceContext(signal),
    staleTime: 60_000,
  });

export const pendingInvitationsQueryOptions = () =>
  queryOptions({
    queryKey: PENDING_INVITATIONS_QUERY_KEY,
    queryFn: ({ signal }) => getPendingInvitations(signal),
    staleTime: 30_000,
  });

export const organizationCatalogPageQueryOptions = (
  page: number,
  search: string,
  sort: string,
  filter: string,
) =>
  queryOptions({
    queryKey: organizationCatalogPageQueryKey(page, search, sort, filter),
    queryFn: ({ signal }) =>
      getOrganizationPage(
        { page, search, size: ORGANIZATION_CATALOG_PAGE_SIZE, sort, filter },
        signal,
      ),
    placeholderData: (previous) => previous,
  });

export const organizationDetailsQueryOptions = (organizationId: number) =>
  queryOptions({
    queryKey: organizationDetailsQueryKey(organizationId),
    queryFn: ({ signal }) => getOrganization(organizationId, signal),
    enabled: Boolean(organizationId),
  });

export const organizationAdminDashboardQueryOptions = (organizationId: number) =>
  queryOptions({
    queryKey: organizationAdminDashboardQueryKey(organizationId),
    queryFn: ({ signal }) => getOrganizationAdminDashboard(organizationId, signal),
    enabled: Boolean(organizationId),
  });

export const organizationMembersQueryOptions = (organizationId: number, enabled = true) =>
  queryOptions({
    queryKey: organizationMembersQueryKey(organizationId),
    queryFn: ({ signal }) => getOrganizationMembers(organizationId, signal),
    enabled: Boolean(organizationId) && enabled,
  });

export const organizationTeamsQueryOptions = (organizationId: number) =>
  queryOptions({
    queryKey: organizationTeamsQueryKey(organizationId),
    queryFn: ({ signal }) => getTeams(organizationId, signal),
    enabled: Boolean(organizationId),
  });

export const organizationTeamQueryOptions = (organizationId: number | string, teamId: number) =>
  queryOptions({
    queryKey: organizationTeamQueryKey(organizationId, teamId),
    queryFn: ({ signal }) => getTeam(teamId, signal),
    enabled: Boolean(organizationId) && Boolean(teamId),
  });

export const organizationTeamMembersQueryOptions = (
  organizationId: number | string,
  teamId: number,
) =>
  queryOptions({
    queryKey: organizationTeamMembersQueryKey(organizationId, teamId),
    queryFn: ({ signal }) => getTeamMembers(teamId, signal),
    enabled: Boolean(organizationId) && Boolean(teamId),
  });

export const organizationInvitationsQueryOptions = (organizationId: number) =>
  queryOptions({
    queryKey: organizationInvitationsQueryKey(organizationId),
    queryFn: ({ signal }) => getInvitations(organizationId, signal),
    enabled: Boolean(organizationId),
  });

export const organizationRolesQueryOptions = (organizationId: number, enabled = true) =>
  queryOptions({
    queryKey: organizationRolesQueryKey(organizationId),
    queryFn: ({ signal }) => getRoles(organizationId, signal),
    enabled: Boolean(organizationId) && enabled,
  });

export const organizationInvitationCandidatesQueryOptions = (
  organizationId: number,
  enabled = true,
) =>
  queryOptions({
    queryKey: organizationInvitationCandidatesQueryKey(organizationId),
    queryFn: ({ signal }) => getInvitationCandidates(organizationId, signal),
    enabled: Boolean(organizationId) && enabled,
  });
