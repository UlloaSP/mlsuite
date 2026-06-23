/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { appFetch } from "../../core/services/app-fetch";
import { json } from "../../core/services/json";
import type { TeamMembershipRowDto } from "../dtos";

export const updateTeamMemberRole = (
  teamId: number,
  membershipId: number,
  roleDefinitionId: number,
): Promise<TeamMembershipRowDto> =>
  appFetch<TeamMembershipRowDto>(
    `/api/teams/${teamId}/members/${membershipId}`,
    json("PATCH", { roleDefinitionId }),
  );
