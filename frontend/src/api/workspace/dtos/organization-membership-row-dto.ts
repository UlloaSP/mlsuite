/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import type {
  OrganizationRole,
  MembershipStatus,
  RoleSummaryDto,
  MembershipRowActionsDto,
} from "./index";

export interface OrganizationMembershipRowDto {
  id: number;
  organizationId: number;
  userId: number;
  fullName: string;
  email: string;
  avatarUrl?: string | null;
  role: RoleSummaryDto;
  legacyRole?: OrganizationRole | null;
  status: MembershipStatus;
  createdAt: string;
  actions: MembershipRowActionsDto;
}
