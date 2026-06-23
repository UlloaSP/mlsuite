/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import type { OrganizationRole, MembershipStatus } from "./index";

export interface OrganizationMembershipDto {
  id: number;
  organizationId: number;
  userId: number;
  fullName: string;
  email: string;
  avatarUrl?: string | null;
  role: OrganizationRole;
  status: MembershipStatus;
  createdAt: string;
}
