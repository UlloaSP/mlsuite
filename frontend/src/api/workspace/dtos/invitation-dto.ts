/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import type { OrganizationRole, InvitationStatus, RoleSummaryDto } from "./index";

export interface InvitationDto {
  id: number;
  organizationId: number;
  organizationName: string;
  teamId?: number | null;
  email: string;
  role: OrganizationRole;
  roleDefinition?: RoleSummaryDto | null;
  status: InvitationStatus;
  token: string;
  expiresAt: string;
  createdAt: string;
}
