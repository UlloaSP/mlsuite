/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import type { WorkspacePermissionsDto, OrganizationDto, OrganizationMembershipDto, TeamDto, InvitationDto, WorkspaceUserDto } from "./index";

export interface WorkspaceContextDto {
  user: WorkspaceUserDto;
  memberships: OrganizationMembershipDto[];
  organizations: OrganizationDto[];
  currentOrganization: OrganizationDto;
  currentMembership: OrganizationMembershipDto;
  teams: TeamDto[];
  invitations: InvitationDto[];
  permissions: WorkspacePermissionsDto;
}
