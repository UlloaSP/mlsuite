/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import type { TeamRole, MembershipStatus, RoleSummaryDto, MembershipRowActionsDto } from "./index";

export interface TeamMembershipRowDto {
  id: number;
  teamId: number;
  userId: number;
  fullName: string;
  email: string;
  avatarUrl?: string | null;
  role: RoleSummaryDto;
  legacyRole?: TeamRole | null;
  status: MembershipStatus;
  createdAt: string;
  actions: MembershipRowActionsDto;
}
