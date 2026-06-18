/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { useQuery } from "@tanstack/react-query";
import { getTeam } from "../services";
import type { TeamPermissionsDto } from "../dtos";

export function useTeamPermissions(teamId: number): TeamPermissionsDto | null {
  return (
    useQuery({
      queryKey: ["team", teamId],
      queryFn: () => getTeam(teamId),
      enabled: Boolean(teamId),
    }).data?.permissions ?? null
  );
}
