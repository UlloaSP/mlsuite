/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { appFetch } from "../../core/services/app-fetch";
import { json } from "../../core/services/json";
import type { TeamDto, CreateTeamRequest } from "../dtos";

export const createTeam = (organizationId: number, payload: CreateTeamRequest): Promise<TeamDto> =>
  appFetch<TeamDto>(`/api/organizations/${organizationId}/teams`, json("POST", payload));
