/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { appFetch } from "../../core/services/app-fetch";
import type { TeamMembershipRowDto } from "../dtos";

export const getTeamMembers = (teamId: number): Promise<TeamMembershipRowDto[]> =>
  appFetch<TeamMembershipRowDto[]>(`/api/teams/${teamId}/members`);
