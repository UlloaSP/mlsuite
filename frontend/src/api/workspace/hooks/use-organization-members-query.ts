/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { useQuery } from "@tanstack/react-query";
import { getOrganizationMembers } from "@/api/workspace/services";
import { organizationMembersQueryKey } from "./query-keys";

export const useOrganizationMembersQuery = (
  organizationId: number,
  enabled = true,
) =>
  useQuery({
    queryKey: organizationMembersQueryKey(organizationId),
    queryFn: () => getOrganizationMembers(organizationId),
    enabled,
  });
