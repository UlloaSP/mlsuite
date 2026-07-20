/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { appFetch, json } from "@/shared/api/http";
import type { TeamDto } from "@/capabilities/workspace-context/workspace-context.types";
import type {
  CreateTeamRequest,
  TeamDetailDto,
  TeamMembershipRowDto,
  UpdateTeamRequest,
} from "./workspace.types";

export const createTeam = (organizationId: number, payload: CreateTeamRequest): Promise<TeamDto> =>
  appFetch<TeamDto>(`/api/organizations/${organizationId}/teams`, json("POST", payload));

export const getTeamMembers = (
  teamId: number,
  signal?: AbortSignal,
): Promise<TeamMembershipRowDto[]> =>
  appFetch<TeamMembershipRowDto[]>(`/api/teams/${teamId}/members`, { signal });

export const getTeam = (teamId: number, signal?: AbortSignal): Promise<TeamDetailDto> =>
  appFetch<TeamDetailDto>(`/api/teams/${teamId}`, { signal });

export const getTeams = (organizationId: number, signal?: AbortSignal): Promise<TeamDto[]> =>
  appFetch<TeamDto[]>(`/api/organizations/${organizationId}/teams`, { signal });

export const removeTeamMember = (teamId: number, membershipId: number): Promise<void> =>
  appFetch<void>(`/api/teams/${teamId}/members/${membershipId}`, { method: "DELETE" });

export const updateTeamMemberRole = (
  teamId: number,
  membershipId: number,
  roleDefinitionId: number,
): Promise<TeamMembershipRowDto> =>
  appFetch<TeamMembershipRowDto>(
    `/api/teams/${teamId}/members/${membershipId}`,
    json("PATCH", { roleDefinitionId }),
  );

export const updateTeam = (teamId: number, payload: UpdateTeamRequest): Promise<TeamDto> =>
  appFetch<TeamDto>(`/api/teams/${teamId}`, json("PATCH", payload));
