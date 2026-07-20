/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { appFetch } from "@/shared/api/http";
import type { TeamDto } from "@/api/workspace/dtos";

export const getTeams = (organizationId: number, signal?: AbortSignal): Promise<TeamDto[]> =>
  appFetch<TeamDto[]>(`/api/organizations/${organizationId}/teams`, { signal });
