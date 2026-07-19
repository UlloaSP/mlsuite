/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { appFetch } from "@/api/core/services/app-fetch";
import { json } from "@/api/core/services/json";
import type { TeamDto, CreateTeamRequest } from "@/api/workspace/dtos";

export const createTeam = (organizationId: number, payload: CreateTeamRequest): Promise<TeamDto> =>
  appFetch<TeamDto>(`/api/organizations/${organizationId}/teams`, json("POST", payload));
