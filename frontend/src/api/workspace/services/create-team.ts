/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { appFetch } from "@/shared/api/http";
import { json } from "@/shared/api/http";
import type { TeamDto, CreateTeamRequest } from "@/api/workspace/dtos";

export const createTeam = (organizationId: number, payload: CreateTeamRequest): Promise<TeamDto> =>
  appFetch<TeamDto>(`/api/organizations/${organizationId}/teams`, json("POST", payload));
