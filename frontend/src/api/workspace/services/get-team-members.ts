/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { appFetch } from "@/api/core/services/app-fetch";
import type { TeamMembershipRowDto } from "@/api/workspace/dtos";

export const getTeamMembers = (
  teamId: number,
  signal?: AbortSignal,
): Promise<TeamMembershipRowDto[]> =>
  appFetch<TeamMembershipRowDto[]>(`/api/teams/${teamId}/members`, { signal });
