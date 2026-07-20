/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { appFetch } from "@/shared/api/http";
import type { TeamDetailDto } from "@/api/workspace/dtos";

export const getTeam = (teamId: number, signal?: AbortSignal): Promise<TeamDetailDto> =>
  appFetch<TeamDetailDto>(`/api/teams/${teamId}`, { signal });
