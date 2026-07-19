/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { appFetch } from "@/api/core/services/app-fetch";
import { json } from "@/api/core/services/json";
import type { TeamMembershipRowDto } from "@/api/workspace/dtos";

export const updateTeamMemberRole = (
  teamId: number,
  membershipId: number,
  roleDefinitionId: number,
): Promise<TeamMembershipRowDto> =>
  appFetch<TeamMembershipRowDto>(
    `/api/teams/${teamId}/members/${membershipId}`,
    json("PATCH", { roleDefinitionId }),
  );
