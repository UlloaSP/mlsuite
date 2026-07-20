/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { useQuery } from "@tanstack/react-query";
import {
  organizationAdminDashboardQueryOptions,
  organizationDetailsQueryOptions,
  organizationInvitationCandidatesQueryOptions,
  organizationInvitationsQueryOptions,
  organizationMembersQueryOptions,
  organizationRolesQueryOptions,
  organizationTeamMembersQueryOptions,
  organizationTeamQueryOptions,
  organizationTeamsQueryOptions,
} from "@/api/workspace/workspace-queries";

export const useOrganizationDetailsQuery = (organizationId: number) =>
  useQuery(organizationDetailsQueryOptions(organizationId));

export const useOrganizationAdminDashboardQuery = (organizationId: number) =>
  useQuery(organizationAdminDashboardQueryOptions(organizationId));

export const useOrganizationMembersQuery = (organizationId: number, enabled = true) =>
  useQuery(organizationMembersQueryOptions(organizationId, enabled));

export const useOrganizationTeamsQuery = (organizationId: number) =>
  useQuery(organizationTeamsQueryOptions(organizationId));

export const useOrganizationTeamQuery = (organizationId: number | string, teamId: number) =>
  useQuery(organizationTeamQueryOptions(organizationId, teamId));

export const useOrganizationTeamMembersQuery = (organizationId: number | string, teamId: number) =>
  useQuery(organizationTeamMembersQueryOptions(organizationId, teamId));

export const useOrganizationInvitationsQuery = (organizationId: number) =>
  useQuery(organizationInvitationsQueryOptions(organizationId));

export const useOrganizationRolesQuery = (organizationId: number, enabled = true) =>
  useQuery(organizationRolesQueryOptions(organizationId, enabled));

export const useOrganizationInvitationCandidatesQuery = (organizationId: number, enabled = true) =>
  useQuery(organizationInvitationCandidatesQueryOptions(organizationId, enabled));
