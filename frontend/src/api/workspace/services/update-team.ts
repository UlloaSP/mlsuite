/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { appFetch } from "@/api/core/services/app-fetch";
import { json } from "@/api/core/services/json";
import type { TeamDto, UpdateTeamRequest } from "@/api/workspace/dtos";

export const updateTeam = (teamId: number, payload: UpdateTeamRequest): Promise<TeamDto> =>
  appFetch<TeamDto>(`/api/teams/${teamId}`, json("PATCH", payload));
