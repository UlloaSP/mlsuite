/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { appFetch } from "../../core/services/app-fetch";
import { json } from "../../core/services/json";
import type { TeamDto, UpdateTeamRequest } from "../dtos";

export const updateTeam = (teamId: number, payload: UpdateTeamRequest): Promise<TeamDto> =>
  appFetch<TeamDto>(`/api/teams/${teamId}`, json("PATCH", payload));
