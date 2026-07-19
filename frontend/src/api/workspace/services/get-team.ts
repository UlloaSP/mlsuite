/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { appFetch } from "@/api/core/services/app-fetch";
import type { TeamDetailDto } from "@/api/workspace/dtos";

export const getTeam = (teamId: number): Promise<TeamDetailDto> =>
  appFetch<TeamDetailDto>(`/api/teams/${teamId}`);
