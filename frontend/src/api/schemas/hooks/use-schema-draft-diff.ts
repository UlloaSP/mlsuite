/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { useCurrentOrganizationId } from "@/api/workspace/hooks/use-current-organization-id";
import { useQuery } from "@tanstack/react-query";
import { schemaDraftDiffQueryOptions } from "@/api/schemas/schema-queries";

export const useSchemaDraftDiff = (draftId?: string) => {
  const organizationId = useCurrentOrganizationId() ?? "none";
  return useQuery(schemaDraftDiffQueryOptions(organizationId, draftId));
};
