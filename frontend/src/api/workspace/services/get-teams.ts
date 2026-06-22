/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { appFetch } from "../../core/services/app-fetch";
import type { TeamDto } from "../dtos";

export const getTeams = (organizationId: number): Promise<TeamDto[]> =>
  appFetch<TeamDto[]>(`/api/organizations/${organizationId}/teams`);
