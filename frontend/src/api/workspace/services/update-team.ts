/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { appFetch } from "@/shared/api/http";
import { json } from "@/shared/api/http";
import type { TeamDto, UpdateTeamRequest } from "@/api/workspace/dtos";

export const updateTeam = (teamId: number, payload: UpdateTeamRequest): Promise<TeamDto> =>
  appFetch<TeamDto>(`/api/teams/${teamId}`, json("PATCH", payload));
