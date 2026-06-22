/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { appFetch } from "../../core/services/app-fetch";
import type { TeamDetailDto } from "../dtos";

export const getTeam = (teamId: number): Promise<TeamDetailDto> =>
  appFetch<TeamDetailDto>(`/api/teams/${teamId}`);
