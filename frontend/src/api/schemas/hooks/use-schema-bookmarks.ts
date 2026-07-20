/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { useCurrentOrganizationId } from "@/api/workspace/hooks/use-current-organization-id";
import { useQuery } from "@tanstack/react-query";
import { schemaBookmarksQueryOptions } from "@/api/schemas/schema-queries";

export const useSchemaBookmarks = (schemaId?: string) => {
  const organizationId = useCurrentOrganizationId() ?? "none";
  return useQuery({
    ...schemaBookmarksQueryOptions(organizationId, schemaId),
    placeholderData: [],
  });
};
