/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import type { RoleSummaryDto } from "./index";

export interface MembershipRowActionsDto {
  canChangeRole: boolean;
  canRemove: boolean;
  assignableRoles: RoleSummaryDto[];
}
