/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { useQuery } from "@tanstack/react-query";
import { getTeam } from "@/api/workspace/services";
import { organizationTeamQueryKey } from "./query-keys";

export const useTeamPermissions = (organizationId: number, teamId: number) =>
  useQuery({
    queryKey: organizationTeamQueryKey(organizationId, teamId),
    queryFn: () => getTeam(teamId),
    enabled: Boolean(organizationId && teamId),
  });
