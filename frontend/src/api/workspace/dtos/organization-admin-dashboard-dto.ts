/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import type {
  WorkspacePermissionsDto,
  OrganizationDto,
  OrganizationMembershipRowDto,
  TeamDto,
  InvitationDto,
  OrganizationAdminStatsDto,
} from "./index";

export interface OrganizationAdminDashboardDto {
  organization: OrganizationDto;
  permissions: WorkspacePermissionsDto;
  stats: OrganizationAdminStatsDto;
  recentTeams: TeamDto[];
  recentMembers: OrganizationMembershipRowDto[];
  recentInvitations: InvitationDto[];
}
