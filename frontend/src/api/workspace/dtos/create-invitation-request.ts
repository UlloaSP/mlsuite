/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import type { OrganizationRole } from "./index";

export interface CreateInvitationRequest {
  email: string;
  role?: OrganizationRole;
  roleDefinitionId?: number;
  teamId?: number;
}
