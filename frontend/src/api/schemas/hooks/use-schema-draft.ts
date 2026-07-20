/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { useCurrentOrganizationId } from "@/api/workspace/hooks/use-current-organization-id";
import { useQuery } from "@tanstack/react-query";
import { schemaDraftQueryOptions } from "@/api/schemas/schema-queries";

export const useSchemaDraft = (draftId?: string) => {
  const organizationId = useCurrentOrganizationId() ?? "none";
  return useQuery(schemaDraftQueryOptions(organizationId, draftId));
};
