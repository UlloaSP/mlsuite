/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { queryOptions, useQuery } from "@tanstack/react-query";
import { getInvitationCandidates, getInvitations, getPendingInvitations } from "./invitations.api";
import {
  getOrganization,
  getOrganizationAdminDashboard,
  getOrganizationMembers,
  getOrganizationPage,
} from "./organizations.api";
import { getRoles } from "./roles.api";
import {
  ORGANIZATION_CATALOG_PAGE_SIZE,
  PENDING_INVITATIONS_QUERY_KEY,
  organizationAdminDashboardQueryKey,
  organizationCatalogPageQueryKey,
  organizationDetailsQueryKey,
  organizationInvitationCandidatesQueryKey,
  organizationInvitationsQueryKey,
  organizationMembersQueryKey,
  organizationRolesQueryKey,
} from "./workspace.keys";

export const pendingInvitationsQueryOptions = () =>
  queryOptions({
    queryKey: PENDING_INVITATIONS_QUERY_KEY,
    queryFn: ({ signal }) => getPendingInvitations(signal),
    staleTime: 30_000,
  });

export const organizationCatalogPageQueryOptions = (page: number, search: string, sort: string) =>
  queryOptions({
    queryKey: organizationCatalogPageQueryKey(page, search, sort),
    queryFn: ({ signal }) =>
      getOrganizationPage({ page, search, size: ORGANIZATION_CATALOG_PAGE_SIZE, sort }, signal),
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

export const useOrganizationCatalogPageQuery = (
  page: number,
  search: string,
  sort: string,
  enabled = true,
) =>
  useQuery({
    ...organizationCatalogPageQueryOptions(page, search, sort),
    enabled,
  });

export const usePendingInvitations = () =>
  useQuery({
    ...pendingInvitationsQueryOptions(),
    refetchInterval: 60_000,
  });

export const useOrganizationDetailsQuery = (organizationId: number) =>
  useQuery(organizationDetailsQueryOptions(organizationId));

export const useOrganizationAdminDashboardQuery = (organizationId: number) =>
  useQuery(organizationAdminDashboardQueryOptions(organizationId));

export const useOrganizationMembersQuery = (organizationId: number, enabled = true) =>
  useQuery(organizationMembersQueryOptions(organizationId, enabled));

export const useOrganizationInvitationsQuery = (organizationId: number) =>
  useQuery(organizationInvitationsQueryOptions(organizationId));

export const useOrganizationRolesQuery = (organizationId: number, enabled = true) =>
  useQuery(organizationRolesQueryOptions(organizationId, enabled));

export const useOrganizationInvitationCandidatesQuery = (organizationId: number, enabled = true) =>
  useQuery(organizationInvitationCandidatesQueryOptions(organizationId, enabled));
