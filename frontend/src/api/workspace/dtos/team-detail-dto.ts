/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import type { TeamPermissionsDto, TeamRole, TeamDto } from "./index";

export interface TeamDetailDto extends TeamDto {
  currentUserRole?: TeamRole | null;
  permissions: TeamPermissionsDto;
}
