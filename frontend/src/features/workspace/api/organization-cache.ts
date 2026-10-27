/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import type { QueryClient } from "@tanstack/react-query";
import { organizationQueryKey } from "@/shared/api/organization-query-key";

export const removeOrganizationCache = async (
  queryClient: QueryClient,
  organizationId: number,
): Promise<void> => {
  const scope = organizationQueryKey(organizationId);
  await queryClient.cancelQueries({ queryKey: scope });
  queryClient.removeQueries({ queryKey: scope });
};
