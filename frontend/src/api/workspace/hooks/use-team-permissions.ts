/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { useQuery } from "@tanstack/react-query";
import { organizationTeamQueryOptions } from "@/api/workspace/workspace-queries";

export const useTeamPermissions = (organizationId: number, teamId: number) =>
  useQuery(organizationTeamQueryOptions(organizationId, teamId));
